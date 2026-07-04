import React from 'react';
import type { FieldInputProps, FieldDisplayProps } from './types.js';

export function ColorPickerInput({ field, register, isLoading }: FieldInputProps) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        {...register(field.name)}
        disabled={field.isDisabled || isLoading}
        className="w-10 h-10 border border-slate-200 rounded cursor-pointer p-0.5"
      />
      <input
        type="text"
        {...register(field.name)}
        disabled={field.isDisabled || isLoading}
        placeholder="#000000"
        className="rounded-md border border-slate-200 h-9 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 w-32 font-mono"
      />
    </div>
  );
}

export function ColorPickerDisplay({ value }: FieldDisplayProps) {
  if (!value) return <>-</>;
  return (
    <div className="flex items-center gap-2">
      <span className="w-4 h-4 rounded border border-slate-300" style={{ backgroundColor: String(value) }} />
      <span className="font-mono text-xs">{String(value)}</span>
    </div>
  );
}
