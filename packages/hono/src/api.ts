import { Context, Hono } from 'hono';
import { Resource, DbAdapter } from '@fuyuan9/cape-core';
import { recordsToCsv, csvToRecords, buildCsvFilename } from './csv.js';

export interface CreateAdminApiOptions {
  db: DbAdapter;
  resources: Resource[];
  upload?: {
    handler?: (file: File) => Promise<string>;
    maxSize?: number;
    allowedTypes?: string[];
  };
  notifications?: {
    vapidPublicKey?: string;
    onSubscribe?: (subscription: any, context: any) => Promise<void> | void;
    onUnsubscribe?: (subscription: any, context: any) => Promise<void> | void;
  };
  globalSearch?: {
    handler?: (query: string, context: any) => Promise<any[] | null | undefined> | any[] | null | undefined;
    resources?: string[];
  };
  auth?: {
    guard?: (c: any) => Promise<boolean | Response> | boolean | Response;
  };
  security?: {
    sameOrigin?: boolean | { trustedOrigins?: string[]; trustForwardedHeaders?: boolean };
  };
  importExport?: {
    /** Maximum upload file size in MB for import. Default: 10 */
    maxFileSizeMB?: number;
    /** Maximum number of rows allowed per import. Default: 10000 */
    maxRows?: number;
  };
}

const defaultUploadHandler = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return `data:${file.type};base64,${base64}`;
};

function handleDbError(err: any, resource: any, c: any) {
  if (err.code === 'P2002') {
    const targets = err.meta?.target || [];
    const targetField = targets[0] || 'field';
    return c.json(
      {
        error: 'Validation Failed',
        errors: {
          [targetField]: {
            _errors: [`${targetField} is already taken.`],
          },
        },
      },
      400
    );
  }

  if (err.code === '23505') {
    const detail = err.detail || '';
    const match = detail.match(/\((.*?)\)=\((.*?)\)/);
    const targetField = match ? match[1] : 'field';
    return c.json(
      {
        error: 'Validation Failed',
        errors: {
          [targetField]: {
            _errors: [`${targetField} is already taken.`],
          },
        },
      },
      400
    );
  }

  if (err.message?.includes('UNIQUE constraint failed')) {
    const parts = err.message.split(': ');
    const target = parts[parts.length - 1] || 'field';
    const targetField = target.split('.').pop() || 'field';
    return c.json(
      {
        error: 'Validation Failed',
        errors: {
          [targetField]: {
            _errors: [`${targetField} is already taken.`],
          },
        },
      },
      400
    );
  }

  if (err.code === 'ER_DUP_ENTRY' || err.errno === 1062) {
    return c.json(
      {
        error: 'Validation Failed',
        errors: {
          database: {
            _errors: ['A record with this unique value already exists.'],
          },
        },
      },
      400
    );
  }

  return null;
}

function getSameOriginOptions(options: CreateAdminApiOptions['security']) {
  const sameOrigin = options?.sameOrigin;
  if (sameOrigin === false) {
    return null;
  }
  if (sameOrigin === true || sameOrigin === undefined) {
    return { trustedOrigins: [] as string[], trustForwardedHeaders: true };
  }
  return {
    trustedOrigins: sameOrigin.trustedOrigins || [],
    trustForwardedHeaders: sameOrigin.trustForwardedHeaders !== false,
  };
}

function normalizeOrigin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getRequestOrigin(c: Context, trustForwardedHeaders: boolean): string | null {
  const url = new URL(c.req.url);
  const forwardedProto = trustForwardedHeaders ? c.req.header('x-forwarded-proto') : undefined;
  const forwardedHost = trustForwardedHeaders ? c.req.header('x-forwarded-host') : undefined;
  const host = forwardedHost || c.req.header('host') || url.host;
  const protocol = forwardedProto || url.protocol.replace(/:$/, '');
  return normalizeOrigin(`${protocol}://${host}`);
}

function isSafeMethod(method: string): boolean {
  return ['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase());
}

function isSameOriginMutationAllowed(
  c: Context,
  config: NonNullable<ReturnType<typeof getSameOriginOptions>>
): boolean {
  if (isSafeMethod(c.req.method)) {
    return true;
  }

  if (c.req.header('sec-fetch-site') === 'cross-site') {
    return false;
  }

  const expectedOrigins = new Set<string>();
  const requestOrigin = getRequestOrigin(c, config.trustForwardedHeaders);
  if (requestOrigin) {
    expectedOrigins.add(requestOrigin);
  }
  for (const origin of config.trustedOrigins) {
    const normalized = normalizeOrigin(origin);
    if (normalized) {
      expectedOrigins.add(normalized);
    }
  }

  if (expectedOrigins.size === 0) {
    return true;
  }

  const originHeader = normalizeOrigin(c.req.header('origin'));
  if (originHeader) {
    return expectedOrigins.has(originHeader);
  }

  const refererOrigin = normalizeOrigin(c.req.header('referer'));
  if (refererOrigin) {
    return expectedOrigins.has(refererOrigin);
  }

  return true;
}

async function canExposeMetadata(c: Context, resource: Resource): Promise<boolean> {
  const { authorization } = resource.metadata;
  const hasExplicitAuthorization =
    !!authorization.canAccess ||
    !!authorization.canList ||
    !!authorization.canCreate ||
    !!authorization.canUpdate ||
    !!authorization.canDelete;

  if (!hasExplicitAuthorization) {
    return true;
  }

  if (authorization.canAccess) {
    return !!(await authorization.canAccess(c));
  }

  if (authorization.canList && (await authorization.canList(c))) {
    return true;
  }

  if (authorization.canCreate && (await authorization.canCreate(c))) {
    return true;
  }

  return false;
}

async function canSearchResource(c: Context, resource: Resource): Promise<boolean> {
  if (!resource.metadata.authorization.canList) {
    return true;
  }
  return !!(await resource.metadata.authorization.canList(c));
}

async function filterSearchResultsByAuthorization(
  c: Context,
  resources: Resource[],
  results: any[] | null | undefined
): Promise<any[]> {
  if (!results || results.length === 0) {
    return [];
  }

  const allowedResourceNames = new Set<string>();
  for (const resource of resources) {
    if (await canSearchResource(c, resource)) {
      allowedResourceNames.add(resource.metadata.name);
    }
  }

  return results.filter(
    (result) => typeof result?.resourceName === 'string' && allowedResourceNames.has(result.resourceName)
  );
}

export function createAdminApi(options: CreateAdminApiOptions) {
  const { db, resources } = options;
  const api = new Hono();

  // Authentication Guard Middleware
  if (options.auth?.guard) {
    api.use('*', async (c, next) => {
      const result = await options.auth!.guard!(c);
      if (result instanceof Response) {
        return result;
      }
      if (result === false) {
        return c.json({ error: 'Unauthorized' }, 401);
      }
      await next();
    });
  }

  const sameOriginOptions = getSameOriginOptions(options.security);
  if (sameOriginOptions) {
    api.use('*', async (c, next) => {
      if (!isSameOriginMutationAllowed(c, sameOriginOptions)) {
        return c.json({ error: 'Cross-site mutation rejected' }, 403);
      }
      await next();
    });
  }

  // File Upload Route
  api.post('/upload', async (c) => {
    try {
      const body = await c.req.parseBody();
      const file = body.file;
      if (!file || !(file instanceof File)) {
        return c.json({ error: 'No file uploaded' }, 400);
      }
      const maxSize = options.upload?.maxSize ?? 10 * 1024 * 1024;
      if (file.size > maxSize) {
        return c.json({ error: `File size exceeds the limit of ${maxSize / (1024 * 1024)}MB` }, 400);
      }
      const allowedTypes = options.upload?.allowedTypes;
      if (allowedTypes && allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
        return c.json({ error: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}` }, 400);
      }
      const handler = options.upload?.handler || defaultUploadHandler;
      const url = await handler(file);
      return c.json({ url });
    } catch (err: any) {
      return c.json({ error: err.message || 'Upload failed' }, 500);
    }
  });

  // Return serialized metadata for the React frontend
  api.get('/metadata', async (c) => {
    const visibleResources: Resource[] = [];
    for (const resource of resources) {
      if (await canExposeMetadata(c, resource)) {
        visibleResources.push(resource);
      }
    }

    const serialized = visibleResources.map((r) => {
      const { name, label, primaryKey, table, form, actions, parent, foreignKey } = r.metadata;
      return {
        name,
        label,
        primaryKey,
        table: {
          columns: table.columns,
        },
        form: {
          fields: form.fields.filter((field) => field.type !== 'hidden'),
        },
        actions: actions.map((a: import('@fuyuan9/cape-core').ActionMetadata) => ({ name: a.name, label: a.label })),
        parent,
        foreignKey,
      };
    });
    return c.json({ resources: serialized });
  });

  // Return VAPID Public Key if configured
  api.get('/notifications/vapid-key', (c) => {
    const key = options.notifications?.vapidPublicKey || null;
    return c.json({ publicKey: key });
  });

  // Subscribe to push notifications
  api.post('/notifications/subscribe', async (c) => {
    try {
      const subscription = await c.req.json();
      const handler = options.notifications?.onSubscribe;
      if (handler) {
        await handler(subscription, c);
      }
      return c.json({ success: true });
    } catch (err: any) {
      return c.json({ error: err.message || 'Subscription failed' }, 500);
    }
  });

  // Unsubscribe from push notifications
  api.post('/notifications/unsubscribe', async (c) => {
    try {
      const subscription = await c.req.json();
      const handler = options.notifications?.onUnsubscribe;
      if (handler) {
        await handler(subscription, c);
      }
      return c.json({ success: true });
    } catch (err: any) {
      return c.json({ error: err.message || 'Unsubscription failed' }, 500);
    }
  });

  // Global Search Route
  api.get('/global-search', async (c) => {
    const query = c.req.query('q') || '';
    if (!query) {
      return c.json({ results: [] });
    }

    // 1. If custom global search handler is defined
    const customHandler = options.globalSearch?.handler;
    if (customHandler) {
      try {
        const results = await customHandler(query, c);
        if (results !== null && results !== undefined) {
          const filteredResults = await filterSearchResultsByAuthorization(c, resources, results);
          return c.json({ results: filteredResults });
        }
      } catch (err: any) {
        return c.json({ error: err.message || 'Custom search failed' }, 500);
      }
    }

    // 2. Default search fallback (multi-resource searchable field search)
    const configuredResources = options.globalSearch?.resources
      ? resources.filter((r) => options.globalSearch?.resources?.includes(r.metadata.name))
      : resources;

    const targetResources: Resource[] = [];
    for (const resource of configuredResources) {
      if (await canSearchResource(c, resource)) {
        targetResources.push(resource);
      }
    }

    try {
      const searchPromises = targetResources.map(async (res) => {
        const searchableColumns = res.metadata.table.columns.filter((col) => col.isSearchable);
        if (searchableColumns.length === 0) return [];

        // Search first 5 items
        const listParams = {
          page: 1,
          pageSize: 5,
          search: query,
        };

        const result = await db.list(res.metadata, listParams);

        // Find best field for title
        const titleCandidates = ['name', 'title', 'label', 'username', 'email', 'orderNumber', 'sku'];
        const titleCol =
          res.metadata.table.columns.find((col) => titleCandidates.includes(col.name)) || res.metadata.table.columns[0];

        // Find best field for subtitle
        const subtitleCandidates = ['email', 'description', 'price', 'customerEmail', 'sku'];
        const subtitleCol = res.metadata.table.columns.find(
          (col) => col.name !== titleCol?.name && subtitleCandidates.includes(col.name)
        );

        return result.data.map((item: any) => ({
          resourceName: res.metadata.name,
          id: item[res.metadata.primaryKey],
          title: String(item[titleCol?.name || res.metadata.primaryKey] || `Record #${item[res.metadata.primaryKey]}`),
          subtitle: subtitleCol ? String(item[subtitleCol.name] || '') : undefined,
        }));
      });

      const allResults = await Promise.all(searchPromises);
      const flattened = allResults.flat();

      return c.json({ results: flattened });
    } catch (err: any) {
      return c.json({ error: err.message || 'Global search failed' }, 500);
    }
  });

  for (const resource of resources) {
    const { name, hooks, authorization, writeValidationSchema } = resource.metadata;
    const path = `/${name}`;
    const paths = [path];
    if (resource.metadata.parent && resource.metadata.foreignKey) {
      paths.push(`/${resource.metadata.parent}/:parentId/${name}`);
    }

    // List
    for (const routePath of paths) {
      api.get(routePath, async (c) => {
        if (authorization.canList) {
          const allowed = await authorization.canList(c);
          if (!allowed) {
            return c.json({ error: 'Forbidden' }, 403);
          }
        }

        const query = c.req.query();
        const page = Math.max(1, parseInt(query.page || '1', 10));
        const pageSize = Math.min(100, Math.max(1, parseInt(query.pageSize || '10', 10)));

        const sortableColumns = resource.metadata.table.columns.filter((col) => col.isSortable).map((col) => col.name);
        const sortField = query.sortField && sortableColumns.includes(query.sortField) ? query.sortField : undefined;
        const sortOrder = query.sortOrder === 'asc' || query.sortOrder === 'desc' ? query.sortOrder : undefined;
        const search = query.search || undefined;

        const filterableColumns = resource.metadata.table.columns
          .filter((col) => col.isFilterable)
          .map((col) => col.name);
        if (resource.metadata.foreignKey) {
          filterableColumns.push(resource.metadata.foreignKey);
        }

        const filters: Record<string, any> = {};
        for (const [key, value] of Object.entries(query)) {
          if (filterableColumns.includes(key)) {
            filters[key] = value;
          }
        }

        const parentId = c.req.param('parentId');
        if (parentId && resource.metadata.foreignKey) {
          filters[resource.metadata.foreignKey] = parentId;
        }

        const listParams: import('@fuyuan9/cape-core').ListParams = {
          page,
          pageSize,
          filters,
        };
        if (sortField !== undefined) listParams.sortField = sortField;
        if (sortOrder !== undefined) listParams.sortOrder = sortOrder;
        if (search !== undefined) listParams.search = search;

        try {
          const result = await db.list(resource.metadata, listParams);
          return c.json(result);
        } catch (err: any) {
          return c.json({ error: err.message || 'Internal Server Error' }, 500);
        }
      });
    }

    // Relation Search
    api.get(`${path}/relation-search`, async (c) => {
      if (authorization.canList) {
        const allowed = await authorization.canList(c);
        if (!allowed) {
          return c.json({ error: 'Forbidden' }, 403);
        }
      }

      const q = c.req.query('q') || '';
      const labelField = c.req.query('labelField') || 'name';
      const pageSizeQuery = parseInt(c.req.query('pageSize') || '20', 10);
      const pageSize = Math.min(50, Math.max(1, isNaN(pageSizeQuery) ? 20 : pageSizeQuery));

      try {
        const result = await db.list(resource.metadata, {
          page: 1,
          pageSize,
          search: q || undefined,
        });

        const results = result.data.map((item) => ({
          id: item[resource.metadata.primaryKey],
          label: String(item[labelField] ?? item[resource.metadata.primaryKey] ?? ''),
        }));

        return c.json({ results });
      } catch (err: any) {
        return c.json({ error: err.message || 'Relation search failed' }, 500);
      }
    });

    // Export CSV
    api.get(`${path}/export`, async (c) => {
      if (authorization.canList) {
        const allowed = await authorization.canList(c);
        if (!allowed) {
          return c.json({ error: 'Forbidden' }, 403);
        }
      }

      const query = c.req.query();
      const search = query.search || undefined;

      const filterableColumns = resource.metadata.table.columns
        .filter((col) => col.isFilterable)
        .map((col) => col.name);
      const filters: Record<string, any> = {};
      for (const [key, value] of Object.entries(query)) {
        if (filterableColumns.includes(key)) {
          filters[key] = value;
        }
      }

      try {
        // Fetch all records (no pagination) for export
        const result = await db.list(resource.metadata, {
          page: 1,
          pageSize: 100000,
          search,
          filters,
        });

        const columnNames = resource.metadata.table.columns.map((col) => col.name);
        const csvText = recordsToCsv(columnNames, result.data);
        const filename = buildCsvFilename(name);

        return new Response(csvText, {
          headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${filename}"`,
          },
        });
      } catch (err: any) {
        return c.json({ error: err.message || 'Export failed' }, 500);
      }
    });

    // Import CSV
    api.post(`${path}/import`, async (c) => {
      if (authorization.canCreate) {
        const allowed = await authorization.canCreate(c);
        if (!allowed) {
          return c.json({ error: 'Forbidden' }, 403);
        }
      }

      const maxFileSizeBytes = (options.importExport?.maxFileSizeMB ?? 10) * 1024 * 1024;
      const maxRows = options.importExport?.maxRows ?? 10000;

      try {
        const body = await c.req.parseBody();
        const file = body.file;

        if (!file || !(file instanceof File)) {
          return c.json({ error: 'No file uploaded' }, 400);
        }

        // Validate MIME type and extension
        const allowedMimes = ['text/csv', 'application/csv', 'application/vnd.ms-excel'];
        const filename = file.name.toLowerCase();
        const hasValidExtension = filename.endsWith('.csv');
        const hasValidMime = allowedMimes.includes(file.type);
        if (!hasValidExtension && !hasValidMime) {
          return c.json({ error: 'File must be a CSV (.csv)' }, 400);
        }

        if (file.size > maxFileSizeBytes) {
          return c.json({ error: `File size exceeds limit of ${options.importExport?.maxFileSizeMB ?? 10}MB` }, 400);
        }

        const csvText = await file.text();

        // Column whitelist: use form fields (writable fields), excluding the primary key and hidden fields
        const allowedColumns = resource.metadata.form.fields
          .filter((f) => f.type !== 'hidden')
          .map((f) => f.name)
          .filter((n) => n !== resource.metadata.primaryKey);

        const { records, errors: parseErrors } = csvToRecords(csvText, allowedColumns);

        if (parseErrors.length > 0 && records.length === 0) {
          return c.json({ success: false, created: 0, skipped: 0, errors: parseErrors }, 400);
        }

        if (records.length > maxRows) {
          return c.json({ error: `Import exceeds maximum row limit of ${maxRows}` }, 400);
        }

        let created = 0;
        const rowErrors: { row: number; field?: string; message: string }[] = [...parseErrors];

        for (let i = 0; i < records.length; i++) {
          const rowNumber = i + 2; // 1-based, accounting for header row
          const record = records[i];

          // Apply Zod validation schema if defined
          if (resource.metadata.writeValidationSchema) {
            const result = resource.metadata.writeValidationSchema.safeParse(record);
            if (!result.success) {
              const issues = result.error.issues;
              for (const issue of issues) {
                rowErrors.push({
                  row: rowNumber,
                  field: issue.path.join('.'),
                  message: issue.message,
                });
              }
              continue;
            }
          }

          try {
            if (hooks.beforeCreate) {
              await hooks.beforeCreate(record, c);
            }
            const created_record = await db.create(resource.metadata, record);
            if (hooks.afterCreate) {
              await hooks.afterCreate(created_record, c);
            }
            created++;
          } catch (err: any) {
            rowErrors.push({ row: rowNumber, message: err.message || 'Failed to create record' });
          }
        }

        const skipped = records.length - created;
        const success = rowErrors.length === 0;
        return c.json({ success, created, skipped, errors: rowErrors });
      } catch (err: any) {
        return c.json({ error: err.message || 'Import failed' }, 500);
      }
    });

    // Read details
    for (const routePath of paths) {
      api.get(`${routePath}/:id`, async (c) => {
        if (authorization.canList) {
          const allowed = await authorization.canList(c);
          if (!allowed) {
            return c.json({ error: 'Forbidden' }, 403);
          }
        }

        const id = c.req.param('id');
        try {
          const record = await db.read(resource.metadata, id);

          if (authorization.canRead) {
            const allowed = await authorization.canRead(c, record);
            if (!allowed) {
              return c.json({ error: 'Forbidden' }, 403);
            }
          }

          if (!record) {
            return c.json({ error: 'Not Found' }, 404);
          }
          return c.json({ data: record });
        } catch (err: any) {
          return c.json({ error: err.message || 'Internal Server Error' }, 500);
        }
      });
    }

    // Create
    for (const routePath of paths) {
      api.post(routePath, async (c) => {
        if (authorization.canCreate) {
          const allowed = await authorization.canCreate(c);
          if (!allowed) {
            return c.json({ error: 'Forbidden' }, 403);
          }
        }

        let body: any;
        try {
          body = await c.req.json();
        } catch {
          return c.json({ error: 'Invalid JSON body' }, 400);
        }

        const parentId = c.req.param('parentId');
        if (parentId && resource.metadata.foreignKey) {
          body[resource.metadata.foreignKey] = parentId;
        }

        const validation = writeValidationSchema.safeParse(body);
        if (!validation.success) {
          return c.json(
            {
              error: 'Validation Failed',
              errors: validation.error.format(),
            },
            400
          );
        }

        const dataToCreate = { ...validation.data };
        if (parentId && resource.metadata.foreignKey) {
          dataToCreate[resource.metadata.foreignKey] = parentId;
        }

        // Unique validation checks
        for (const field of resource.metadata.form.fields) {
          if (field.isUnique) {
            const val = dataToCreate[field.name];
            if (val !== undefined && val !== null) {
              const check = await db.list(resource.metadata, {
                page: 1,
                pageSize: 1,
                filters: { [field.name]: val },
              });
              if (check.data.length > 0) {
                return c.json(
                  {
                    error: 'Validation Failed',
                    errors: {
                      [field.name]: {
                        _errors: [
                          `${field.label || field.name.charAt(0).toUpperCase() + field.name.slice(1)} is already taken.`,
                        ],
                      },
                    },
                  },
                  400
                );
              }
            }
          }
        }

        try {
          if (hooks.beforeCreate) {
            await hooks.beforeCreate(dataToCreate, c);
          }
          const record = await db.create(resource.metadata, dataToCreate);
          if (hooks.afterCreate) {
            await hooks.afterCreate(record, c);
          }
          return c.json(
            {
              data: record,
              meta: {
                toast: {
                  message: `${resource.metadata.label || resource.metadata.name} created successfully.`,
                  type: 'success',
                },
              },
            },
            201
          );
        } catch (err: any) {
          const dbErrorResponse = handleDbError(err, resource.metadata, c);
          if (dbErrorResponse) return dbErrorResponse;
          return c.json({ error: err.message || 'Internal Server Error' }, 500);
        }
      });
    }

    // Update (PUT & PATCH)
    for (const routePath of paths) {
      const handleUpdate = async (c: any, isPatch: boolean) => {
        const id = c.req.param('id');
        const record = await db.read(resource.metadata, id);

        if (authorization.canUpdate) {
          const allowed = await authorization.canUpdate(c, record);
          if (!allowed) {
            return c.json({ error: 'Forbidden' }, 403);
          }
        }

        if (!record) {
          return c.json({ error: 'Not Found' }, 404);
        }

        let body: any;
        try {
          body = await c.req.json();
        } catch {
          return c.json({ error: 'Invalid JSON body' }, 400);
        }

        const schema = isPatch ? writeValidationSchema.partial() : writeValidationSchema;
        const validation = schema.safeParse(body);
        if (!validation.success) {
          return c.json(
            {
              error: 'Validation Failed',
              errors: validation.error.format(),
            },
            400
          );
        }

        const dataToUpdate = { ...validation.data };

        // Unique validation checks
        for (const field of resource.metadata.form.fields) {
          if (field.isUnique) {
            const val = dataToUpdate[field.name];
            if (val !== undefined && val !== null) {
              const check = await db.list(resource.metadata, {
                page: 1,
                pageSize: 1,
                filters: { [field.name]: val },
              });
              const exists = check.data.some((item) => String(item[resource.metadata.primaryKey]) !== String(id));
              if (exists) {
                return c.json(
                  {
                    error: 'Validation Failed',
                    errors: {
                      [field.name]: {
                        _errors: [
                          `${field.label || field.name.charAt(0).toUpperCase() + field.name.slice(1)} is already taken.`,
                        ],
                      },
                    },
                  },
                  400
                );
              }
            }
          }
        }

        try {
          if (hooks.beforeUpdate) {
            await hooks.beforeUpdate(id, dataToUpdate, c);
          }
          const updatedRecord = await db.update(resource.metadata, id, dataToUpdate);
          if (hooks.afterUpdate) {
            await hooks.afterUpdate(updatedRecord, c);
          }
          return c.json({
            data: updatedRecord,
            meta: {
              toast: {
                message: `${resource.metadata.label || resource.metadata.name} updated successfully.`,
                type: 'success',
              },
            },
          });
        } catch (err: any) {
          const dbErrorResponse = handleDbError(err, resource.metadata, c);
          if (dbErrorResponse) return dbErrorResponse;
          return c.json({ error: err.message || 'Internal Server Error' }, 500);
        }
      };

      api.put(`${routePath}/:id`, (c) => handleUpdate(c, false));
      api.patch(`${routePath}/:id`, (c) => handleUpdate(c, true));
    }

    // Delete
    for (const routePath of paths) {
      api.delete(`${routePath}/:id`, async (c) => {
        const id = c.req.param('id');
        const record = await db.read(resource.metadata, id);

        if (authorization.canDelete) {
          const allowed = await authorization.canDelete(c, record);
          if (!allowed) {
            return c.json({ error: 'Forbidden' }, 403);
          }
        }

        if (!record) {
          return c.json({ error: 'Not Found' }, 404);
        }

        try {
          if (hooks.beforeDelete) {
            await hooks.beforeDelete(id, c);
          }
          await db.delete(resource.metadata, id);
          if (hooks.afterDelete) {
            await hooks.afterDelete(id, c);
          }
          return c.json({
            success: true,
            meta: {
              toast: {
                message: `Record deleted successfully.`,
                type: 'success',
              },
            },
          });
        } catch (err: any) {
          return c.json({ error: err.message || 'Internal Server Error' }, 500);
        }
      });
    }

    // Bulk Delete
    for (const routePath of paths) {
      api.post(`${routePath}/bulk-delete`, async (c) => {
        let body: any;
        try {
          body = await c.req.json();
        } catch {
          return c.json({ error: 'Invalid JSON body' }, 400);
        }

        const { ids } = body;
        if (!Array.isArray(ids)) {
          return c.json({ error: 'ids must be an array' }, 400);
        }

        // Bulk read to avoid N+1
        const records = db.readMany
          ? await db.readMany(resource.metadata, ids)
          : await Promise.all(ids.map((id) => db.read(resource.metadata, id)));

        // Authorization check for each record
        if (authorization.canDelete) {
          for (const record of records) {
            if (record) {
              const allowed = await authorization.canDelete(c, record);
              if (!allowed) {
                const pkValue = record[resource.metadata.primaryKey];
                return c.json({ error: `Forbidden to delete record with ID ${pkValue}` }, 403);
              }
            }
          }
        }

        try {
          for (const id of ids) {
            if (hooks.beforeDelete) {
              await hooks.beforeDelete(id, c);
            }
          }
          await db.bulkDelete(resource.metadata, ids);
          for (const id of ids) {
            if (hooks.afterDelete) {
              await hooks.afterDelete(id, c);
            }
          }
          return c.json({
            success: true,
            meta: {
              toast: {
                message: `${ids.length} records deleted successfully.`,
                type: 'success',
              },
            },
          });
        } catch (err: any) {
          return c.json({ error: err.message || 'Internal Server Error' }, 500);
        }
      });
    }

    // Actions
    for (const routePath of paths) {
      api.post(`${routePath}/:id/actions/:actionName`, async (c) => {
        const id = c.req.param('id');
        const actionName = c.req.param('actionName');
        const record = await db.read(resource.metadata, id);

        if (authorization.canUpdate) {
          const allowed = await authorization.canUpdate(c, record);
          if (!allowed) {
            return c.json({ error: 'Forbidden' }, 403);
          }
        }

        if (!record) {
          return c.json({ error: 'Not Found' }, 404);
        }

        const action = resource.metadata.actions.find((a) => a.name === actionName);
        if (!action) {
          return c.json({ error: `Action '${actionName}' not found` }, 404);
        }

        if (!action.handler) {
          return c.json({ error: `Action '${actionName}' has no handler` }, 400);
        }

        try {
          const result = await action.handler(record);
          return c.json({ success: true, result });
        } catch (err: any) {
          return c.json({ error: err.message || 'Action execution failed' }, 500);
        }
      });
    }
  }

  return api;
}
