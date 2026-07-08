import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { generateZodSchema } from '@fuyuan9/cape-core';
import { SerializedResource } from '@fuyuan9/cape-react';
import { Button } from './ui.js';
import * as Icons from 'lucide-react';
import { renderFieldInput } from './fields/index.js';
import { ParentRecordContext } from './fields/types.js';

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

  const parentId = initialData?.[resource.primaryKey];

  return (
    <ParentRecordContext.Provider value={{ id: parentId, record: initialData }}>
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

                {/* Render field input via registry */}
                {renderFieldInput(field, register, control, isLoading)}

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
    </ParentRecordContext.Provider>
  );
}
