import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { generateZodSchema } from '@cape/core';
import { SerializedResource, useFileUpload } from '@cape/react';
import { Button } from './ui.js';
import * as Icons from 'lucide-react';

export interface ResourceFormProps {
  resource: SerializedResource;
  initialData?: any;
  onSubmit: (data: any) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

const renderFieldIcon = (iconName?: string) => {
  if (!iconName) return null;
  const IconComp = (Icons as any)[iconName] || (Icons as any)[iconName.charAt(0).toUpperCase() + iconName.slice(1)];
  if (!IconComp) return null;
  return <IconComp className="h-3.5 w-3.5 mr-1 inline-block align-text-bottom text-slate-400" />;
};

export function ResourceForm({ resource, initialData, onSubmit, onCancel, isLoading }: ResourceFormProps) {
  const uploadMutation = useFileUpload();

  // Generate client-side Zod validation schema dynamically from metadata fields!
  const validationSchema = generateZodSchema(resource.form.fields as any);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(validationSchema),
    defaultValues: initialData || {},
  });

  // Reset values when initialData changes
  useEffect(() => {
    if (initialData) {
      // Format date fields appropriately for input elements
      const formatted = { ...initialData };
      for (const field of resource.form.fields) {
        if ((field.type === 'date' || field.type === 'datetime') && initialData[field.name]) {
          const dateObj = new Date(initialData[field.name]);
          if (!isNaN(dateObj.getTime())) {
            formatted[field.name] = dateObj.toISOString().slice(0, field.type === 'date' ? 10 : 16);
          }
        }
      }
      reset(formatted);
    }
  }, [initialData, reset, resource.form.fields]);

  const handleFormSubmit = async (data: any) => {
    try {
      await onSubmit(data);
    } catch (err: any) {
      // Handle server validation error format from Hono if any
      if (err.message && typeof err.message === 'string') {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed.errors) {
            for (const [key, errorObj] of Object.entries(parsed.errors)) {
              const message = (errorObj as any)._errors?.join(', ') || 'Invalid value';
              setError(key as any, { type: 'server', message });
            }
            return;
          }
        } catch {
          // ignore parsing error
        }
      }
      setError('root', { type: 'server', message: err.message || 'Operation failed' });
    }
  };

  return (
    <form
      onSubmit={handleSubmit(handleFormSubmit)}
      className="space-y-6 bg-white p-6 rounded-lg border border-slate-200 shadow-sm"
    >
      {errors.root && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-600 rounded text-sm font-medium">
          {errors.root.message}
        </div>
      )}

      <div className="space-y-4">
        {resource.form.fields.map((field) => {
          const hasError = !!errors[field.name];
          const errorMessage = errors[field.name]?.message as string | undefined;

          return (
            <div key={field.name} className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700">
                {field.label || field.name.charAt(0).toUpperCase() + field.name.slice(1)}
                {field.isRequired && <span className="text-red-500 ml-0.5">*</span>}
              </label>

              {field.helperTextAbove && (
                <p className="text-xs text-slate-500 font-normal -mt-0.5 mb-0.5">
                  {renderFieldIcon(field.helperTextAboveIcon)}
                  {field.helperTextAbove}
                </p>
              )}

              {/* Render field inputs depending on type */}
              {field.type === 'textarea' ? (
                <textarea
                  {...register(field.name)}
                  disabled={field.isDisabled || isLoading}
                  readOnly={field.isReadonly}
                  className="rounded-md border border-slate-200 min-h-[100px] p-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 disabled:opacity-50"
                />
              ) : field.type === 'fileUpload' ? (
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
                      value &&
                      (/\.(jpeg|jpg|gif|png|webp|svg)/i.test(String(value)) || String(value).startsWith('data:image/'));

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

                        {uploadMutation.isPending && (
                          <p className="text-xs text-slate-500 animate-pulse">Uploading file...</p>
                        )}

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
              ) : field.type === 'select' ? (
                <select
                  {...register(field.name)}
                  disabled={field.isDisabled || isLoading}
                  className="rounded-md border border-slate-200 h-9 px-2 text-sm bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 disabled:opacity-50"
                >
                  <option value="">Select option...</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.type === 'boolean' ? (
                <Controller
                  name={field.name}
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={!!value}
                        onChange={(e) => onChange(e.target.checked)}
                        disabled={field.isDisabled || isLoading}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-4 w-4"
                      />
                      <span className="text-sm text-slate-600">Active / True</span>
                    </div>
                  )}
                />
              ) : field.type === 'date' || field.type === 'datetime' ? (
                <input
                  type={field.type === 'date' ? 'date' : 'datetime-local'}
                  {...register(field.name)}
                  disabled={field.isDisabled || isLoading}
                  readOnly={field.isReadonly}
                  className="rounded-md border border-slate-200 h-9 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 disabled:opacity-50"
                />
              ) : (
                <input
                  type={field.type === 'number' ? 'number' : 'text'}
                  {...register(field.name, { valueAsNumber: field.type === 'number' })}
                  disabled={field.isDisabled || isLoading}
                  readOnly={field.isReadonly}
                  className="rounded-md border border-slate-200 h-9 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 disabled:opacity-50"
                />
              )}

              {(field.helperTextBelow || field.description) && (
                <p className="text-xs text-slate-400 mt-1">
                  {renderFieldIcon(field.helperTextBelowIcon)}
                  {field.helperTextBelow || field.description}
                </p>
              )}

              {hasError && <p className="text-xs text-red-500 font-medium">{errorMessage}</p>}
            </div>
          );
        })}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
