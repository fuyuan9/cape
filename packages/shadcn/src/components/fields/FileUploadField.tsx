import React from 'react';
import { Controller } from 'react-hook-form';
import { useFileUpload } from '@cape/react';
import { Button } from '../ui.js';
import type { FieldInputProps, FieldDisplayProps } from './types.js';

export function FileUploadInput({ field, control, isLoading }: FieldInputProps) {
  const uploadMutation = useFileUpload();

  return (
    <Controller
      name={field.name}
      control={control}
      render={({ field: { value, onChange } }) => {
        const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
          const file = e.target.files?.[0];
          if (!file) return;
          try {
            const res = await uploadMutation.mutateAsync(file);
            onChange(res.url);
          } catch (err: any) {
            alert(err.message || 'File upload failed');
          }
        };

        const isImage =
          value && (/\.(jpeg|jpg|gif|png|webp|svg)/i.test(String(value)) || String(value).startsWith('data:image/'));

        return (
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <input
                type="file"
                disabled={field.isDisabled || isLoading || uploadMutation.isPending}
                onChange={handleFileChange}
                className="text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800 disabled:opacity-50 cursor-pointer"
              />
              {value && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                  onClick={() => onChange('')}
                  disabled={field.isDisabled || isLoading}
                >
                  Clear
                </Button>
              )}
            </div>

            {uploadMutation.isPending && <p className="text-xs text-slate-500 animate-pulse">Uploading file...</p>}

            {value && (
              <div className="mt-2">
                {isImage ? (
                  <img
                    src={value}
                    alt="Preview"
                    className="max-h-32 rounded border border-slate-200 object-contain bg-slate-50 p-1"
                  />
                ) : (
                  <a
                    href={value}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline break-all"
                  >
                    {value}
                  </a>
                )}
              </div>
            )}
          </div>
        );
      }}
    />
  );
}

export function FileUploadDisplay({ field, value }: FieldDisplayProps) {
  if (!value) return <>-</>;

  const isImage = /\.(jpeg|jpg|gif|png|webp|svg)/i.test(String(value)) || String(value).startsWith('data:image/');

  return isImage ? (
    <img src={value} alt={field.name} className="max-h-48 rounded border border-slate-200 object-contain" />
  ) : (
    <a href={value} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
      View File
    </a>
  );
}
