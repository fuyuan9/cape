// @vitest-environment jsdom
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AdminContext } from '@fuyuan9/cape-react';
import { ResourceList } from '../src/components/ResourceList.js';
import { SerializedResource } from '@fuyuan9/cape-react';

const mockResource: SerializedResource = {
  name: 'users',
  label: 'Users',
  primaryKey: 'id',
  table: {
    columns: [{ name: 'name', type: 'text', isSortable: true, isSearchable: true, isFilterable: true }],
  },
  form: {
    fields: [{ name: 'name', type: 'text', isRequired: true, isEmail: false, isReadonly: false, isDisabled: false }],
  },
  actions: [{ name: 'activate', label: 'Activate' }],
};

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

describe('ResourceList Component Tests', () => {
  it('renders custom action buttons and triggers useResourceAction', async () => {
    const listData = {
      data: [{ id: '1', name: 'John Doe' }],
      total: 1,
      page: 1,
      pageSize: 10,
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(listData),
    });

    render(
      <ResourceList
        resource={mockResource}
        onCreate={vi.fn()}
        onEdit={vi.fn()}
        onShow={vi.fn()}
        onDuplicate={vi.fn()}
      />,
      { wrapper: createWrapper() }
    );

    // Wait for the data to load
    await waitFor(() => expect(screen.getByText('John Doe')).toBeTruthy());

    // Check if the "Activate" action button is rendered
    const actionBtn = screen.getByRole('button', { name: 'Activate' });
    expect(actionBtn).toBeTruthy();

    // Click it and check action fetch call
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    fireEvent.click(actionBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost/api/users/1/actions/activate',
        expect.objectContaining({ method: 'POST' })
      );
    });
  });
});
