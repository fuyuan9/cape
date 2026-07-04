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

---

### Approach 5: Customizing Routing with ResourcePage

The default layout container, `<ResourcePage />`, provides automatic hash-based URL routing out of the box. This ensures that the current resource view (list, create, edit, show) and selected IDs are reflected in the URL hash, allowing users to reload the page or share links directly without losing context.

If you are embedding `<ResourcePage />` inside your own application router (such as `react-router-dom` or Next.js) and want to manage the routing yourself to avoid hash collisions, you can disable hash routing by setting the `useHashRouting` property to `false`.

````tsx
import React from 'react';
import { ResourcePage } from '@cape/shadcn';

export function SimpleAdmin() {
  // Enables default hash routing (#/resources/users, etc.)
  return <ResourcePage useHashRouting={true} />;
}

export function IntegratedAdmin() {
  // Disables hash routing; state will be managed purely in-memory.
  // Useful when wrapping inside react-router or other custom routers.
  return <ResourcePage useHashRouting={false} />;
}

---

### Approach 6: Branding (Custom Logos & Theme Colors)

You can easily replace the logo and customize the theme colors of the admin console using the `logo` and `theme` properties on `<ResourcePage />`.

#### Properties:

- **`logo`**: Expects a React node. You can pass a custom brand name, image, or svg.
- **`theme`**: An object detailing custom theme colors:
  - `primary`: The main brand color (for default buttons, active badges, loading indicators).
  - `primaryForeground`: Text color shown on primary background components.
  - `sidebarBg`: Background color of the sidebar navigation.
  - `sidebarText`: Default text color in the sidebar.
  - `sidebarActiveBg`: Background color of the active sidebar item.
  - `sidebarActiveText`: Text color of the active sidebar item.
  - `sidebarBorder`: Border color of the sidebar.

```tsx
import React from 'react';
import { ResourcePage } from '@cape/shadcn';

export function CustomBrandedAdmin() {
  return (
    <ResourcePage
      logo={
        <div className="flex items-center gap-2 font-bold text-indigo-400">
          <span className="text-xl">🌊</span>
          <span>Cape Custom</span>
        </div>
      }
      theme={{
        primary: '#4f46e5',            // Indigo primary color
        primaryForeground: '#ffffff',   // White text on primary buttons
        sidebarBg: '#111827',           // Dark slate sidebar
        sidebarText: '#9ca3af',         // Gray sidebar items
        sidebarActiveBg: '#1e293b',     // Slightly lighter slate active tab
        sidebarActiveText: '#ffffff',   // White text on active tab
      }}
    />
  );
}
````

---

### Approach 7: Toast Notifications & Web Push Integration

Cape supports an integrated toast notification system that can be triggered via two methods: HTTP API response metadata (Simple) or Web Push API (Realtime).

#### 1. API Response-Driven Notifications (HTTP metadata)

The easiest way to show notifications is by returning a `meta.toast` object in your API responses. When mutations (such as Create, Update, or Delete) return this payload, Cape's frontend automatically catches and displays it.

**Hono API Handler Example:**

```typescript
api.post('/users', async (c) => {
  const body = await c.req.json();
  const createdRecord = await db.create(userResource, body);

  return c.json({
    data: createdRecord,
    meta: {
      toast: {
        message: 'User successfully created!',
        type: 'success', // 'success' | 'error' | 'info' | 'warning'
      },
    },
  });
});
```

#### 2. Web Push API Notifications (Realtime Push)

To push messages to the admin dashboard in real-time, Cape integrates with the standard browser **Web Push API**.

##### Step 1: Configure Backend Push Subscription Routing

Pass subscription lifecycle hooks and your public VAPID key when initializing `createAdminApi`.

```typescript
import { createAdminApi } from '@cape/hono';

const api = createAdminApi({
  db: dbAdapter,
  resources: [userResource],
  notifications: {
    vapidPublicKey: 'YOUR_VAPID_PUBLIC_KEY',
    onSubscribe: async (subscription, c) => {
      // Save this subscription object to your database (e.g. KV, Cloudflare D1, etc.)
      await saveUserSubscription(subscription);
    },
    onUnsubscribe: async (subscription, c) => {
      // Remove the subscription from your database
      await deleteUserSubscription(subscription);
    },
  },
});
```

##### Step 2: Implement Service Worker (`sw.js`)

To receive and process Web Push payloads in the browser background, use a standard Service Worker. The Service Worker communicates with the active Cape Admin Console via a `BroadcastChannel`.

```javascript
// sw.js
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : { title: 'Notification', body: '' };

  // 1. Show native OS notification (if user is backgrounded)
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/logo.png',
      data: data,
    })
  );

  // 3. Broadcast to active Cape admin console for live toast popups
  const channel = new BroadcastChannel('cape-notifications');
  channel.postMessage({
    type: 'notification',
    payload: {
      message: data.body || data.title,
      type: data.type || 'info', // success, error, info, warning
    },
  });
});
```

##### Step 3: Register Service Worker in Client

Register the service worker in your React entry file (e.g. `main.tsx`):

```typescript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker
    .register('/sw.js')
    .then((reg) => console.log('Service Worker registered', reg))
    .catch((err) => console.error('Service Worker failed to register', err));
}
```

Cape's `<ResourcePage />` automatically listens to the `cape-notifications` broadcast channel and displays real-time push events as beautiful toast notifications.

---

### Approach 8: Global Search & Custom AI Search Integration

Cape features a pluggable Command Palette (`⌘K` / `Ctrl+K`) for global searches. While it performs default database-level part-match search on all `searchable` resource fields out of the box, developers can plug in custom search engines—such as **Vector/AI-powered semantic search**—by passing a `globalSearch.handler` to `createAdminApi`.

#### 1. Default DB Fallback Search (Zero-Config)

By default, Cape automatically queries up to 5 matching records per resource using the configured database adapter. It attempts to choose the best columns for `title` and `subtitle` based on common metadata naming heuristics (e.g. `name`, `title`, `email`, `sku`).

#### 2. Pluggable Custom Search (e.g. Natural Language / AI Search)

To integrate advanced query engines (like PGVector, Pinecone, or OpenAI Embeddings), define the `globalSearch.handler` hook:

```typescript
// server.ts
import { createAdminApi } from '@cape/hono';

const api = createAdminApi({
  db: dbAdapter,
  resources: [usersResource, productsResource],
  globalSearch: {
    // Custom search handler
    handler: async (query, c) => {
      // 1. Generate Embeddings or perform natural language parsing
      // 2. Query your AI vector database
      const vectorDbResults = await queryVectorDatabase(query);

      // 3. Return results array matching Cape's GlobalSearchResult interface
      return vectorDbResults.map((record) => ({
        resourceName: record.resourceType, // 'users', 'products', etc.
        id: record.id,
        title: record.name,
        subtitle: record.snippet,
        score: record.similarityScore, // Optional float between 0.0 and 1.0 (renders as "95% match")
      }));
    },
    // Optional: restrict default search fallback to specific resources (if handler is not defined)
    resources: ['users', 'products'],
  },
});
```
