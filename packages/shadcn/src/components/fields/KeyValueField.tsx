import React from 'react';
import { Controller } from 'react-hook-form';
import { Button } from '../ui.js';
import type { FieldInputProps, FieldDisplayProps } from './types.js';

export function KeyValueInput({ field, control, isLoading }: FieldInputProps) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange } }) => {
        const record = value && typeof value === 'object' ? value : {};
        const entries = Object.entries(record);
        const addEntry = () => {
          onChange({ ...record, '': '' });
        };
        const removeEntry = (key: string) => {
          const updated = { ...record };
          delete updated[key];
          onChange(updated);
        };
        const updateEntry = (oldKey: string, newKey: string, newVal: string) => {
          const updated = { ...record };
          if (oldKey !== newKey) {
            delete updated[oldKey];
          }
          updated[newKey] = newVal;
          onChange(updated);
        };

        return (
          <div className="space-y-2 p-3 bg-slate-50 rounded-md border border-slate-200">
            {entries.map(([key, val], idx) => (
              <div key={idx} className="flex gap-2 items-center">
                <input
                  type="text"
                  placeholder="Key"
                  defaultValue={key}
                  onBlur={(e) => updateEntry(key, e.target.value, String(val))}
                  className="rounded border border-slate-200 h-8 px-2 text-xs flex-1"
                />
                <input
                  type="text"
                  placeholder="Value"
                  value={String(val)}
                  onChange={(e) => updateEntry(key, key, e.target.value)}
                  className="rounded border border-slate-200 h-8 px-2 text-xs flex-1"
                />
                <button
                  type="button"
                  onClick={() => removeEntry(key)}
                  className="text-red-500 hover:text-red-700 text-xs font-bold px-1"
                >
                  Remove
                </button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addEntry}>
              + Add Entry
            </Button>
          </div>
        );
      }}
    />
  );
}

export function KeyValueDisplay({ value }: FieldDisplayProps) {
  if (!value || typeof value !== 'object') return <>-</>;
  return (
    <div className="text-xs bg-slate-50 p-2 rounded border border-slate-150 space-y-1 max-w-md">
      {Object.entries(value).map(([k, v]) => (
        <div key={k} className="flex">
          <span className="font-semibold text-slate-600 w-1/3 break-all">{k}:</span>
          <span className="text-slate-800 w-2/3 break-all">{String(v)}</span>
        </div>
      ))}
    </div>
  );
}
