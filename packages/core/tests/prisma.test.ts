import { describe, it, expect, vi } from 'vitest';
import { PrismaAdapter } from '../src/adapters/prisma.js';
import { defineResource } from '../src/resource.js';
import { text } from '../src/builders/columns.js';

describe('PrismaAdapter', () => {
  const createMockDelegate = () => ({
    count: vi.fn().mockResolvedValue(42),
    findMany: vi.fn().mockResolvedValue([{ id: 1, name: 'Alice' }]),
    create: vi.fn().mockResolvedValue({ id: 2, name: 'Bob' }),
    findUnique: vi.fn().mockResolvedValue({ id: 1, name: 'Alice' }),
    update: vi.fn().mockResolvedValue({ id: 1, name: 'Alice Updated' }),
    delete: vi.fn().mockResolvedValue({ id: 1 }),
    deleteMany: vi.fn().mockResolvedValue({ count: 3 }),
  });

  const mockPrisma = {
    user: createMockDelegate(),
  };

  const resource = defineResource({
    name: 'users',
    model: 'user',
    table: {
      columns: [text('name').searchable().sortable()],
    },
    form: {
      fields: [],
    },
  });

  it('should query list with where, search, pagination, and sorting', async () => {
    const adapter = new PrismaAdapter(mockPrisma);
    const delegate = mockPrisma.user;

    const result = await adapter.list(resource.metadata, {
      page: 2,
      pageSize: 10,
      search: 'Alice',
      sortField: 'name',
      sortOrder: 'desc',
      filters: { role: 'admin', active: 'true' },
    });

    expect(delegate.count).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            name: {
              contains: 'Alice',
              mode: 'insensitive',
            },
          },
        ],
        role: 'admin',
        active: true,
      },
    });

    expect(delegate.findMany).toHaveBeenCalledWith({
      where: {
        OR: [
          {
            name: {
              contains: 'Alice',
              mode: 'insensitive',
            },
          },
        ],
        role: 'admin',
        active: true,
      },
      skip: 10,
      take: 10,
      orderBy: {
        name: 'desc',
      },
    });

    expect(result).toEqual({
      data: [{ id: 1, name: 'Alice' }],
      total: 42,
      page: 2,
      pageSize: 10,
    });
  });

  it('should handle record creation', async () => {
    const adapter = new PrismaAdapter(mockPrisma);
    const delegate = mockPrisma.user;

    const data = { name: 'Bob' };
    const result = await adapter.create(resource.metadata, data);

    expect(delegate.create).toHaveBeenCalledWith({
      data,
    });
    expect(result).toEqual({ id: 2, name: 'Bob' });
  });

  it('should handle reading record and parse numeric ID', async () => {
    const adapter = new PrismaAdapter(mockPrisma);
    const delegate = mockPrisma.user;

    const result = await adapter.read(resource.metadata, '1');

    expect(delegate.findUnique).toHaveBeenCalledWith({
      where: {
        id: 1, // parsed to number
      },
    });
    expect(result).toEqual({ id: 1, name: 'Alice' });
  });

  it('should handle updating record, parsing ID, and excluding primary key from updates', async () => {
    const adapter = new PrismaAdapter(mockPrisma);
    const delegate = mockPrisma.user;

    const data = { id: 1, name: 'Alice Updated' };
    const result = await adapter.update(resource.metadata, '1', data);

    expect(delegate.update).toHaveBeenCalledWith({
      where: {
        id: 1,
      },
      data: {
        name: 'Alice Updated', // 'id' should be removed
      },
    });
    expect(result).toEqual({ id: 1, name: 'Alice Updated' });
  });

  it('should handle record deletion', async () => {
    const adapter = new PrismaAdapter(mockPrisma);
    const delegate = mockPrisma.user;

    await adapter.delete(resource.metadata, '1');

    expect(delegate.delete).toHaveBeenCalledWith({
      where: {
        id: 1,
      },
    });
  });

  it('should handle bulk deletion', async () => {
    const adapter = new PrismaAdapter(mockPrisma);
    const delegate = mockPrisma.user;

    await adapter.bulkDelete(resource.metadata, ['1', '2', '3']);

    expect(delegate.deleteMany).toHaveBeenCalledWith({
      where: {
        id: {
          in: [1, 2, 3],
        },
      },
    });
  });
});
