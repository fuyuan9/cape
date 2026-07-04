import React from 'react';
import { Controller } from 'react-hook-form';
import { Button } from '../ui.js';
import type { FieldInputProps, FieldDisplayProps } from './types.js';

export function RepeaterInput({ field, control, isLoading }: FieldInputProps) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange } }) => {
        const rows = Array.isArray(value) ? value : [];
        const addRow = () => {
          onChange([...rows, {}]);
        };
        const removeRow = (index: number) => {
          onChange(rows.filter((_: any, i: number) => i !== index));
        };
        const updateRowField = (index: number, fName: string, fVal: any) => {
          const updated = [...rows];
          updated[index] = { ...updated[index], [fName]: fVal };
          onChange(updated);
        };

        return (
          <div className="space-y-3 p-3 bg-slate-50 rounded-md border border-slate-200">
            {rows.map((row: any, index: number) => (
              <div key={index} className="p-3 bg-white border border-slate-100 rounded shadow-sm relative space-y-3">
                <button
                  type="button"
                  onClick={() => removeRow(index)}
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 text-xs font-bold"
                >
                  Remove
                </button>
                <div className="grid grid-cols-2 gap-3 pt-4">
                  {field.repeaterFields?.map((subField) => (
                    <div key={subField.name} className="flex flex-col gap-1">
                      <span className="text-xs font-medium text-slate-500">{subField.label || subField.name}</span>
                      <input
                        type="text"
                        value={row[subField.name] || ''}
                        onChange={(e) => updateRowField(index, subField.name, e.target.value)}
                        disabled={field.isDisabled || isLoading}
                        className="rounded border border-slate-200 h-8 px-2 text-xs focus:outline-none focus:ring-1 focus:ring-slate-900"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={field.isDisabled || isLoading}>
              + Add Row
            </Button>
          </div>
        );
      }}
    />
  );
}

export function RepeaterDisplay({ value }: FieldDisplayProps) {
  if (!Array.isArray(value)) return <>-</>;
  return <span className="text-xs text-slate-500 font-medium">{value.length} row(s)</span>;
}
