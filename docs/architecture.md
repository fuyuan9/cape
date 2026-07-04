# Architecture Design

Cape Framework adopts a multi-package monorepo structure designed for strong type safety, loose coupling, and maintainability.

## Layer Structure and Dependencies

Dependencies between packages are strictly unidirectional — there are no circular references.

```
core
  ├── Common metadata schema definitions
  └── Database adapter abstraction layer
       │
       ├─────────────────────┐
       ▼                     ▼
     hono                  react
Hono endpoint layer   TanStack Query data layer
       │                     │
       │                     ▼
       │                  shadcn
       │               UI rendering layer
       │                     │
       └──────────┬──────────┘
                  ▼
               examples
            Basic & practical samples
```

---

## Core Design Principles

### 1. Immutable Builders

Column definitions (`ColumnBuilder`) and field definitions (`FieldBuilder`) are designed to be immutable.

```ts
// Internal state is never mutated — a new builder instance is always returned.
const nameField = input('name');
const requiredNameField = nameField.required(); // nameField itself is unchanged
```

This completely eliminates side effects when reusing resource definitions or referencing them in parallel.

### 2. Metadata-Driven

The React frontend has no knowledge of database details or ORM internals.
It dynamically builds table structures, form validation (via client-side Zod schema generation), and detail cards based on serialized metadata (`form.fields`, `table.columns`, etc.) fetched from the backend.
This ensures complete separation of concerns between the frontend and backend.

### 3. ORM-Neutral via DbAdapter Abstraction

All database operations go through the `DbAdapter` interface.

```ts
export interface DbAdapter {
  list(resource: ResourceMetadata, params: ListParams): Promise<PaginatedResult>;
  create(resource: ResourceMetadata, data: any): Promise<any>;
  read(resource: ResourceMetadata, id: any): Promise<any>;
  update(resource: ResourceMetadata, id: any, data: any): Promise<any>;
  delete(resource: ResourceMetadata, id: any): Promise<void>;
  bulkDelete(resource: ResourceMetadata, ids: any[]): Promise<void>;
}
```

A `DrizzleAdapter` for Drizzle ORM is provided out of the box. Adding support for other ORMs (e.g., Prisma) in the future requires no changes to the core API or frontend implementation.

### 4. Extension Points

- **Authorization**: Authorization functions (`canList`, `canCreate`, etc.) can be hooked before each action is executed, receiving the Hono Context for validation.
- **Hooks**: Lifecycle hooks such as `beforeCreate`/`afterCreate` allow you to run hashing or business logic immediately before data insertion or updates.
