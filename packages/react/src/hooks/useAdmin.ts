import { createContext, useContext } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface AdminContextValue {
  apiUri: string;
  toast?: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
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
  isFilterable: boolean;
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
  const { apiUri, toast } = useAdminContext();
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resource-list', resourceName] });
      if (data?.meta?.toast && toast) {
        toast(data.meta.toast.message, data.meta.toast.type);
      }
    },
  });
}

export function useResourceUpdate(resourceName: string, id: string | number) {
  const { apiUri, toast } = useAdminContext();
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resource-list', resourceName] });
      queryClient.invalidateQueries({ queryKey: ['resource-record', resourceName, id] });
      if (data?.meta?.toast && toast) {
        toast(data.meta.toast.message, data.meta.toast.type);
      }
    },
  });
}

export function useResourceDelete(resourceName: string) {
  const { apiUri, toast } = useAdminContext();
  const queryClient = useQueryClient();
  return useMutation<any, Error, string | number>({
    mutationFn: async (id) => {
      const res = await fetch(`${apiUri}/${resourceName}/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete record');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resource-list', resourceName] });
      if (data?.meta?.toast && toast) {
        toast(data.meta.toast.message, data.meta.toast.type);
      }
    },
  });
}

export function useResourceBulkDelete(resourceName: string) {
  const { apiUri, toast } = useAdminContext();
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resource-list', resourceName] });
      if (data?.meta?.toast && toast) {
        toast(data.meta.toast.message, data.meta.toast.type);
      }
    },
  });
}
export function useResourceAction(resourceName: string) {
  const { apiUri, toast } = useAdminContext();
  const queryClient = useQueryClient();
  return useMutation<any, Error, { id: string | number; actionName: string }>({
    mutationFn: async ({ id, actionName }) => {
      const res = await fetch(`${apiUri}/${resourceName}/${id}/actions/${actionName}`, {
        method: 'POST',
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Failed to run action ${actionName}`);
      }
      return res.json();
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['resource-list', resourceName] });
      queryClient.invalidateQueries({ queryKey: ['resource-record', resourceName, variables.id] });
      if (toast) {
        toast(data?.message || `Action executed successfully`, 'success');
      }
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

export function useGlobalSearch(query: string) {
  const { apiUri } = useAdminContext();
  return useQuery({
    queryKey: ['global-search', query],
    queryFn: async () => {
      if (!query) return { results: [] };
      const res = await fetch(`${apiUri}/global-search?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: !!query,
  });
}

/**
 * Returns a function that triggers a CSV download for the given resource.
 * The current search/filter query params are forwarded to the export endpoint.
 */
export function useResourceExport(
  resourceName: string,
  queryParams?: {
    search?: string;
    filters?: Record<string, any>;
  }
) {
  const { apiUri } = useAdminContext();

  const triggerExport = () => {
    const sp = new URLSearchParams();
    if (queryParams?.search) sp.set('search', queryParams.search);
    if (queryParams?.filters) {
      for (const [key, value] of Object.entries(queryParams.filters)) {
        if (value !== undefined && value !== null && value !== '') {
          sp.set(key, String(value));
        }
      }
    }
    const url = `${apiUri}/${resourceName}/export?${sp.toString()}`;
    // Trigger browser download via a temporary anchor element
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return { triggerExport };
}

export interface ImportResult {
  success: boolean;
  created: number;
  skipped: number;
  errors: { row: number; field?: string; message: string }[];
}

/**
 * Returns a mutation that uploads a CSV file for bulk import.
 * On success it invalidates the resource list query cache.
 */
export function useResourceImport(resourceName: string) {
  const { apiUri, toast } = useAdminContext();
  const queryClient = useQueryClient();
  return useMutation<ImportResult, Error, File>({
    mutationFn: async (file) => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${apiUri}/${resourceName}/import`, {
        method: 'POST',
        body: formData,
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error || 'Import failed');
      }
      return body as ImportResult;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['resource-list', resourceName] });
      if (toast) {
        if (data.success) {
          toast(`${data.created} records imported successfully.`, 'success');
        } else {
          toast(`Import completed with ${data.errors.length} error(s). ${data.created} records created.`, 'warning');
        }
      }
    },
    onError: (err) => {
      if (toast) toast(err.message || 'Import failed', 'error');
    },
  });
}
