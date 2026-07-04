import React from 'react';
import { Controller } from 'react-hook-form';
import type { FieldInputProps, FieldDisplayProps } from './types.js';

export function ToggleButtonsInput({ field, control, isLoading }: FieldInputProps) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange } }) => (
        <div className="inline-flex rounded-md shadow-sm border border-slate-200 p-0.5 bg-slate-50 gap-0.5 w-max">
          {field.options?.map((opt) => {
            const isActive = value === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(opt)}
                disabled={field.isDisabled || isLoading}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                  isActive
                    ? 'bg-white shadow-sm border border-slate-200/50 text-slate-900 font-semibold'
                    : 'text-slate-500 hover:text-slate-900 border border-transparent'
                }`}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    />
  );
}

export function ToggleButtonsDisplay({ value }: FieldDisplayProps) {
  return <>{String(value ?? '-')}</>;
}
