import React from 'react';
import { useResourceCreate, SerializedResource } from '@cape/react';
import { ResourceForm } from './ResourceForm.js';

export interface ResourceCreateProps {
  resource: SerializedResource;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ResourceCreate({ resource, onSuccess, onCancel }: ResourceCreateProps) {
  const createMutation = useResourceCreate(resource.name);

  const handleSubmit = async (data: any) => {
    await createMutation.mutateAsync(data);
    onSuccess();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900">Create {resource.label}</h2>
      </div>
      <ResourceForm
        resource={resource}
        onSubmit={handleSubmit}
        onCancel={onCancel}
        isLoading={createMutation.isPending}
      />
    </div>
  );
}
