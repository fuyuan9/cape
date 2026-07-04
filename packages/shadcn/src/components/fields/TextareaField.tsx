import React from 'react';
import type { FieldInputProps, FieldDisplayProps } from './types.js';

export function TextareaInput({ field, register, isLoading }: FieldInputProps) {
  return (
    <textarea
      {...register(field.name)}
      disabled={field.isDisabled || isLoading}
      readOnly={field.isReadonly}
      className="rounded-md border border-slate-200 min-h-[100px] p-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 disabled:opacity-50"
    />
  );
}

export function TextareaDisplay({ value }: FieldDisplayProps) {
  return <>{String(value ?? '-')}</>;
}
