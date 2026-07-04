# Migration & Setup Guide

Steps to set up or introduce Cape Framework in a new or existing project.

## Setup Steps

### 1. Install Required Packages

Add the dependencies to your monorepo workspace or existing project.

```bash
# For an existing Hono server environment
npm install @cape/core @cape/hono zod drizzle-orm
```

### 2. Create a Resource Definition File

Write your admin definition in `admin/resources/user.ts`.

```ts
import { defineResource, text, input } from '@cape/core';
import { usersTable } from '../schema.js';

export const userResource = defineResource({
  name: 'users',
  model: usersTable,
  table: {
    columns: [text('name').sortable().searchable()],
  },
  form: {
    fields: [input('name').required()],
  },
});
```

### 3. Configure Hono API Routing

Mount `createAdminApi` in your Hono server entry file.

```ts
import { Hono } from 'hono';
import { DrizzleAdapter } from '@cape/core';
import { createAdminApi } from '@cape/hono';
import { db } from './db.js';
import { userResource } from './admin/resources/user.js';

const app = new Hono();

app.route(
  '/api/admin',
  createAdminApi({
    db: new DrizzleAdapter(db),
    resources: [userResource],
  })
);
```

### 4. Configure the Client UI

Set up `AdminProvider` and `ResourcePage` in your React application (Vite, Next.js, etc.).

```tsx
import { AdminProvider } from '@cape/react';
import { ResourcePage } from '@cape/shadcn';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export function AdminApp() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminProvider apiUri="/api/admin">
        <ResourcePage />
      </AdminProvider>
    </QueryClientProvider>
  );
}
```

You are now ready to verify the fully functional admin panel.
