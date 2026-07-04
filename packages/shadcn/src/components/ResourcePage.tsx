import React, { useState, useEffect } from 'react';
import { useAdminMetadata, SerializedResource } from '@cape/react';
import { ResourceList } from './ResourceList.js';
import { ResourceCreate } from './ResourceCreate.js';
import { ResourceEdit } from './ResourceEdit.js';
import { ResourceShow } from './ResourceShow.js';
import { LayoutDashboard, Database, ChevronRight } from 'lucide-react';

export function ResourcePage() {
  const { data: metaData, isLoading, error } = useAdminMetadata();
  const [selectedResourceName, setSelectedResourceName] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'show'>('list');
  const [selectedId, setSelectedId] = useState<string | number | null>(null);

  const activeResource =
    metaData?.resources.find((r) => r.name === selectedResourceName) || metaData?.resources[0] || null;

  const selectResource = (res: SerializedResource) => {
    setSelectedResourceName(res.name);
    setView('list');
    setSelectedId(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-500 font-medium">
        Loading admin console...
      </div>
    );
  }

  if (error || !metaData) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center">
        <h2 className="text-xl font-bold text-red-600 mb-2">Failed to initialize Admin Console</h2>
        <p className="text-sm text-slate-500">{error?.message || 'Please check your backend connection.'}</p>
      </div>
    );
  }

  const { resources } = metaData;

  return (
    <div className="flex min-h-screen bg-slate-50/50">
      {/* Sidebar */}
      <aside className="w-64 bg-slate-900 text-slate-300 border-r border-slate-800 flex flex-col shrink-0">
        <div className="h-16 flex items-center px-6 border-b border-slate-800 gap-2">
          <Database className="h-5 w-5 text-white" />
          <span className="font-bold text-white text-base tracking-tight">Cape</span>
        </div>
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider px-2 mb-2">Resources</div>
          {resources
            .filter((res) => !res.parent)
            .map((res) => {
              const isSelected = activeResource?.name === res.name;
              return (
                <button
                  key={res.name}
                  onClick={() => selectResource(res)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-md transition-colors font-medium ${
                    isSelected ? 'bg-slate-800 text-white' : 'hover:bg-slate-800/50 hover:text-white text-slate-400'
                  }`}
                >
                  <span>{res.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 opacity-60" />
                </button>
              );
            })}
        </nav>
      </aside>

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 shadow-sm">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4 text-slate-400" />
            <span className="text-sm font-semibold text-slate-500">Dashboard</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-bold text-slate-900">{activeResource?.label || 'Loading...'}</span>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-8 overflow-y-auto">
          {activeResource && (
            <div className="max-w-6xl mx-auto">
              {view === 'list' && (
                <ResourceList
                  resource={activeResource}
                  onCreate={() => setView('create')}
                  onEdit={(id) => {
                    setSelectedId(id);
                    setView('edit');
                  }}
                  onShow={(id) => {
                    setSelectedId(id);
                    setView('show');
                  }}
                />
              )}
              {view === 'create' && (
                <ResourceCreate
                  resource={activeResource}
                  onSuccess={() => setView('list')}
                  onCancel={() => setView('list')}
                />
              )}
              {view === 'edit' && selectedId !== null && (
                <ResourceEdit
                  resource={activeResource}
                  id={selectedId}
                  onSuccess={() => setView('list')}
                  onCancel={() => setView('list')}
                />
              )}
              {view === 'show' && selectedId !== null && (
                <ResourceShow resource={activeResource} id={selectedId} onBack={() => setView('list')} />
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
