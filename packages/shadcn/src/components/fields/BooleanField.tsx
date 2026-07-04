import React from 'react';
import { Controller } from 'react-hook-form';
import type { FieldInputProps, FieldDisplayProps } from './types.js';

export function BooleanInput({ field, control, isLoading }: FieldInputProps) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange } }) => (
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={field.isDisabled || isLoading}
            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
          />
          <span className="text-sm text-slate-600">Active / True</span>
        </div>
      )}
    />
  );
}

export function BooleanDisplay({ value }: FieldDisplayProps) {
  return <>{value ? 'Yes' : 'No'}</>;
}
