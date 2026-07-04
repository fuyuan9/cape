import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import {
  defineResource,
  text,
  email,
  input,
  DbAdapter,
  ResourceMetadata,
  ListParams,
  PaginatedResult,
} from '@cape/core';
import { createAdminApi } from '../src/index.js';

class MockAdapter implements DbAdapter {
  constructor(public records: any[]) {}

  async list(resource: ResourceMetadata, params: ListParams): Promise<PaginatedResult> {
    let filtered = [...this.records];
    if (resource.name === 'users') {
      filtered = filtered.filter((r) => r.name !== undefined);
    } else if (resource.name === 'posts') {
      filtered = filtered.filter((r) => r.title !== undefined);
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
    const record = { ...data, id: String(this.records.length + 1) };
    this.records.push(record);
    return record;
  }

  async read(resource: ResourceMetadata, id: any): Promise<any> {
    return this.records.find((r) => String(r.id) === String(id)) || null;
  }

  async update(resource: ResourceMetadata, id: any, data: any): Promise<any> {
    const index = this.records.findIndex((r) => String(r.id) === String(id));
    if (index !== -1) {
      this.records[index] = { ...this.records[index], ...data };
      return this.records[index];
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
      columns: [text('name')],
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
      columns: [text('title')],
    },
    form: {
      fields: [input('title').required()],
    },
  });

  const adapter = new MockAdapter([
    { id: '1', name: 'John Doe', email: 'john@example.com' },
    { id: '2', name: 'Bob', email: 'bob@example.com' },
    // child records
    { id: '10', userId: '1', title: 'John First Post' },
    { id: '11', userId: '1', title: 'John Second Post' },
    { id: '12', userId: '2', title: 'Bob Post' },
  ]);

  const app = new Hono();
  app.route('/admin/api', createAdminApi({ db: adapter, resources: [userResource, postsResource] }));

  it('should return serialized metadata with parent properties', async () => {
    const res = await app.request('/admin/api/metadata');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.resources).toHaveLength(2);
    expect(body.resources[1].name).toBe('posts');
    expect(body.resources[1].parent).toBe('users');
    expect(body.resources[1].foreignKey).toBe('userId');
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
});
