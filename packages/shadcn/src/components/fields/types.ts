import type { Control, UseFormRegister } from 'react-hook-form';
import type { SerializedField } from '@fuyuan9/cape-react';

export type { SerializedField };

/**
 * Props that every field form input renderer receives.
 */
export interface FieldInputProps {
  field: SerializedField;
  register: UseFormRegister<any>;
  control: Control<any>;
  isLoading?: boolean;
}

/**
 * Props that every field display renderer receives.
 */
export interface FieldDisplayProps {
  field: SerializedField;
  value: any;
}

import { createContext, useContext } from 'react';

export const ParentRecordContext = createContext<{
  id?: string | number;
  record?: any;
} | null>(null);

export function useParentRecord() {
  const ctx = useContext(ParentRecordContext);
  return ctx || {};
}
