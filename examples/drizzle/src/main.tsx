import React from 'react';
import ReactDOM from 'react-dom/client';
import { AdminProvider } from '@fuyuan9/cape-react';
import { ResourcePage } from '@fuyuan9/cape-shadcn';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <AdminProvider apiUri="/admin/api">
        <ResourcePage />
      </AdminProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
