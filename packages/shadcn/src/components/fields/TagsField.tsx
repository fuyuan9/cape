import React from 'react';
import { Controller } from 'react-hook-form';
import type { FieldInputProps, FieldDisplayProps } from './types.js';

function TagsInputInner({
  value,
  onChange,
  disabled,
}: {
  value: any;
  onChange: (v: string[]) => void;
  disabled?: boolean;
}) {
  const [tagInput, setTagInput] = React.useState('');
  const tags: string[] = Array.isArray(value) ? value : [];
  const addTag = () => {
    const trimmed = tagInput.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange([...tags, trimmed]);
    }
    setTagInput('');
  };
  const removeTag = (tag: string) => {
    onChange(tags.filter((t: string) => t !== tag));
  };
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' }}>
        {tags.map((tag: string) => (
          <span
            key={tag}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor: 'hsl(var(--muted))',
              fontSize: '0.75rem',
            }}
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              style={{ cursor: 'pointer', border: 'none', background: 'none', padding: 0, fontSize: '0.75rem' }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        type="text"
        value={tagInput}
        onChange={(e) => setTagInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            addTag();
          }
        }}
        placeholder="Type and press Enter to add"
        disabled={disabled}
        className="cape-input"
        style={{ width: '100%', padding: '6px 12px', borderRadius: '6px', border: '1px solid hsl(var(--border))' }}
      />
    </div>
  );
}

export function TagsInput({ field, control, isLoading }: FieldInputProps) {
  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange } }) => (
        <TagsInputInner value={value} onChange={onChange} disabled={field.isDisabled || isLoading} />
      )}
    />
  );
}

export function TagsDisplay({ value }: FieldDisplayProps) {
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
