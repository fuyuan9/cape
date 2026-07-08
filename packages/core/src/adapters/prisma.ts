import { DbAdapter, ListParams, PaginatedResult } from '../adapter.js';
import { ResourceMetadata } from '../resource.js';

export class PrismaAdapter implements DbAdapter {
  constructor(private prisma: any) {}

  private getModelDelegate(resource: ResourceMetadata): any {
    const { model } = resource;
    if (typeof model === 'string') {
      const delegate = this.prisma[model];
      if (!delegate) {
        // Fallback to camelCase if the model name is capitalized
        const camelName = model.charAt(0).toLowerCase() + model.slice(1);
        const camelDelegate = this.prisma[camelName];
        if (camelDelegate) {
          return camelDelegate;
        }
        throw new Error(`Prisma model delegate for "${model}" not found on Prisma client.`);
      }
      return delegate;
    }
    // If the model itself is the delegate object
    return model;
  }

  private parseId(id: any): any {
    if (id === undefined || id === null) return id;
    const num = Number(id);
    return isNaN(num) ? id : num;
  }

  async list(resource: ResourceMetadata, params: ListParams): Promise<PaginatedResult> {
    const delegate = this.getModelDelegate(resource);
    const { page, pageSize, sortField, sortOrder, search, filters } = params;
    const skip = (page - 1) * pageSize;
    const take = pageSize;

    const where: any = {};

    // Search query conditions (contains search on searchable columns)
    if (search) {
      const searchableColumns = resource.table.columns.filter((col) => col.isSearchable);
      if (searchableColumns.length > 0) {
        where.OR = searchableColumns.map((col) => ({
          [col.name]: {
            contains: search,
            mode: 'insensitive', // Case-insensitive search
          },
        }));
      }
    }

    // Filter conditions
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
          // Parse values to appropriate types
          if (value === 'true') {
            where[key] = true;
          } else if (value === 'false') {
            where[key] = false;
          } else {
            const numVal = Number(value);
            if (!isNaN(numVal) && typeof value !== 'boolean') {
              where[key] = numVal;
            } else {
              where[key] = value;
            }
          }
        }
      }
    }

    // Sorting
    const orderBy: any = {};
    if (sortField) {
      orderBy[sortField] = sortOrder || 'asc';
    }

    if (resource.softDelete) {
      where[resource.softDelete.columnName] = null;
    }

    // Parallel execution of count and findMany queries
    const [total, data] = await Promise.all([
      delegate.count({ where }),
      delegate.findMany({
        where,
        skip,
        take,
        orderBy: sortField ? orderBy : undefined,
      }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async create(resource: ResourceMetadata, data: any): Promise<any> {
    const delegate = this.getModelDelegate(resource);
    return await delegate.create({
      data,
    });
  }

  async read(resource: ResourceMetadata, id: any): Promise<any> {
    const delegate = this.getModelDelegate(resource);
    const { primaryKey } = resource;
    if (resource.softDelete) {
      const where: any = {
        [primaryKey]: this.parseId(id),
        [resource.softDelete.columnName]: null,
      };
      return await delegate.findFirst({
        where,
      });
    }
    return await delegate.findUnique({
      where: {
        [primaryKey]: this.parseId(id),
      },
    });
  }

  async readMany(resource: ResourceMetadata, ids: any[]): Promise<any[]> {
    const delegate = this.getModelDelegate(resource);
    const { primaryKey } = resource;
    const parsedIds = ids.map((id) => this.parseId(id));
    if (parsedIds.length === 0) return [];
    const where: any = {
      [primaryKey]: {
        in: parsedIds,
      },
    };
    if (resource.softDelete) {
      where[resource.softDelete.columnName] = null;
    }
    return await delegate.findMany({
      where,
    });
  }

  async update(resource: ResourceMetadata, id: any, data: any): Promise<any> {
    const delegate = this.getModelDelegate(resource);
    const { primaryKey } = resource;

    // Copy data and exclude primaryKey from the updates
    const updateData = { ...data };
    delete updateData[primaryKey];

    return await delegate.update({
      where: {
        [primaryKey]: this.parseId(id),
      },
      data: updateData,
    });
  }

  async delete(resource: ResourceMetadata, id: any): Promise<void> {
    const delegate = this.getModelDelegate(resource);
    const { primaryKey } = resource;
    if (resource.softDelete) {
      await delegate.update({
        where: {
          [primaryKey]: this.parseId(id),
        },
        data: {
          [resource.softDelete.columnName]: new Date(),
        },
      });
    } else {
      await delegate.delete({
        where: {
          [primaryKey]: this.parseId(id),
        },
      });
    }
  }

  async bulkDelete(resource: ResourceMetadata, ids: any[]): Promise<void> {
    const delegate = this.getModelDelegate(resource);
    const { primaryKey } = resource;
    const parsedIds = ids.map((id) => this.parseId(id));
    if (resource.softDelete) {
      await delegate.updateMany({
        where: {
          [primaryKey]: {
            in: parsedIds,
          },
        },
        data: {
          [resource.softDelete.columnName]: new Date(),
        },
      });
    } else {
      await delegate.deleteMany({
        where: {
          [primaryKey]: {
            in: parsedIds,
          },
        },
      });
    }
  }
}
