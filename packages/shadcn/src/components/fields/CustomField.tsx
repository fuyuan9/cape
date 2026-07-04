import React from 'react';
import type { FieldInputProps, FieldDisplayProps } from './types.js';

export function CustomInput({ field }: FieldInputProps) {
  return (
    <div className="p-3 bg-slate-50 border border-dashed border-slate-300 rounded text-center text-xs text-slate-500">
      [Custom Field: {field.customRender || 'No Renderer specified'}]
    </div>
  );
}

export function CustomDisplay({ value }: FieldDisplayProps) {
  return <>{String(value ?? '-')}</>;
}
