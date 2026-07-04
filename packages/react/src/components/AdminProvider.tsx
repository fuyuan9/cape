import React, { ReactNode } from 'react';
import { AdminContext } from '../hooks/useAdmin.js';

export interface AdminProviderProps {
  apiUri: string;
  children: ReactNode;
}

export function AdminProvider({ apiUri, children }: AdminProviderProps) {
  return <AdminContext.Provider value={{ apiUri }}>{children}</AdminContext.Provider>;
}
