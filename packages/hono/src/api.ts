import { Context, Hono } from 'hono';
import { Resource, DbAdapter } from '@cape/core';

export interface CreateAdminApiOptions {
  db: DbAdapter;
  resources: Resource[];
  upload?: {
    handler?: (file: File) => Promise<string>;
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
}

const defaultUploadHandler = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:${file.type};base64,${base64}`;
};

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
        actions: actions.map((a: import('@cape/core').ActionMetadata) => ({ name: a.name, label: a.label })),
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
        const pageSize = Math.max(1, parseInt(query.pageSize || '10', 10));
        const sortField = query.sortField || undefined;
        const sortOrder = query.sortOrder === 'asc' || query.sortOrder === 'desc' ? query.sortOrder : undefined;
        const search = query.search || undefined;

        // Extract filters (any query parameters other than pagination and sorting)
        const filters: Record<string, any> = {};
        for (const [key, value] of Object.entries(query)) {
          if (!['page', 'pageSize', 'sortField', 'sortOrder', 'search'].includes(key)) {
            filters[key] = value;
          }
        }

        const parentId = c.req.param('parentId');
        if (parentId && resource.metadata.foreignKey) {
          filters[resource.metadata.foreignKey] = parentId;
        }

        const listParams: import('@cape/core').ListParams = {
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
            await hooks.beforeCreate(dataToCreate);
          }
          const record = await db.create(resource.metadata, dataToCreate);
          if (hooks.afterCreate) {
            await hooks.afterCreate(record);
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
          return c.json({ error: err.message || 'Internal Server Error' }, 500);
        }
      });
    }

    // Update
    for (const routePath of paths) {
      api.put(`${routePath}/:id`, async (c) => {
        const id = c.req.param('id');
        const record = await db.read(resource.metadata, id);
        if (!record) {
          return c.json({ error: 'Not Found' }, 404);
        }

        if (authorization.canUpdate) {
          const allowed = await authorization.canUpdate(c, record);
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
            await hooks.beforeUpdate(id, dataToUpdate);
          }
          const updatedRecord = await db.update(resource.metadata, id, dataToUpdate);
          if (hooks.afterUpdate) {
            await hooks.afterUpdate(updatedRecord);
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
          return c.json({ error: err.message || 'Internal Server Error' }, 500);
        }
      });
    }

    // Delete
    for (const routePath of paths) {
      api.delete(`${routePath}/:id`, async (c) => {
        const id = c.req.param('id');
        const record = await db.read(resource.metadata, id);
        if (!record) {
          return c.json({ error: 'Not Found' }, 404);
        }

        if (authorization.canDelete) {
          const allowed = await authorization.canDelete(c, record);
          if (!allowed) {
            return c.json({ error: 'Forbidden' }, 403);
          }
        }

        try {
          if (hooks.beforeDelete) {
            await hooks.beforeDelete(id);
          }
          await db.delete(resource.metadata, id);
          if (hooks.afterDelete) {
            await hooks.afterDelete(id);
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

        // Authorization check for each record
        for (const id of ids) {
          const record = await db.read(resource.metadata, id);
          if (record && authorization.canDelete) {
            const allowed = await authorization.canDelete(c, record);
            if (!allowed) {
              return c.json({ error: `Forbidden to delete record with ID ${id}` }, 403);
            }
          }
        }

        try {
          for (const id of ids) {
            if (hooks.beforeDelete) {
              await hooks.beforeDelete(id);
            }
          }
          await db.bulkDelete(resource.metadata, ids);
          for (const id of ids) {
            if (hooks.afterDelete) {
              await hooks.afterDelete(id);
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
  }

  return api;
}
