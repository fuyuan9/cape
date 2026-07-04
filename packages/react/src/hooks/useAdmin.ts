import { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface AdminContextValue {
  apiUri: string;
}

export const AdminContext = createContext<AdminContextValue | null>(null);

export function useAdminContext() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdminContext must be used within an AdminProvider');
  }
  return context;
}

export interface SerializedField {
  name: string;
  type: string;
  label?: string;
  isRequired: boolean;
  isEmail: boolean;
  isReadonly: boolean;
  isDisabled: boolean;
  description?: string;
  defaultValue?: any;
  options?: string[];
  helperTextAbove?: string;
  helperTextAboveIcon?: string;
  helperTextBelow?: string;
  helperTextBelowIcon?: string;
  repeaterFields?: Array<{ name: string; label?: string }>;
  language?: string;
  customRender?: string;
}

export interface SerializedColumn {
  name: string;
  type: string;
  isSortable: boolean;
  isSearchable: boolean;
}

export interface SerializedResource {
  name: string;
  label: string;
  primaryKey: string;
  parent?: string;
  table: {
    columns: SerializedColumn[];
  };
  form: {
    fields: SerializedField[];
  };
  actions: { name: string; label?: string }[];
}

export function useAdminMetadata() {
  const { apiUri } = useAdminContext();
  return useQuery<{ resources: SerializedResource[] }>({
    queryKey: ['admin-metadata', apiUri],
    queryFn: async () => {
      const res = await fetch(`${apiUri}/metadata`);
      if (!res.ok) throw new Error('Failed to fetch admin metadata');
      return res.json();
    },
  });
}

export function useResourceList(
  resourceName: string,
  queryParams: {
    page: number;
    pageSize: number;
    sortField?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
    filters?: Record<string, any>;
  }
) {
  const { apiUri } = useAdminContext();
  return useQuery<{ data: any[]; total: number; page: number; pageSize: number }>({
    queryKey: ['resource-list', resourceName, queryParams, apiUri],
    queryFn: async () => {
      const sp = new URLSearchParams();
      sp.set('page', String(queryParams.page));
      sp.set('pageSize', String(queryParams.pageSize));
      if (queryParams.sortField) sp.set('sortField', queryParams.sortField);
      if (queryParams.sortOrder) sp.set('sortOrder', queryParams.sortOrder);
      if (queryParams.search) sp.set('search', queryParams.search);
      if (queryParams.filters) {
        for (const [key, value] of Object.entries(queryParams.filters)) {
          if (value !== undefined && value !== null && value !== '') {
            sp.set(key, String(value));
          }
        }
      }
      const res = await fetch(`${apiUri}/${resourceName}?${sp.toString()}`);
      if (!res.ok) throw new Error(`Failed to fetch ${resourceName} list`);
      return res.json();
    },
  });
}

export function useResourceRecord(resourceName: string, id: string | number | undefined) {
  const { apiUri } = useAdminContext();
  return useQuery<{ data: any }>({
    queryKey: ['resource-record', resourceName, id, apiUri],
    queryFn: async () => {
      if (!id) return { data: null };
      const res = await fetch(`${apiUri}/${resourceName}/${id}`);
      if (!res.ok) throw new Error(`Failed to fetch ${resourceName} record`);
      return res.json();
    },
    enabled: id !== undefined && id !== null && id !== '',
  });
}

export function useResourceCreate(resourceName: string) {
  const { apiUri } = useAdminContext();
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: async (data) => {
      const res = await fetch(`${apiUri}/${resourceName}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to create record');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-list', resourceName] });
    },
  });
}

export function useResourceUpdate(resourceName: string, id: string | number) {
  const { apiUri } = useAdminContext();
  const queryClient = useQueryClient();
  return useMutation<any, Error, any>({
    mutationFn: async (data) => {
      const res = await fetch(`${apiUri}/${resourceName}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to update record');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-list', resourceName] });
      queryClient.invalidateQueries({ queryKey: ['resource-record', resourceName, id] });
    },
  });
}

export function useResourceDelete(resourceName: string) {
  const { apiUri } = useAdminContext();
  const queryClient = useQueryClient();
  return useMutation<any, Error, string | number>({
    mutationFn: async (id) => {
      const res = await fetch(`${apiUri}/${resourceName}/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete record');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-list', resourceName] });
    },
  });
}

export function useResourceBulkDelete(resourceName: string) {
  const { apiUri } = useAdminContext();
  const queryClient = useQueryClient();
  return useMutation<any, Error, (string | number)[]>({
    mutationFn: async (ids) => {
      const res = await fetch(`${apiUri}/${resourceName}/bulk-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (!res.ok) throw new Error('Failed to perform bulk delete');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resource-list', resourceName] });
    },
  });
}

export function useFileUpload() {
  const { apiUri } = useAdminContext();
  return useMutation<{ url: string }, Error, File>({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${apiUri}/upload`, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to upload file');
      }
      return res.json();
    },
  });
}
