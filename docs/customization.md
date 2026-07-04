# Customization Guide

Cape Framework is designed to allow flexible customization of the UI layer and data integration to suit developer needs.

---

## Three Approaches to Customization

### Approach 1: UI Composition

Cape's screen blocks (`<ResourceList />`, `<ResourceCreate />`, `<ResourceEdit />`, `<ResourceShow />`) are individually exported, so you can embed them in your own dashboard or slide panel (Drawer) without using the default layout (`<ResourcePage />`).

```tsx
import React, { useState } from 'react';
import { useAdminMetadata } from '@cape/react';
import { ResourceList, ResourceEdit } from '@cape/shadcn';

export function CustomDashboard() {
  const { data: metaData } = useAdminMetadata();
  const [editingId, setEditingId] = useState<string | number | null>(null);

  const resource = metaData?.resources.find((r) => r.name === 'users');
  if (!resource) return null;

  return (
    <div className="flex">
      <main className="flex-1 p-8">
        <ResourceList resource={resource} onEdit={(id) => setEditingId(id)} onCreate={() => {}} onShow={() => {}} />
      </main>

      {editingId && (
        <aside className="w-80 border-l bg-white p-4">
          <ResourceEdit
            resource={resource}
            id={editingId}
            onSuccess={() => setEditingId(null)}
            onCancel={() => setEditingId(null)}
          />
        </aside>
      )}
    </div>
  );
}
```

---

### Approach 2: Headless Hooks for Fully Custom UI

If you want to design the UI entirely from scratch, you can directly call Cape's custom hooks that provide data-fetching and state management logic (TanStack Query-based). This lets you freely design any UI — grid cards, charts, and more.

#### Available Hooks (`@cape/react`):

- `useAdminMetadata()`: Fetch definition metadata for all resources
- `useResourceList(resourceName, params)`: Fetch a sorted, filtered, paginated list of records
- `useResourceRecord(resourceName, id)`: Fetch details of a specific record
- `useResourceCreate(resourceName)`: Execute a create operation
- `useResourceUpdate(resourceName, id)`: Execute an update operation
- `useResourceDelete(resourceName)`: Delete a record
- `useResourceBulkDelete(resourceName)`: Bulk-delete multiple selected records

```tsx
import React from 'react';
import { useResourceList } from '@cape/react';

export function UserGrid() {
  const { data, isLoading } = useResourceList('users', { page: 1, pageSize: 10 });

  if (isLoading) return <div>Loading...</div>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {data?.data.map((user) => (
        <div key={user.id} className="p-4 bg-white border rounded shadow-sm">
          <div className="font-bold text-lg">{user.name}</div>
          <div className="text-slate-500 text-sm">{user.email}</div>
          <span className="inline-block mt-2 px-2 py-0.5 text-xs bg-slate-100 rounded">{user.role}</span>
        </div>
      ))}
    </div>
  );
}
```

---

### Approach 3: Adding Custom Actions

By specifying actions in the `actions` array of a resource definition, you can register custom processing as row actions in the table.

```typescript
// admin.ts
export const users = defineResource({
  name: 'users',
  model: usersTable,
  table: {
    columns: [text('name'), badge('role')],
  },
  form: {
    fields: [input('name')],
  },
  actions: [
    {
      name: 'activate',
      label: 'Activate',
      handler: async (record) => {
        // Custom action processing on the backend
        await db.update(usersTable).set({ active: true }).where(eq(usersTable.id, record.id));
      },
    },
  ],
});
```

---

### Approach 4: Custom Upload Storage

By default, file/image uploads (`fileUpload`) are stored as in-memory Base64-encoded data URIs. For production environments using custom storage (AWS S3, Cloudflare R2, etc.), pass an `upload.handler` to `createAdminApi` on the backend.

```typescript
// server.ts
import { createAdminApi } from '@cape/hono';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const s3 = new S3Client({ region: 'ap-northeast-1' });

const app = createAdminApi({
  db: dbAdapter,
  resources: [productsResource],
  upload: {
    handler: async (file: File) => {
      const buffer = Buffer.from(await file.arrayBuffer());
      const key = `uploads/${Date.now()}-${file.name}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: 'my-bucket',
          Key: key,
          Body: buffer,
          ContentType: file.type,
        })
      );

      // Return the public URL of the uploaded file
      return `https://my-bucket.s3.ap-northeast-1.amazonaws.com/${key}`;
    },
  },
});
```
