import { eq, or, and, like, ilike, sql, desc, asc, inArray, isNull } from 'drizzle-orm';
import { DbAdapter, ListParams, PaginatedResult } from '../adapter.js';
import { ResourceMetadata } from '../resource.js';

export class DrizzleAdapter implements DbAdapter {
  constructor(private db: any) {}

  private getTableColumn(model: any, name: string): any {
    // Standard Drizzle tables have columns in keys or model[name]
    return model[name];
  }

  async list(resource: ResourceMetadata, params: ListParams): Promise<PaginatedResult> {
    const { model } = resource;
    const { page, pageSize, sortField, sortOrder, search, filters } = params;
    const offset = (page - 1) * pageSize;

    const conditions: any[] = [];

    // Search query conditions (applied to searchable columns)
    if (search) {
      const searchConditions: any[] = [];
      const searchableColumns = resource.table.columns.filter((col) => col.isSearchable);

      const escaped = search.replace(/[\\%_]/g, '\\$&');
      const pattern = `%${escaped}%`;

      const dialectName = this.db.dialect?.constructor.name.toLowerCase() || '';
      const isPg = dialectName.includes('pg') || dialectName.includes('postgres');

      for (const col of searchableColumns) {
        const dbCol = this.getTableColumn(model, col.name);
        if (dbCol) {
          if (isPg) {
            searchConditions.push(ilike(dbCol, pattern));
          } else {
            searchConditions.push(like(dbCol, pattern));
          }
        }
      }

      if (searchConditions.length > 0) {
        conditions.push(or(...searchConditions));
      }
    }

    // Filter conditions
    if (filters) {
      for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== '') {
          const dbCol = this.getTableColumn(model, key);
          if (dbCol) {
            conditions.push(eq(dbCol, value));
          }
        }
      }
    }

    if (resource.softDelete) {
      const deletedAtCol = this.getTableColumn(model, resource.softDelete.columnName);
      if (deletedAtCol) {
        conditions.push(isNull(deletedAtCol));
      }
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sorting
    const orderByClause: any[] = [];
    if (sortField) {
      const dbCol = this.getTableColumn(model, sortField);
      if (dbCol) {
        orderByClause.push(sortOrder === 'desc' ? desc(dbCol) : asc(dbCol));
      }
    }

    // Fetch total count
    let countQuery = this.db.select({ count: sql<number>`count(*)` }).from(model);
    if (whereClause) {
      countQuery = countQuery.where(whereClause);
    }
    const countResult = await countQuery;
    const total = Number(countResult[0]?.count || 0);

    // Fetch data
    let dataQuery = this.db.select().from(model);
    if (whereClause) {
      dataQuery = dataQuery.where(whereClause);
    }
    if (orderByClause.length > 0) {
      dataQuery = dataQuery.orderBy(...orderByClause);
    }

    const data = await dataQuery.limit(pageSize).offset(offset);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  async create(resource: ResourceMetadata, data: any): Promise<any> {
    const { model } = resource;
    // Drizzle returning() is supported on pg/sqlite. We do returning() if available, otherwise fallback
    const query = this.db.insert(model).values(data);
    if (typeof query.returning === 'function') {
      const results = await query.returning();
      return results[0] || data;
    }
    await query;
    return data;
  }

  async read(resource: ResourceMetadata, id: any): Promise<any> {
    const { model, primaryKey } = resource;
    const dbCol = this.getTableColumn(model, primaryKey);
    if (!dbCol) {
      throw new Error(`Primary key column "${primaryKey}" not found on model.`);
    }
    const conditions = [eq(dbCol, id)];
    if (resource.softDelete) {
      const deletedAtCol = this.getTableColumn(model, resource.softDelete.columnName);
      if (deletedAtCol) {
        conditions.push(isNull(deletedAtCol));
      }
    }
    const results = await this.db
      .select()
      .from(model)
      .where(and(...conditions));
    return results[0] || null;
  }

  async readMany(resource: ResourceMetadata, ids: any[]): Promise<any[]> {
    const { model, primaryKey } = resource;
    const dbCol = this.getTableColumn(model, primaryKey);
    if (!dbCol) {
      throw new Error(`Primary key column "${primaryKey}" not found on model.`);
    }
    if (ids.length === 0) return [];
    const conditions = [inArray(dbCol, ids)];
    if (resource.softDelete) {
      const deletedAtCol = this.getTableColumn(model, resource.softDelete.columnName);
      if (deletedAtCol) {
        conditions.push(isNull(deletedAtCol));
      }
    }
    return await this.db
      .select()
      .from(model)
      .where(and(...conditions));
  }

  async update(resource: ResourceMetadata, id: any, data: any): Promise<any> {
    const { model, primaryKey } = resource;
    const dbCol = this.getTableColumn(model, primaryKey);
    if (!dbCol) {
      throw new Error(`Primary key column "${primaryKey}" not found on model.`);
    }

    const query = this.db.update(model).set(data).where(eq(dbCol, id));
    if (typeof query.returning === 'function') {
      const results = await query.returning();
      return results[0] || { ...data, [primaryKey]: id };
    }
    await query;
    return { ...data, [primaryKey]: id };
  }

  async delete(resource: ResourceMetadata, id: any): Promise<void> {
    const { model, primaryKey } = resource;
    const dbCol = this.getTableColumn(model, primaryKey);
    if (!dbCol) {
      throw new Error(`Primary key column "${primaryKey}" not found on model.`);
    }
    if (resource.softDelete) {
      const deletedAtCol = this.getTableColumn(model, resource.softDelete.columnName);
      if (deletedAtCol) {
        const dialectName = this.db.dialect?.constructor.name.toLowerCase() || '';
        const isPg = dialectName.includes('pg') || dialectName.includes('postgres');
        const deleteVal = isPg ? new Date() : new Date().toISOString();
        await this.db
          .update(model)
          .set({ [resource.softDelete.columnName]: deleteVal })
          .where(eq(dbCol, id));
        return;
      }
    }
    await this.db.delete(model).where(eq(dbCol, id));
  }

  async bulkDelete(resource: ResourceMetadata, ids: any[]): Promise<void> {
    const { model, primaryKey } = resource;
    const dbCol = this.getTableColumn(model, primaryKey);
    if (!dbCol) {
      throw new Error(`Primary key column "${primaryKey}" not found on model.`);
    }
    if (resource.softDelete) {
      const deletedAtCol = this.getTableColumn(model, resource.softDelete.columnName);
      if (deletedAtCol) {
        const dialectName = this.db.dialect?.constructor.name.toLowerCase() || '';
        const isPg = dialectName.includes('pg') || dialectName.includes('postgres');
        const deleteVal = isPg ? new Date() : new Date().toISOString();
        await this.db
          .update(model)
          .set({ [resource.softDelete.columnName]: deleteVal })
          .where(inArray(dbCol, ids));
        return;
      }
    }
    await this.db.delete(model).where(inArray(dbCol, ids));
  }
}
