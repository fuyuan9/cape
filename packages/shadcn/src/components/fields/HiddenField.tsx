import React from 'react';
import type { FieldInputProps, FieldDisplayProps } from './types.js';

export function HiddenInput({ field, register }: FieldInputProps) {
  return <input type="hidden" {...register(field.name)} />;
}

export function HiddenDisplay() {
  return <span className="text-xs text-slate-400 italic">(Hidden Field)</span>;
}
