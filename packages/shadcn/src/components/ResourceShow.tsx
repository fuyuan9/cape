import React from 'react';
import {
  useResourceRecord,
  SerializedResource,
  useAdminMetadata,
  useResourceList,
  useResourceCreate,
  useResourceUpdate,
  useResourceDelete,
} from '@cape/react';
import { Button, ErrorState } from './ui.js';
import { ResourceForm } from './ResourceForm.js';
import { renderFieldDisplay } from './fields/index.js';

export interface ResourceShowProps {
  resource: SerializedResource;
  id: string | number;
  onBack: () => void;
}

export function ResourceShow({ resource, id, onBack }: ResourceShowProps) {
  const { data: recordData, isLoading, error, refetch } = useResourceRecord(resource.name, id);
  const { data: metaData } = useAdminMetadata();

  if (isLoading) {
    return <div className="text-sm text-slate-500 p-4">Loading record details...</div>;
  }

  if (error || !recordData?.data) {
    return <ErrorState error={error || 'Record not found'} onRetry={refetch} />;
  }

  const record = recordData.data;
  const childResources = metaData?.resources.filter((r) => r.parent === resource.name) || [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-900">
          Show {resource.label} (#{id})
        </h2>
        <Button variant="outline" onClick={onBack}>
          Back to List
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-5 sm:px-6 bg-slate-50 border-b border-slate-200">
          <h3 className="text-sm font-semibold leading-6 text-slate-900">Record Information</h3>
          <p className="mt-1 max-w-2d text-xs text-slate-500">Details and metadata values.</p>
        </div>
        <div className="border-t border-gray-100">
          <dl className="divide-y divide-gray-100">
            {resource.form.fields.map((field) => {
              const val = record[field.name];

              return (
                <div key={field.name} className="px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-slate-500">
                    {field.label || field.name.charAt(0).toUpperCase() + field.name.slice(1)}
                  </dt>
                  <dd className="mt-1 text-sm text-slate-900 sm:col-span-2 sm:mt-0">
                    {renderFieldDisplay(field, val)}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      </div>

      {childResources.map((child) => (
        <RelationManager key={child.name} parentResourceName={resource.name} parentId={id} childResource={child} />
      ))}
    </div>
  );
}

interface RelationManagerProps {
  parentResourceName: string;
  parentId: string | number;
  childResource: SerializedResource;
}

function RelationManager({ parentResourceName, parentId, childResource }: RelationManagerProps) {
  const nestedResourceName = `${parentResourceName}/${parentId}/${childResource.name}`;
  const [page, setPage] = React.useState(1);
  const { data: listData, isLoading, refetch } = useResourceList(nestedResourceName, { page, pageSize: 5 });

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editingRecord, setEditingRecord] = React.useState<any | null>(null);

  const createMutation = useResourceCreate(nestedResourceName);
  const updateMutation = useResourceUpdate(nestedResourceName, editingRecord?.[childResource.primaryKey] || '');
  const deleteMutation = useResourceDelete(nestedResourceName);

  const handleCreate = async (data: any) => {
    try {
      await createMutation.mutateAsync(data);
      setIsCreateOpen(false);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to create record');
    }
  };

  const handleUpdate = async (data: any) => {
    try {
      await updateMutation.mutateAsync(data);
      setEditingRecord(null);
      refetch();
    } catch (err: any) {
      alert(err.message || 'Failed to update record');
    }
  };

  const handleDelete = async (id: any) => {
    if (confirm('Are you sure you want to delete this item?')) {
      try {
        await deleteMutation.mutateAsync(id);
        refetch();
      } catch (err: any) {
        alert(err.message || 'Failed to delete record');
      }
    }
  };

  const items = listData?.data || [];

  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mt-8">
      <div className="px-4 py-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold leading-6 text-slate-900">{childResource.label}</h3>
          <p className="mt-1 text-xs text-slate-500">Manage {childResource.label} related to this record.</p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} size="sm">
          Add {childResource.label}
        </Button>
      </div>

      {isLoading ? (
        <div className="text-xs text-slate-500 p-4 text-center">Loading list...</div>
      ) : items.length === 0 ? (
        <div className="text-xs text-slate-500 p-8 text-center bg-slate-50/50">
          No {childResource.label.toLowerCase()} found.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-200">
                {childResource.table.columns.map((col) => (
                  <th key={col.name} className="p-3 text-xs font-semibold text-slate-600">
                    {col.name.charAt(0).toUpperCase() + col.name.slice(1)}
                  </th>
                ))}
                <th className="p-3 text-xs font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const id = item[childResource.primaryKey];
                return (
                  <tr key={id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/30">
                    {childResource.table.columns.map((col) => {
                      const val = item[col.name];
                      return (
                        <td key={col.name} className="p-3 text-xs text-slate-700">
                          {col.type === 'image' && val ? (
                            <img src={val} className="h-8 w-8 object-cover rounded" />
                          ) : (
                            String(val ?? '-')
                          )}
                        </td>
                      );
                    })}
                    <td className="p-3 text-right space-x-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setEditingRecord(item)}>
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-red-600 hover:text-red-700"
                        onClick={() => handleDelete(id)}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Creation and Edit Modals */}
      {(isCreateOpen || editingRecord) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-slate-900">
                {isCreateOpen ? `Add ${childResource.label}` : `Edit ${childResource.label}`}
              </h3>
              <button
                onClick={() => {
                  setIsCreateOpen(false);
                  setEditingRecord(null);
                }}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <ResourceForm
                resource={childResource}
                initialData={editingRecord || undefined}
                onSubmit={isCreateOpen ? handleCreate : handleUpdate}
                onCancel={() => {
                  setIsCreateOpen(false);
                  setEditingRecord(null);
                }}
                isLoading={createMutation.isPending || updateMutation.isPending}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
