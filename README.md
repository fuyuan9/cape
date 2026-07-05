# Cape

[![npm version](https://img.shields.gl/npm/v/@fuyuan9/cape-core.svg)](https://www.npmjs.com/package/@fuyuan9/cape-core)
[![npm downloads](https://img.shields.gl/npm/dm/@fuyuan9/cape-core.svg)](https://www.npmjs.com/package/@fuyuan9/cape-core)
[![Security Scan](https://github.com/fuyuan9/cape/actions/workflows/security.yml/badge.svg)](https://github.com/fuyuan9/cape/actions/workflows/security.yml)
[![License: MIT](https://img.shields.gl/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)

An admin panel framework for the Hono ecosystem, built with a TypeScript-first, immutable API design.

## Features

- **TypeScript First**: Automatically derives type-safe CRUD APIs, client-side validation, and admin UI from a single resource definition — no decorators or runtime reflection required.
- **Immutable Builder**: Field and column configuration methods (`.required()`, `.sortable()`, `.searchable()`, etc.) are all immutable, returning a new builder object on every chain call.
- **Hono Native**: Fully compliant with Hono's middleware/route definition patterns. Mount CRUD API endpoints instantly with a single `createAdminApi` call.
- **ORM Agnostic**: Database operations are abstracted through the `DbAdapter` interface. A `DrizzleAdapter` for Drizzle ORM is included out of the box.
- **shadcn/ui**: UI components and styles are based on the shadcn/ui aesthetic, enabling beautiful, responsive admin consoles with zero extra configuration.

## Project Structure

```
packages/
  core/      - Core config, builders, resource schema, DbAdapter
  hono/      - Hono routing and endpoint integration
  react/     - Custom hooks for data fetching and mutations via TanStack Query
  shadcn/    - React UI components styled with shadcn/ui
  cli/       - CLI tool for scaffolding resources and initial setup
```

## Quick Start

### 1. Define a Resource

```ts
import { defineResource, text, email, badge, datetime, input, select } from '@fuyuan9/cape-core';

export const users = defineResource({
  name: 'users',
  model: usersTable, // Drizzle table reference
  table: {
    columns: [text('name').sortable().searchable(), email('email').searchable(), badge('role'), datetime('createdAt')],
  },
  form: {
    fields: [
      input('name').required(),
      input('email').email().required(),
      select('role', {
        options: ['admin', 'member'],
      }),
    ],
  },
});
```

### 2. Backend API (Hono)

```ts
import { Hono } from 'hono';
import { DrizzleAdapter } from '@fuyuan9/cape-core';
import { createAdminApi } from '@fuyuan9/cape-hono';
import { db } from './db.js';
import { users } from './users.js';

const app = new Hono();

// Mount CRUD API endpoints
app.route(
  '/admin/api',
  createAdminApi({
    db: new DrizzleAdapter(db),
    resources: [users],
  })
);
```

### 3. Frontend UI (React)

```tsx
import React from 'react';
import { AdminProvider } from '@fuyuan9/cape-react';
import { ResourcePage } from '@fuyuan9/cape-shadcn';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

export default function AdminConsole() {
  return (
    <QueryClientProvider client={queryClient}>
      <AdminProvider apiUri="/admin/api">
        <ResourcePage />
      </AdminProvider>
    </QueryClientProvider>
  );
}
```

## Documentation

For detailed features and design information, refer to the individual documents below.

- [Architecture Design](docs/architecture.md)
- [Public API Reference](docs/public-api.md)
- [Migration & Setup Guide](docs/migration.md)
- [Testing Guide](docs/testing.md)
- [Security & Supply Chain Protection](docs/security.md)
- [Customization Guide](docs/customization.md)
- [CLI Guide](docs/cli.md)

## Running The Demo Apps

This repository includes runnable demo apps under `examples/`.

Install dependencies from the repository root:

```bash
pnpm install
```

Start the basic demo:

```bash
pnpm --filter example-basic dev
```

Then open `http://localhost:5173`. The Hono API server runs on `http://localhost:3000` through the same command.

Start the Drizzle demo:

```bash
pnpm --filter example-drizzle dev
```

Then open `http://localhost:5174`. The Hono API server runs on `http://localhost:3001` through the same command.

## Roadmap

The following features are planned for future releases:

- **Plugins**: Support for third-party extensions to customize and extend Cape functionality.
- **Agent Skills**: Pre-built integrations and skills for AI agents.
