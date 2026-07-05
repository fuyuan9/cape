# Migration & Setup Guide

Steps to set up or introduce Cape Framework in a new or existing project.

## Setup Steps

### 1. Install Required Packages

Add the dependencies to your monorepo workspace or existing project.

**For Drizzle ORM projects:**

```bash
npm install @fuyuan9/cape-core @fuyuan9/cape-hono zod drizzle-orm
```

**For Prisma ORM projects:**

```bash
npm install @fuyuan9/cape-core @fuyuan9/cape-hono zod @prisma/client
npm install --save-dev prisma
```

### 2. Create a Resource Definition File

Write your admin definition in `admin/resources/user.ts`.

**For Drizzle:**

```ts
import { defineResource, text, input } from '@fuyuan9/cape-core';
import { usersTable } from '../schema.js';

export const userResource = defineResource({
  name: 'users',
  model: usersTable, // Drizzle table reference
  table: {
    columns: [text('name').sortable().searchable()],
  },
  form: {
    fields: [input('name').required()],
  },
});
```

**For Prisma:**

```ts
import { defineResource, text, input } from '@fuyuan9/cape-core';

export const userResource = defineResource({
  name: 'users',
  model: 'user', // Prisma model name (or delegate like `prisma.user`)
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

**For Drizzle:**

```ts
import { Hono } from 'hono';
import { DrizzleAdapter } from '@fuyuan9/cape-core';
import { createAdminApi } from '@fuyuan9/cape-hono';
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

**For Prisma:**

```ts
import { Hono } from 'hono';
import { PrismaAdapter } from '@fuyuan9/cape-core';
import { createAdminApi } from '@fuyuan9/cape-hono';
import { prisma } from './db.js'; // Prisma client instance
import { userResource } from './admin/resources/user.js';

const app = new Hono();

app.route(
  '/api/admin',
  createAdminApi({
    db: new PrismaAdapter(prisma),
    resources: [userResource],
  })
);
```

### 4. Configure the Client UI

Set up `AdminProvider` and `ResourcePage` in your React application (Vite, Next.js, etc.).

```tsx
import { AdminProvider } from '@fuyuan9/cape-react';
import { ResourcePage } from '@fuyuan9/cape-shadcn';
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
