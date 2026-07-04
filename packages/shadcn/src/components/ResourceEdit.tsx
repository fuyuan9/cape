import React from 'react';
import { useResourceRecord, useResourceUpdate, SerializedResource } from '@cape/react';
import { ResourceForm } from './ResourceForm.js';
import { ErrorState } from './ui.js';

export interface ResourceEditProps {
  resource: SerializedResource;
  id: string | number;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ResourceEdit({ resource, id, onSuccess, onCancel }: ResourceEditProps) {
  const { data: recordData, isLoading, error, refetch } = useResourceRecord(resource.name, id);
  const updateMutation = useResourceUpdate(resource.name, id);

  const handleSubmit = async (data: any) => {
    await updateMutation.mutateAsync(data);
    onSuccess();
  };

  if (isLoading) {
    return <div className="text-sm text-slate-500 p-4">Loading record details...</div>;
  }

  if (error || !recordData?.data) {
    return <ErrorState error={error || 'Record not found'} onRetry={refetch} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900">
          Edit {resource.label} (#{id})
        </h2>
      </div>
      <ResourceForm
        resource={resource}
        initialData={recordData.data}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        isLoading={updateMutation.isPending}
      />
    </div>
  );
}
