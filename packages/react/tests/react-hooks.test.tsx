// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminContext, useAdminMetadata, useResourceAction } from '../src/index.js';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <AdminContext.Provider value={{ apiUri: 'http://localhost/api', toast: vi.fn() }}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </AdminContext.Provider>
  );
};

describe('React Hooks Unit Tests', () => {
  it('useAdminMetadata fetches successfully', async () => {
    const mockResources = [{ name: 'users', label: 'Users' }];
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ resources: mockResources }),
    });

    const { result } = renderHook(() => useAdminMetadata(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.resources).toEqual(mockResources);
  });

  it('useResourceAction mutation executes action', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, message: 'Activated' }),
    });

    const { result } = renderHook(() => useResourceAction('users'), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ id: 1, actionName: 'activate' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual({ success: true, message: 'Activated' });
    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost/api/users/1/actions/activate',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
