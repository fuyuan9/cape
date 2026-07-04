# Public API Reference

## Core Module (`@cape/core`)

### 1. Resource Definition

#### `defineResource<TModel, TRecord, TContext>(config: ResourceConfig): Resource`

Builds a resource and generates metadata containing type schema and validation information.

```typescript
interface ResourceConfig {
  name: string;        // Unique resource name (used in URL paths)
  label?: string;      // Label shown in the UI (auto-capitalized if omitted)
  model: any;          // Drizzle table definition or similar
  primaryKey?: string; // Primary key column name (default: 'id')
  table: {
    columns: ColumnBuilder[]; // Array of display columns
  };
  form: {
    fields: FieldBuilder[]; // Array of form fields for create/edit
  };
  actions?: ActionMetadata[];        // Custom action definitions
  authorization?: ResourceAuthorization;
  hooks?: ResourceHooks;
}
```

### 2. Table Column Builders (`@cape/core/builders/columns`)

Helpers for specifying how data is displayed in tables. All are immutable and support chaining.

- `text(name: string)`: Plain text column.
- `email(name: string)`: Email address column. Automatically renders as a mailto link.
- `badge(name: string)`: Badge-style column for categorical values.
- `datetime(name: string)`: Date/time column. Displays in localized format.
- `image(name: string)`: Image column. Shows an avatar/thumbnail preview in the list view.

**Chaining Methods:**

- `.sortable()`: Enables ascending/descending sort by this column.
- `.searchable()`: Enables free-text search on this column.

---

### 3. Form Field Builders (`@cape/core/builders/fields`)

Specifies the input UI for create and edit forms. Immutable design with full chaining support.

- `input(name: string)`: General-purpose text input.
  - `.email()`: Adds email format validation.
- `numberField(name: string)`: Numeric input.
- `textareaField(name: string)`: Multi-line text input.
- `booleanField(name: string)`: Boolean input via checkbox.
- `select(name: string, config: { options: string[] })`: Dropdown selection.
- `dateField(name: string)`: Date picker.
- `datetimeField(name: string)`: Date and time picker.
- `badgeField(name: string)`: Badge input field.
- `relationField(name: string, config: { model: any })`: Related record association field.
- `fileUpload(name: string)`: File/image upload input. Automatically shows a progress indicator, preview, and clear button.

**Chaining Methods:**

- `.required()`: Marks the field as required.
- `.readonly()`: Makes the field read-only.
- `.disabled()`: Sets the field to a disabled state.
- `.description(text: string)`: Adds helper text below the field.
- `.label(text: string)`: Sets a custom display label.
- `.defaultValue(val: any)`: Sets a default value.
- `.unique()`: Adds a uniqueness constraint. Automatically validates against existing database values on create/update and shows an error message on duplicate.

---

## Backend API Integration (`@cape/hono`)

#### `createAdminApi(options: { db: DbAdapter, resources: Resource[] })`

Creates an API router that can be mounted on a Hono application. The following endpoints are automatically enabled:

- `GET /metadata`: Returns serialized metadata for the entire admin panel.
- `GET /:resourceName`: Fetches a paginated, searchable, sortable list of records.
- `GET /:resourceName/:id`: Fetches details of a single record.
- `POST /:resourceName`: Creates a new record (with Zod validation).
- `PUT /:resourceName/:id`: Updates a record.
- `DELETE /:resourceName/:id`: Deletes a record.
- `POST /:resourceName/bulk-delete`: Bulk-deletes multiple selected records.

---

## Frontend Layer (`@cape/react` & `@cape/shadcn`)

### 1. `AdminProvider` (`@cape/react`)

Placed at the root of your React app to configure the API connection target.

```tsx
<AdminProvider apiUri="https://api.example.com/admin">{children}</AdminProvider>
```

### 2. `ResourcePage` (`@cape/shadcn`)

Renders a full-screen admin console with sidebar navigation and complete CRUD functionality just by mounting it.
Internally calls `@cape/react` data-fetching hooks, keeping business logic outside the components.

**Properties:**

- `useHashRouting?: boolean` (default: `true`):
  Enables or disables automatic hash-based URL routing (e.g. `#/resources/users`). When disabled, routing status is managed purely in-memory.

---

## Nested Resources (Sub-resources / Relation Managers)

Resources with a parent-child relationship (e.g., `orders` and their `order-items`) can be defined so that child resource CRUD management (Relation Manager) appears automatically within the parent resource's show view.

### 1. Configuring the Parent-Child Relationship

Specify `parent` and `foreignKey` in the child resource's `defineResource` call.

```typescript
// Child resource (order-items) definition
export const orderItemsResource = defineResource({
  name: 'order-items',
  label: 'Items',
  parent: 'orders',       // The 'name' of the parent resource
  foreignKey: 'orderId',  // The foreign key column that holds the parent record's ID
  model: orderItemsTable,
  // ... table / form configuration
});
```

### 2. Automatic Route Configuration

Resources with `parent` set will automatically mount the following nested API endpoints:

- `GET /admin/api/:parentName/:parentId/:childName` — List child records belonging to a specific parent
- `POST /admin/api/:parentName/:parentId/:childName` — Create a child record (the `foreignKey` is automatically injected with `parentId`)
- `PUT /admin/api/:parentName/:parentId/:childName/:id` — Update a child record
- `DELETE /admin/api/:parentName/:parentId/:childName/:id` — Delete a child record

### 3. Automatic UI Integration

- **Show View (ResourceShow)**: Opening a parent record's "Show" page automatically mounts the child resource's CRUD table at the bottom, allowing inline add and edit via modals.
- **Navigation (ResourcePage)**: Child resources in a parent-child relationship are automatically hidden from the sidebar navigation, keeping the admin console organized.
