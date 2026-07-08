# Authentication Integration Guide

Cape is designed to be authentication-agnostic. It seamlessly integrates with any authentication library (such as [Better-Auth](https://www.better-auth.com/) or Hono's native session middlewares) because the Hono `Context` is passed directly to all authorization checks and lifecycle hooks.

---

## How it Works

Cape passes the Hono `Context` (`c`) to:

1. **Authorization rules** defined in the resource's `authorization` object.
2. **Lifecycle hooks** defined in the resource's `hooks` object.

This allows you to access any variables stored in the Hono Context (like `c.get('user')`) or query headers and cookies directly.

---

## 1. Better-Auth Integration

[Better-Auth](https://www.better-auth.com/) is a modern authentication framework that works beautifully with Hono.

### Step 1: Set up Better-Auth in Hono

Initialize Better-Auth and mount its handler in your Hono application:

```ts
import { Hono } from 'hono';
import { auth } from './auth'; // Your Better-Auth instance

const app = new Hono();

// Mount Better-Auth endpoints
app.on(['POST', 'GET'], '/api/auth/*', (c) => auth.handler(c));
```

### Step 2: Create a Session Middleware

Create a Hono middleware to fetch the user session and inject it into the Hono Context:

```ts
import { Context, Next } from 'hono';
import { auth } from './auth';

export async function authMiddleware(c: Context, next: Next) {
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (session) {
    c.set('user', session.user);
    c.set('session', session.session);
  }

  await next();
}

// Apply to admin API routes
app.use('/admin/api/*', authMiddleware);
```

### Step 3: Enforce Authorization in Cape Resources

Now, you can access the authenticated user in your resource configuration:

```ts
import { defineResource, text, input } from '@fuyuan9/cape-core';

export const posts = defineResource({
  name: 'posts',
  model: postsTable,
  table: {
    columns: [text('title').sortable().searchable()],
  },
  form: {
    fields: [input('title').required()],
  },
  authorization: {
    // Only logged-in users can view the posts page
    canList: (c) => {
      const user = c.get('user');
      return !!user;
    },
    // Users can only update or delete their own posts
    canUpdate: (c, record) => {
      const user = c.get('user');
      return user && record.ownerId === user.id;
    },
    canDelete: (c, record) => {
      const user = c.get('user');
      return user && (user.role === 'admin' || record.ownerId === user.id);
    },
  },
});
```

### Step 4: Audit Fields in Lifecycle Hooks

You can automatically populate fields like `ownerId` or `updatedBy` inside Cape's lifecycle hooks using the injected context:

```ts
  hooks: {
    beforeCreate: (record, c) => {
      const user = c.get('user');
      if (user) {
        record.ownerId = user.id;
      }
    },
    beforeUpdate: (id, record, c) => {
      const user = c.get('user');
      if (user) {
        record.updatedById = user.id;
      }
    },
  }
```

---

## 2. Cookie-based Session Authentication

If you prefer lightweight session cookies, you can use Hono's built-in session middleware.

### Step 1: Initialize Session Middleware

```ts
import { Hono } from 'hono';
import { sessionMiddleware, Session } from 'hono/session';

const app = new Hono();

app.use(
  '/admin/api/*',
  sessionMiddleware({
    store: new MemoryStore(), // Or RedisStore, CookieStore, etc.
    encryptionKey: 'your-secret-key',
  })
);
```

### Step 2: Set Session variables on Login

```ts
app.post('/api/login', async (c) => {
  const { email, password } = await c.req.json();
  const user = await db.verifyUser(email, password);

  if (!user) return c.json({ error: 'Invalid credentials' }, 401);

  const session = c.get('session');
  session.set('user', { id: user.id, role: user.role, email: user.email });

  return c.json({ success: true });
});
```

### Step 3: Implement Authorization in Cape

In your Cape resources, check the session variables:

```ts
  authorization: {
    canList: (c) => {
      const session = c.get('session');
      const user = session.get('user');
      return user && (user.role === 'admin' || user.role === 'manager');
    },
  }
```

---

## Development & Mock Authentication

For development or testing environments, you can write a simple middleware that automatically injects a mock user:

```ts
app.use('/admin/api/*', async (c, next) => {
  if (process.env.NODE_ENV === 'development') {
    c.set('user', { id: 'mock-user-1', name: 'Mock Admin', role: 'admin' });
  }
  await next();
});
```
