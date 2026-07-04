import { Hono } from 'hono';
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
}

const defaultUploadHandler = async (file: File): Promise<string> => {
  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString('base64');
  return `data:${file.type};base64,${base64}`;
};

export function createAdminApi(options: CreateAdminApiOptions) {
  const { db, resources } = options;
  const api = new Hono();

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
  api.get('/metadata', (c) => {
    const serialized = resources.map((r) => {
      const { name, label, primaryKey, table, form, actions, parent, foreignKey } = r.metadata;
      return {
        name,
        label,
        primaryKey,
        table: {
          columns: table.columns,
        },
        form: {
          fields: form.fields,
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

  for (const resource of resources) {
    const { name, hooks, authorization, validationSchema } = resource.metadata;
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

        const validation = validationSchema.safeParse(body);
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

        const validation = validationSchema.safeParse(body);
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
