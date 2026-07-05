import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import {
  defineResource,
  text,
  input,
  hiddenField,
  customField,
  DbAdapter,
  ResourceMetadata,
  ListParams,
  PaginatedResult,
} from '@fuyuan9/cape-core';
import { createAdminApi } from '../src/index.js';

class MockAdapter implements DbAdapter {
  constructor(public recordsByResource: Record<string, any[]>) {}

  async list(resource: ResourceMetadata, params: ListParams): Promise<PaginatedResult> {
    let filtered = [...(this.recordsByResource[resource.name] || [])];
    if (params.search) {
      const search = params.search.toLowerCase();
      filtered = filtered.filter((record) =>
        Object.values(record).some((value) => String(value).toLowerCase().includes(search))
      );
    }
    if (params.filters) {
      for (const [key, value] of Object.entries(params.filters)) {
        filtered = filtered.filter((item) => String(item[key]) === String(value));
      }
    }
    return {
      data: filtered,
      total: filtered.length,
      page: params.page,
      pageSize: params.pageSize,
    };
  }

  async create(resource: ResourceMetadata, data: any): Promise<any> {
    const list = (this.recordsByResource[resource.name] ||= []);
    const record = { ...data, id: String(list.length + 1) };
    list.push(record);
    return record;
  }

  async read(resource: ResourceMetadata, id: any): Promise<any> {
    const list = this.recordsByResource[resource.name] || [];
    return list.find((r) => String(r.id) === String(id)) || null;
  }

  async update(resource: ResourceMetadata, id: any, data: any): Promise<any> {
    const list = this.recordsByResource[resource.name] || [];
    const index = list.findIndex((r) => String(r.id) === String(id));
    if (index !== -1) {
      list[index] = { ...list[index], ...data };
      return list[index];
    }
    return { ...data, id };
  }

  async delete(resource: ResourceMetadata, id: any): Promise<void> {}
  async bulkDelete(resource: ResourceMetadata, ids: any[]): Promise<void> {}
}

describe('Hono Admin API Routing', () => {
  const userResource = defineResource({
    name: 'users',
    model: {},
    table: {
      columns: [text('name').searchable()],
    },
    form: {
      fields: [input('name').required(), input('email').email().required().unique()],
    },
  });

  const postsResource = defineResource({
    name: 'posts',
    parent: 'users',
    foreignKey: 'userId',
    model: {},
    table: {
      columns: [text('title').searchable()],
    },
    form: {
      fields: [input('title').required()],
    },
  });

  const privateUsersResource = defineResource({
    name: 'private-users',
    model: {},
    table: {
      columns: [text('name').searchable()],
    },
    form: {
      fields: [input('name').required()],
    },
    authorization: {
      canList: () => false,
    },
  });

  const createOnlyResource = defineResource({
    name: 'drafts',
    model: {},
    table: {
      columns: [text('title')],
    },
    form: {
      fields: [input('title').required()],
    },
    authorization: {
      canList: () => false,
      canCreate: () => true,
    },
  });

  const settingsResource = defineResource({
    name: 'settings',
    model: {},
    table: {
      columns: [text('name'), text('role'), text('status')],
    },
    form: {
      fields: [
        input('name').required(),
        input('role').readonly(),
        input('status').disabled(),
        hiddenField('secretToken').defaultValue('server-secret'),
        customField('signature', { render: 'signature' }),
      ],
    },
  });

  const adapter = new MockAdapter({
    users: [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Bob', email: 'bob@example.com' },
    ],
    posts: [
      { id: '10', userId: '1', title: 'John First Post' },
      { id: '11', userId: '1', title: 'John Second Post' },
      { id: '12', userId: '2', title: 'Bob Post' },
    ],
    'private-users': [{ id: '1', name: 'Secret John' }],
    drafts: [],
    settings: [{ id: '1', name: 'Default', role: 'viewer', status: 'locked', secretToken: 'persisted-secret' }],
  });

  const app = new Hono();
  app.route(
    '/admin/api',
    createAdminApi({
      db: adapter,
      resources: [userResource, postsResource, privateUsersResource, createOnlyResource, settingsResource],
    })
  );

  it('should return serialized metadata with parent properties', async () => {
    const res = await app.request('/admin/api/metadata');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.resources.map((resource: any) => resource.name)).toEqual(['users', 'posts', 'drafts', 'settings']);
    expect(body.resources.find((resource: any) => resource.name === 'private-users')).toBeUndefined();
    const posts = body.resources.find((resource: any) => resource.name === 'posts');
    expect(posts.parent).toBe('users');
    expect(posts.foreignKey).toBe('userId');
  });

  it('should omit hidden fields from serialized metadata', async () => {
    const res = await app.request('/admin/api/metadata');
    const body = await res.json();
    const settings = body.resources.find((resource: any) => resource.name === 'settings');
    expect(settings.form.fields.map((field: any) => field.name)).toEqual(['name', 'role', 'status', 'signature']);
  });

  it('should list child records nested under parent', async () => {
    const res = await app.request('/admin/api/users/1/posts');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2); // Only John's posts
    expect(body.data[0].title).toBe('John First Post');
    expect(body.data[1].title).toBe('John Second Post');
  });

  it('should create child record with automatic foreign key binding', async () => {
    const res = await app.request('/admin/api/users/2/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Bob Post' }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data.title).toBe('New Bob Post');
    expect(body.data.userId).toBe('2'); // bound automatically!
  });

  it('should list parent records flat', async () => {
    const res = await app.request('/admin/api/users');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toHaveLength(2);
  });

  it('should enforce same-origin checks for mutating requests', async () => {
    const res = await app.request('/admin/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'https://evil.example',
      },
      body: JSON.stringify({ name: 'Mallory', email: 'mallory@example.com' }),
    });

    expect(res.status).toBe(403);
    await expect(res.json()).resolves.toMatchObject({ error: 'Cross-site mutation rejected' });
  });

  it('should keep global search results scoped to listable resources', async () => {
    const res = await app.request('/admin/api/global-search?q=john');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results.length).toBeGreaterThan(0);
    expect(body.results.some((result: any) => result.resourceName === 'private-users')).toBe(false);
  });

  it('should reject writes to readonly, disabled, hidden, and custom fields on create', async () => {
    const res = await app.request('/admin/api/settings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost',
      },
      body: JSON.stringify({
        name: 'Created',
        role: 'admin',
        status: 'published',
        secretToken: 'stolen-secret',
        signature: 'tampered',
      }),
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.data).toMatchObject({ name: 'Created' });
    expect(body.data.role).toBeUndefined();
    expect(body.data.status).toBeUndefined();
    expect(body.data.secretToken).toBeUndefined();
    expect(body.data.signature).toBeUndefined();
  });

  it('should reject writes to readonly, disabled, hidden, and custom fields on update', async () => {
    const res = await app.request('/admin/api/settings/1', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost',
      },
      body: JSON.stringify({
        name: 'Renamed',
        role: 'admin',
        status: 'published',
        secretToken: 'changed-secret',
        signature: 'tampered',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data).toMatchObject({
      id: '1',
      name: 'Renamed',
      role: 'viewer',
      status: 'locked',
      secretToken: 'persisted-secret',
    });
    expect(body.data.signature).toBeUndefined();
  });
});
