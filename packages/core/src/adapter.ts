import { ResourceMetadata } from './resource.js';

export interface ListParams {
  page: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, any>;
}

export interface PaginatedResult<T = any> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface DbAdapter {
  list(resource: ResourceMetadata, params: ListParams): Promise<PaginatedResult>;
  create(resource: ResourceMetadata, data: any): Promise<any>;
  read(resource: ResourceMetadata, id: any): Promise<any>;
  readMany?(resource: ResourceMetadata, ids: any[]): Promise<any[]>;
  update(resource: ResourceMetadata, id: any, data: any): Promise<any>;
  delete(resource: ResourceMetadata, id: any): Promise<void>;
  bulkDelete(resource: ResourceMetadata, ids: any[]): Promise<void>;
}
