import React, { useState } from 'react';
import {
  useAdminMetadata,
  useResourceList,
  useResourceCreate,
  useResourceUpdate,
  useResourceDelete,
} from '@fuyuan9/cape-react';
import { Button } from '../ui.js';
import { ResourceForm } from '../ResourceForm.js';
import { useParentRecord } from './types.js';
import type { FieldInputProps, FieldDisplayProps } from './types.js';

export function HasManyInput({ field }: FieldInputProps) {
  const { id: parentId } = useParentRecord();

  if (!parentId) {
    return (
      <div className="text-xs text-slate-400 italic p-2 border border-dashed border-slate-200 rounded bg-slate-50/50">
        You can add related {field.label || field.name} after saving this record.
      </div>
    );
  }

  return <HasManyManager field={field} parentId={parentId} />;
}

export function HasManyDisplay({ field }: FieldDisplayProps) {
  const { id: parentId } = useParentRecord();

  if (!parentId) {
    return <div className="text-xs text-slate-400">-</div>;
  }

  return <HasManyManager field={field} parentId={parentId} />;
}

function HasManyManager({ field, parentId }: { field: any; parentId: string | number }) {
  const childResourceName = field.relationResourceName || '';
  const { data: metaData, isLoading: isMetaLoading } = useAdminMetadata();

  const childResource = metaData?.resources.find((r) => r.name === childResourceName);

  if (isMetaLoading) {
    return <div className="text-xs text-slate-500 p-2">Loading relation metadata...</div>;
  }

  if (!childResource) {
    return <div className="text-xs text-red-500 p-2">Relation resource &quot;{childResourceName}&quot; not found</div>;
  }

  // The childResource has a parent property that links it to the parent resource.
  return (
    <RelationManager
      parentResourceName={childResource.parent || ''}
      parentId={parentId}
      childResource={childResource}
    />
  );
}

interface RelationManagerProps {
  parentResourceName: string;
  parentId: string | number;
  childResource: any;
}

function RelationManager({ parentResourceName, parentId, childResource }: RelationManagerProps) {
  const nestedResourceName = `${parentResourceName}/${parentId}/${childResource.name}`;
  const [page, setPage] = useState(1);
  const { data: listData, isLoading, refetch } = useResourceList(nestedResourceName, { page, pageSize: 5 });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);

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
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden mt-2">
      <div className="px-4 py-3 sm:px-6 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-semibold leading-6 text-slate-900">{childResource.label}</h3>
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
                {childResource.table.columns.map((col: any) => (
                  <th key={col.name} className="p-3 text-xs font-semibold text-slate-600">
                    {col.name.charAt(0).toUpperCase() + col.name.slice(1)}
                  </th>
                ))}
                <th className="p-3 text-xs font-semibold text-slate-600 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any) => {
                const id = item[childResource.primaryKey];
                return (
                  <tr key={id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50/30">
                    {childResource.table.columns.map((col: any) => {
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
