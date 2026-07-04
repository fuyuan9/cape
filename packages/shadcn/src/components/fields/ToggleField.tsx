import React from 'react';
import { Controller } from 'react-hook-form';
import type { FieldInputProps, FieldDisplayProps } from './types.js';

export function ToggleInput({ field, control, isLoading }: FieldInputProps) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange } }) => (
        <label className="relative inline-flex items-center cursor-pointer select-none">
          <input
            type="checkbox"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
            disabled={field.isDisabled || isLoading}
            className="sr-only peer"
          />
          <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-slate-950"></div>
          <span className="ml-2 text-sm text-slate-600">{value ? 'ON' : 'OFF'}</span>
        </label>
      )}
    />
  );
}

export function ToggleDisplay({ value }: FieldDisplayProps) {
  return <>{value ? 'Yes' : 'No'}</>;
}
