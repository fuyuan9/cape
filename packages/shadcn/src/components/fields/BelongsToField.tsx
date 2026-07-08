import React, { useState, useEffect, useRef } from 'react';
import { Controller } from 'react-hook-form';
import { useRelationSearch } from '@fuyuan9/cape-react';
import type { FieldInputProps, FieldDisplayProps } from './types.js';

export function BelongsToInput({ field, control, isLoading }: FieldInputProps) {
  const resourceName = field.relationResourceName || '';
  const labelField = field.labelField || 'name';

  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedTerm, setDebouncedTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const { data, isLoading: isSearching } = useRelationSearch(resourceName, debouncedTerm, labelField);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = data?.results || [];

  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange } }) => {
        // Find selected item label if we have results
        const selectedItem = results.find((r) => String(r.id) === String(value));
        const displayLabel = selectedItem ? selectedItem.label : value ? `ID: ${value}` : '';

        return (
          <div ref={containerRef} className="relative w-full">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder={displayLabel || 'Search and select...'}
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setIsOpen(true);
                  }}
                  onFocus={() => setIsOpen(true)}
                  disabled={field.isReadonly || field.isDisabled || isLoading}
                  className="w-full rounded-md border border-slate-200 h-9 px-3 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 disabled:opacity-50"
                />
                {value && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange(null);
                      setSearchTerm('');
                    }}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {isOpen && (
              <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                {isSearching ? (
                  <div className="px-3 py-2 text-sm text-slate-500">Searching...</div>
                ) : results.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-slate-500">No results found</div>
                ) : (
                  <ul className="py-1">
                    {results.map((item) => (
                      <li
                        key={item.id}
                        onClick={() => {
                          onChange(item.id);
                          setSearchTerm('');
                          setIsOpen(false);
                        }}
                        className={`px-3 py-2 text-sm cursor-pointer hover:bg-slate-100 flex items-center justify-between ${
                          String(value) === String(item.id) ? 'bg-slate-50 font-medium' : ''
                        }`}
                      >
                        <span>{item.label}</span>
                        <span className="text-xs text-slate-400">ID: {item.id}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      }}
    />
  );
}

export function BelongsToDisplay({ value }: FieldDisplayProps) {
  return <>{value !== null && value !== undefined ? String(value) : '-'}</>;
}
