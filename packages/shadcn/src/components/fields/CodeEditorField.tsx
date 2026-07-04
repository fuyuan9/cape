import React from 'react';
import type { FieldInputProps, FieldDisplayProps } from './types.js';

export function CodeEditorInput({ field, register, isLoading }: FieldInputProps) {
  return (
    <textarea
      {...register(field.name)}
      disabled={field.isDisabled || isLoading}
      readOnly={field.isReadonly}
      placeholder={`// Enter code here (language: ${field.language || 'text'})`}
      className="rounded-md border border-slate-200 min-h-[150px] p-3 text-xs font-mono bg-slate-950 text-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-700 disabled:opacity-50"
    />
  );
}

export function CodeEditorDisplay({ value }: FieldDisplayProps) {
  return <>{String(value ?? '-')}</>;
}
