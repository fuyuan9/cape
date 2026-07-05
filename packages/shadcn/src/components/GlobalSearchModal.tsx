import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, Loader2, FileText, CornerDownLeft } from 'lucide-react';
import { useGlobalSearch } from '@fuyuan9/cape-react';

export interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (resourceName: string, view: 'list' | 'create' | 'edit' | 'show', id: string | number) => void;
}

export function GlobalSearchModal({ isOpen, onClose, onNavigate }: GlobalSearchModalProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce query input to avoid hammering the database
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 250);
    return () => clearTimeout(handler);
  }, [query]);

  const { data, isLoading } = useGlobalSearch(debouncedQuery);
  const results = useMemo(() => data?.results || [], [data?.results]);

  // Handle outside click to close
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Auto-focus input when opened
      setTimeout(() => inputRef.current?.focus(), 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  // Handle keyboard events (Arrows, Enter, Escape)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      } else if (event.key === 'ArrowDown') {
        event.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev + 1) % results.length : 0));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setSelectedIndex((prev) => (results.length > 0 ? (prev - 1 + results.length) % results.length : 0));
      } else if (event.key === 'Enter') {
        event.preventDefault();
        if (results[selectedIndex]) {
          const selected = results[selectedIndex];
          onNavigate(selected.resourceName, 'show', selected.id);
          onClose();
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onNavigate, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-slate-900/60 backdrop-blur-sm">
      <div
        ref={modalRef}
        className="w-full max-w-2xl bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[60vh] animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Search Input Area */}
        <div className="flex items-center px-4 border-b border-slate-200 h-14 shrink-0">
          <Search className="h-5 w-5 text-slate-400 mr-3" />
          <input
            ref={inputRef}
            type="text"
            placeholder="Type search terms or natural language queries..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="flex-1 bg-transparent border-0 outline-none text-slate-800 text-sm placeholder-slate-400 focus:ring-0 w-full"
          />
          {isLoading && <Loader2 className="h-4 w-4 text-[var(--cape-primary,#4f46e5)] animate-spin ml-2" />}
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-2">
          {!query ? (
            <div className="py-12 text-center text-slate-400 text-sm">Type to search across all resources...</div>
          ) : results.length === 0 && !isLoading ? (
            <div className="py-12 text-center text-slate-400 text-sm">No results found for &quot;{query}&quot;</div>
          ) : (
            <div className="space-y-0.5">
              {results.map((item: any, index: number) => {
                const isSelected = index === selectedIndex;
                const scorePercentage = item.score !== undefined ? `${(item.score * 100).toFixed(0)}% match` : null;

                return (
                  <div
                    key={`${item.resourceName}-${item.id}`}
                    onClick={() => {
                      onNavigate(item.resourceName, 'show', item.id);
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-colors ${
                      isSelected ? 'bg-[var(--cape-primary,#4f46e5)] text-white' : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className={`h-4 w-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-400'}`} />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold truncate leading-5">{item.title}</div>
                        {item.subtitle && (
                          <div className={`text-xs truncate mt-0.5 ${isSelected ? 'text-white/80' : 'text-slate-400'}`}>
                            {item.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {scorePercentage && (
                        <span
                          className={`text-[10px] px-1.5 py-0.5 rounded font-bold tracking-wide uppercase ${
                            isSelected ? 'bg-white/20 text-white' : 'bg-indigo-50 text-indigo-600'
                          }`}
                        >
                          {scorePercentage}
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {item.resourceName}
                      </span>
                      {isSelected && <CornerDownLeft className="h-3 w-3 text-white/80" />}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Shortcut Instructions */}
        <div className="h-10 border-t border-slate-100 bg-slate-50 px-4 flex items-center justify-between text-[10px] text-slate-400 shrink-0 font-medium">
          <div className="flex items-center gap-3">
            <span>
              Use <kbd className="bg-white border px-1 rounded shadow-xs font-mono font-bold">↑↓</kbd> to navigate
            </span>
            <span>
              <kbd className="bg-white border px-1 rounded shadow-xs font-mono font-bold">Enter</kbd> to select
            </span>
          </div>
          <span>
            <kbd className="bg-white border px-1 rounded shadow-xs font-mono font-bold">ESC</kbd> to close
          </span>
        </div>
      </div>
    </div>
  );
}
