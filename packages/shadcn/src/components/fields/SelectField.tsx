import React from 'react';
import type { FieldInputProps, FieldDisplayProps } from './types.js';

export function SelectInput({ field, register, isLoading }: FieldInputProps) {
  return (
    <select
      {...register(field.name)}
      disabled={field.isDisabled || isLoading}
      className="rounded-md border border-slate-200 h-9 px-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 disabled:opacity-50"
    >
      <option value="">Select option...</option>
      {field.options?.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

export function SelectDisplay({ value }: FieldDisplayProps) {
  return <>{String(value ?? '-')}</>;
}
