# CLI Guide

Cape Framework provides a command-line tool (CLI) to accelerate development. It can quickly generate resource files and initialize configuration.

---

## Running the CLI

If the package is installed locally, invoke it via `npx`:

```bash
npx cape <command> [arguments]
```

In a monorepo or development environment, you can also run:

```bash
# Display the help menu
npx cape help
```

---

## Available Commands

### 1. `cape init`

Generates `admin.ts`, the initial admin configuration file, at the root of your project.

- **Usage**:
  ```bash
  npx cape init
  ```
- **Generated file (`admin.ts`)**:
  ```typescript
  import { defineResource, text, email, badge, datetime, input, select } from '@cape/core';

  // Sample resource definition
  export const users = defineResource({
    name: 'users',
    model: {}, // Associate your Drizzle table definition here
    table: {
      columns: [
        text('name').sortable().searchable(),
        email('email').searchable(),
        badge('role'),
        datetime('createdAt'),
      ],
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

---

### 2. `cape make:resource <resourceName>`

Generates a new resource definition file (e.g., `posts.resource.ts`) with the specified name.

- **Usage**:
  ```bash
  npx cape make:resource posts
  ```
- **Generated file (`posts.resource.ts`)**:
  ```typescript
  import { defineResource, text, input } from '@cape/core';

  export const posts = defineResource({
    name: 'posts',
    label: 'Posts',
    model: {}, // Associate your Drizzle table definition here
    table: {
      columns: [text('id').sortable(), text('title').searchable()],
    },
    form: {
      fields: [input('title').required()],
    },
  });
  ```

---

### 3. `cape make:field <fieldName>`

Outputs boilerplate code for a table column definition and form field definition based on the specified field name. Useful for quickly copying and pasting into your resource files.

- **Usage**:
  ```bash
  npx cape make:field status
  ```
- **Console output**:
  ```typescript
  // Copy the code below to use inside your Resource columns / fields:

  // Table column:
  text('status').sortable().searchable();

  // Form input field:
  input('status').required();
  ```
