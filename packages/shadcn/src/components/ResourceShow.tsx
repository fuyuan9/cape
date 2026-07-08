import React from 'react';
import {
  useResourceRecord,
  SerializedResource,
  useAdminMetadata,
  useResourceList,
  useResourceCreate,
  useResourceUpdate,
  useResourceDelete,
  useResourceAction,
} from '@fuyuan9/cape-react';
import { Button, ErrorState } from './ui.js';
import { ResourceForm } from './ResourceForm.js';
import { renderFieldDisplay } from './fields/index.js';
import { ParentRecordContext } from './fields/types.js';

export interface ResourceShowProps {
  resource: SerializedResource;
  id: string | number;
  onBack: () => void;
}

export function ResourceShow({ resource, id, onBack }: ResourceShowProps) {
  const { data: recordData, isLoading, error, refetch } = useResourceRecord(resource.name, id);
  const { data: metaData } = useAdminMetadata();
  const runAction = useResourceAction(resource.name);

  if (isLoading) {
    return <div className="text-sm text-slate-500 p-4">Loading record details...</div>;
  }

  if (error || !recordData?.data) {
    return <ErrorState error={error || 'Record not found'} onRetry={refetch} />;
  }

  const record = recordData.data;
  const childResources = metaData?.resources.filter((r) => r.parent === resource.name) || [];

  return (
    <ParentRecordContext.Provider value={{ id, record }}>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-slate-900">
            Show {resource.label} (#{id})
          </h2>
          <div className="flex items-center gap-2">
            {resource.actions?.map((act) => (
              <Button
                key={act.name}
                variant="outline"
                size="sm"
                onClick={() => runAction.mutate({ id, actionName: act.name })}
                disabled={runAction.isPending}
              >
                {act.label || act.name}
              </Button>
            ))}
            <Button variant="outline" onClick={onBack}>
              Back to List
            </Button>
          </div>
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
      </div>
    </ParentRecordContext.Provider>
  );
}
