import React from 'react';
import { Controller } from 'react-hook-form';
import type { FieldInputProps, FieldDisplayProps } from './types.js';

export function RadioInput({ field, control, isLoading }: FieldInputProps) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange } }) => (
        <div className="flex flex-col gap-2 mt-1">
          {field.options?.map((opt) => (
            <label key={opt} className="inline-flex items-center gap-2 text-sm text-slate-700">
              <input
                type="radio"
                name={field.name}
                value={opt}
                checked={value === opt}
                disabled={field.isDisabled || isLoading}
                onChange={() => onChange(opt)}
                className="border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
              />
              {opt}
            </label>
          ))}
        </div>
      )}
    />
  );
}

export function RadioDisplay({ value }: FieldDisplayProps) {
  return <>{String(value ?? '-')}</>;
}
