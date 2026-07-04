import React from 'react';
import type { FieldInputProps, FieldDisplayProps } from './types.js';

export function DateTimeInput({ field, register, isLoading }: FieldInputProps) {
  return (
    <input
      type={field.type === 'date' ? 'date' : 'datetime-local'}
      {...register(field.name)}
      disabled={field.isDisabled || isLoading}
      readOnly={field.isReadonly}
      className="rounded-md border border-slate-200 h-9 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 disabled:opacity-50"
    />
  );
}

export function DateTimeDisplay({ value }: FieldDisplayProps) {
  return <>{value ? new Date(value).toLocaleString() : '-'}</>;
}
