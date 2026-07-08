import { describe, expect, it } from 'vitest';
import { Hono } from 'hono';
import {
  defineResource,
  text,
  input,
  hiddenField,
  customField,
  hasMany,
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
    if (resource.softDelete) {
      const colName = resource.softDelete.columnName;
      filtered = filtered.filter((item) => item[colName] === undefined || item[colName] === null);
    }
    const page = params.page || 1;
    const pageSize = params.pageSize || 10;
    const start = (page - 1) * pageSize;
    const paginatedData = filtered.slice(start, start + pageSize);

    return {
      data: paginatedData,
      total: filtered.length,
      page,
      pageSize,
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
    const record = list.find((r) => String(r.id) === String(id)) || null;
    if (resource.softDelete && record) {
      const colName = resource.softDelete.columnName;
      if (record[colName] !== undefined && record[colName] !== null) {
        return null;
      }
    }
    return record;
  }

  async readMany(resource: ResourceMetadata, ids: any[]): Promise<any[]> {
    const list = this.recordsByResource[resource.name] || [];
    const idStrings = ids.map(String);
    let records = list.filter((r) => idStrings.includes(String(r.id)));
    if (resource.softDelete) {
      const colName = resource.softDelete.columnName;
      records = records.filter((r) => r[colName] === undefined || r[colName] === null);
    }
    return records;
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

  async delete(resource: ResourceMetadata, id: any): Promise<void> {
    const list = this.recordsByResource[resource.name] || [];
    if (resource.softDelete) {
      const colName = resource.softDelete.columnName;
      const record = list.find((r) => String(r.id) === String(id));
      if (record) {
        record[colName] = new Date().toISOString();
      }
      return;
    }
    this.recordsByResource[resource.name] = list.filter((r) => String(r.id) !== String(id));
  }

  async bulkDelete(resource: ResourceMetadata, ids: any[]): Promise<void> {
    const list = this.recordsByResource[resource.name] || [];
    const idStrings = ids.map(String);
    if (resource.softDelete) {
      const colName = resource.softDelete.columnName;
      list.forEach((record) => {
        if (idStrings.includes(String(record.id))) {
          record[colName] = new Date().toISOString();
        }
      });
      return;
    }
    this.recordsByResource[resource.name] = list.filter((r) => !idStrings.includes(String(r.id)));
  }
}

describe('Hono Admin API Routing', () => {
  const userResource = defineResource({
    name: 'users',
    model: {},
    table: {
      columns: [text('name').searchable().sortable().filterable()],
    },
    form: {
      fields: [
        input('name').required(),
        input('email').email().required().unique(),
        hasMany('posts', { resource: 'posts', foreignKey: 'userId' }),
      ],
    },
    actions: [
      {
        name: 'activate',
        label: 'Activate',
        handler: async (record) => {
          return { activated: true, id: record.id };
        },
      },
    ],
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

  const softDeletedResource = defineResource({
    name: 'soft-deleted-users',
    model: {},
    softDelete: true,
    table: {
      columns: [text('name')],
    },
    form: {
      fields: [input('name').required()],
    },
  });

  const customSoftDeletedResource = defineResource({
    name: 'custom-soft-deleted-users',
    model: {},
    softDelete: { columnName: 'archivedAt' },
    table: {
      columns: [text('name')],
    },
    form: {
      fields: [input('name').required()],
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
    'soft-deleted-users': [
      { id: '1', name: 'Active User' },
      { id: '2', name: 'Deleted User', deletedAt: '2026-07-08T00:00:00Z' },
    ],
    'custom-soft-deleted-users': [
      { id: '1', name: 'Active User Custom' },
      { id: '2', name: 'Deleted User Custom', archivedAt: '2026-07-08T00:00:00Z' },
    ],
  });

  const app = new Hono();
  app.route(
    '/admin/api',
    createAdminApi({
      db: adapter,
      resources: [
        userResource,
        postsResource,
        privateUsersResource,
        createOnlyResource,
        settingsResource,
        softDeletedResource,
        customSoftDeletedResource,
      ],
      upload: {
        maxSize: 100,
        allowedTypes: ['image/png'],
      },
    })
  );

  it('should return serialized metadata with parent properties', async () => {
    const res = await app.request('/admin/api/metadata');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.resources.map((resource: any) => resource.name)).toEqual([
      'users',
      'posts',
      'drafts',
      'settings',
      'soft-deleted-users',
      'custom-soft-deleted-users',
    ]);
    expect(body.resources.find((resource: any) => resource.name === 'private-users')).toBeUndefined();
    const posts = body.resources.find((resource: any) => resource.name === 'posts');
    expect(posts.parent).toBe('users');
    expect(posts.foreignKey).toBe('userId');

    const users = body.resources.find((resource: any) => resource.name === 'users');
    const postsField = users.form.fields.find((f: any) => f.name === 'posts');
    expect(postsField).toBeDefined();
    expect(postsField.type).toBe('hasMany');
    expect(postsField.relationResourceName).toBe('posts');
    expect(postsField.foreignKey).toBe('userId');
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

  it('should partially update a record using PATCH', async () => {
    const res = await app.request('/admin/api/users/1', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Origin: 'http://localhost',
      },
      body: JSON.stringify({
        name: 'John Doe II',
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.name).toBe('John Doe II');
    expect(body.data.email).toBe('john@example.com');
  });

  it('should execute custom actions', async () => {
    const res = await app.request('/admin/api/users/1/actions/activate', {
      method: 'POST',
      headers: {
        Origin: 'http://localhost',
      },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      success: true,
      result: { activated: true, id: '1' },
    });
  });

  it('should enforce upload size and type limits', async () => {
    const formData = new FormData();
    formData.append('file', new File(['a'.repeat(200)], 'large.png', { type: 'image/png' }));
    const res = await app.request('/admin/api/upload', {
      method: 'POST',
      body: formData,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('size exceeds the limit');

    const wrongTypeData = new FormData();
    wrongTypeData.append('file', new File(['a'], 'test.txt', { type: 'text/plain' }));
    const resType = await app.request('/admin/api/upload', {
      method: 'POST',
      body: wrongTypeData,
    });
    expect(resType.status).toBe(400);
    const bodyType = await resType.json();
    expect(bodyType.error).toContain('Invalid file type');
  });

  it('should prevent information disclosure (existence leaks)', async () => {
    // For unauthorized list requests, requesting detail of non-existent record should return 403, not 404
    const res = await app.request('/admin/api/private-users/999');
    expect(res.status).toBe(403);
  });

  describe('Soft Delete Support', () => {
    it('should handle soft delete with default deletedAt column', async () => {
      // 1. Check list only returns non-deleted record
      const listRes = await app.request('/admin/api/soft-deleted-users');
      expect(listRes.status).toBe(200);
      const listBody = await listRes.json();
      expect(listBody.data.length).toBe(1);
      expect(listBody.data[0].id).toBe('1');
      expect(listBody.data[0].deletedAt).toBeUndefined();

      // 2. Read non-deleted record
      const readRes = await app.request('/admin/api/soft-deleted-users/1');
      expect(readRes.status).toBe(200);

      // 3. Read soft-deleted record returns 404
      const readDeletedRes = await app.request('/admin/api/soft-deleted-users/2');
      expect(readDeletedRes.status).toBe(404);

      // 4. Update soft-deleted record returns 404
      const updateDeletedRes = await app.request('/admin/api/soft-deleted-users/2', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Updated' }),
      });
      expect(updateDeletedRes.status).toBe(404);

      // 5. Delete active record (causes soft delete)
      const deleteRes = await app.request('/admin/api/soft-deleted-users/1', {
        method: 'DELETE',
      });
      expect(deleteRes.status).toBe(200);

      // Verify it has deletedAt set in DB
      const dbRecord = adapter.recordsByResource['soft-deleted-users'].find((r) => r.id === '1');
      expect(dbRecord?.deletedAt).toBeDefined();

      // List now returns empty
      const listRes2 = await app.request('/admin/api/soft-deleted-users');
      const listBody2 = await listRes2.json();
      expect(listBody2.data.length).toBe(0);
    });

    it('should handle soft delete with custom archivedAt column', async () => {
      // 1. Check list only returns non-deleted record
      const listRes = await app.request('/admin/api/custom-soft-deleted-users');
      expect(listRes.status).toBe(200);
      const listBody = await listRes.json();
      expect(listBody.data.length).toBe(1);
      expect(listBody.data[0].id).toBe('1');
      expect(listBody.data[0].archivedAt).toBeUndefined();

      // 2. Read soft-deleted record returns 404
      const readDeletedRes = await app.request('/admin/api/custom-soft-deleted-users/2');
      expect(readDeletedRes.status).toBe(404);

      // 3. Delete active record (causes soft delete setting archivedAt)
      const deleteRes = await app.request('/admin/api/custom-soft-deleted-users/1', {
        method: 'DELETE',
      });
      expect(deleteRes.status).toBe(200);

      // Verify it has archivedAt set in DB
      const dbRecord = adapter.recordsByResource['custom-soft-deleted-users'].find((r) => r.id === '1');
      expect(dbRecord?.archivedAt).toBeDefined();
      expect(dbRecord?.deletedAt).toBeUndefined(); // standard column not used
    });
  });

  describe('CSV Export', () => {
    it('should return CSV with correct Content-Type and header row', async () => {
      const res = await app.request('/admin/api/users/export');
      expect(res.status).toBe(200);
      expect(res.headers.get('content-type')).toContain('text/csv');
      expect(res.headers.get('content-disposition')).toContain('attachment');
      expect(res.headers.get('content-disposition')).toContain('.csv');

      const text = await res.text();
      const lines = text.trim().split('\n');
      // First line should be the header
      expect(lines[0]).toContain('name');
    });

    it('should include all records in CSV body', async () => {
      const res = await app.request('/admin/api/users/export');
      const text = await res.text();
      expect(text).toContain('John Doe');
      expect(text).toContain('Bob');
    });

    it('should apply search filter on export', async () => {
      const res = await app.request('/admin/api/users/export?search=John');
      const text = await res.text();
      expect(text).toContain('John Doe');
      expect(text).not.toContain('Bob Post'); // different resource, but Bob user should not appear
    });

    it('should escape CSV injection characters', async () => {
      // Add a record with a formula-like value
      adapter.recordsByResource['users'].push({ id: '99', name: '=SUM(1,2)', email: 'formula@test.com' });
      const res = await app.request('/admin/api/users/export');
      const text = await res.text();
      // The injected formula should be escaped with a leading single-quote
      expect(text).toContain("'=SUM(1,2)");
      // Cleanup
      adapter.recordsByResource['users'] = adapter.recordsByResource['users'].filter((r) => r.id !== '99');
    });
  });

  describe('CSV Import', () => {
    it('should import records from a valid CSV file', async () => {
      const csvContent = 'name,email\nImported User,imported@example.com';
      const file = new File([csvContent], 'import.csv', { type: 'text/csv' });
      const formData = new FormData();
      formData.append('file', file);

      const initialCount = adapter.recordsByResource['users'].length;
      const res = await app.request('/admin/api/users/import', {
        method: 'POST',
        body: formData,
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
      expect(body.created).toBe(1);
      expect(body.errors).toHaveLength(0);
      expect(adapter.recordsByResource['users'].length).toBe(initialCount + 1);
    });

    it('should reject non-CSV file extension', async () => {
      const file = new File(['data'], 'file.txt', { type: 'text/plain' });
      const formData = new FormData();
      formData.append('file', file);

      const res = await app.request('/admin/api/users/import', {
        method: 'POST',
        body: formData,
      });
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain('CSV');
    });

    it('should return error when no file is uploaded', async () => {
      const formData = new FormData();
      const res = await app.request('/admin/api/users/import', {
        method: 'POST',
        body: formData,
      });
      expect(res.status).toBe(400);
    });

    it('should ignore unknown columns not in the resource table', async () => {
      const csvContent = 'name,email,unknownColumn\nSafe User,safe@example.com,INJECTED_VALUE';
      const file = new File([csvContent], 'import.csv', { type: 'text/csv' });
      const formData = new FormData();
      formData.append('file', file);

      const initialCount = adapter.recordsByResource['users'].length;
      const res = await app.request('/admin/api/users/import', {
        method: 'POST',
        body: formData,
      });
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.created).toBe(1);

      // Verify the imported record does NOT have the unknown column
      const newRecord = adapter.recordsByResource['users'][adapter.recordsByResource['users'].length - 1];
      expect(newRecord).not.toHaveProperty('unknownColumn');
    });
  });

  describe('Relation Search', () => {
    it('should search related resources and return id and label', async () => {
      // Clear or seed some users first
      adapter.recordsByResource['users'] = [
        { id: '1', name: 'Alice Smith', email: 'alice@test.com' },
        { id: '2', name: 'Bob Jones', email: 'bob@test.com' },
      ];

      const res = await app.request('/admin/api/users/relation-search?q=Alice&labelField=name');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results).toBeDefined();
      expect(body.results).toHaveLength(1);
      expect(body.results[0]).toEqual({ id: '1', label: 'Alice Smith' });
    });

    it('should fall back to primary key if labelField is missing or not found', async () => {
      adapter.recordsByResource['users'] = [{ id: '1', name: 'Alice Smith', email: 'alice@test.com' }];
      const res = await app.request('/admin/api/users/relation-search?q=Alice&labelField=nonexistent');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results[0]).toEqual({ id: '1', label: '1' });
    });

    it('should respect pageSize limit', async () => {
      adapter.recordsByResource['users'] = [
        { id: '1', name: 'User 1' },
        { id: '2', name: 'User 2' },
        { id: '3', name: 'User 3' },
      ];
      const res = await app.request('/admin/api/users/relation-search?pageSize=2');
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.results).toHaveLength(2);
    });
  });
});
