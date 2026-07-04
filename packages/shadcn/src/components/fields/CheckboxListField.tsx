import React from 'react';
import { Controller } from 'react-hook-form';
import type { FieldInputProps, FieldDisplayProps } from './types.js';

export function CheckboxListInput({ field, control, isLoading }: FieldInputProps) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange } }) => {
        const activeList = Array.isArray(value) ? value : [];
        const handleCheckboxChange = (opt: string, checked: boolean) => {
          if (checked) {
            onChange([...activeList, opt]);
          } else {
            onChange(activeList.filter((x: string) => x !== opt));
          }
        };
        return (
          <div className="flex flex-col gap-2 mt-1">
            {field.options?.map((opt) => (
              <label key={opt} className="inline-flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={activeList.includes(opt)}
                  disabled={field.isDisabled || isLoading}
                  onChange={(e) => handleCheckboxChange(opt, e.target.checked)}
                  className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                />
                {opt}
              </label>
            ))}
          </div>
        );
      }}
    />
  );
}

export function CheckboxListDisplay({ value }: FieldDisplayProps) {
  if (!Array.isArray(value) || value.length === 0) return <>-</>;
  return (
    <div className="flex flex-wrap gap-1">
      {value.map((x: string) => (
        <span
          key={x}
          className="bg-slate-100 text-slate-800 text-xs px-2 py-0.5 rounded border border-slate-200 font-medium"
        >
          {x}
        </span>
      ))}
    </div>
  );
}
