import React from 'react';
import type { FieldInputProps, FieldDisplayProps } from './types.js';

/**
 * Default text/number input field.
 * Used as fallback for any field type that doesn't have a dedicated renderer.
 */
export function DefaultInput({ field, register, isLoading }: FieldInputProps) {
  return (
    <input
      type={field.type === 'number' ? 'number' : 'text'}
      step={field.type === 'number' ? 'any' : undefined}
      {...register(field.name, { valueAsNumber: field.type === 'number' })}
      disabled={field.isDisabled || isLoading}
      readOnly={field.isReadonly}
      className="rounded-md border border-slate-200 h-9 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 disabled:opacity-50"
    />
  );
}

export function DefaultDisplay({ value }: FieldDisplayProps) {
  return <>{String(value ?? '-')}</>;
}
