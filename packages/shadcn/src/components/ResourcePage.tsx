import React, { useState, useEffect, useMemo } from 'react';
import { useAdminMetadata, SerializedResource, useResourceRecord, useAdminContext, AdminContext } from '@cape/react';
import { ResourceList } from './ResourceList.js';
import { ResourceCreate } from './ResourceCreate.js';
import { ResourceEdit } from './ResourceEdit.js';
import { ResourceShow } from './ResourceShow.js';
import { LayoutDashboard, Database, ChevronRight } from 'lucide-react';
import { ToastProvider, useToast } from './ToastProvider.js';

export interface ResourcePageProps {
  useHashRouting?: boolean;
  logo?: React.ReactNode;
  theme?: {
    primary?: string;
    primaryForeground?: string;
    sidebarBg?: string;
    sidebarText?: string;
    sidebarBorder?: string;
    sidebarActiveBg?: string;
    sidebarActiveText?: string;
  };
}

function parseHash(hash: string) {
  const cleanHash = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!cleanHash || cleanHash === '/' || cleanHash.startsWith('/custom')) {
    return { resourceName: null, view: 'list' as const, id: null, queryParams: {} as Record<string, string> };
  }
  const [pathPart, queryPart] = cleanHash.split('?');
  const parts = pathPart.split('/').filter(Boolean);

  const queryParams: Record<string, string> = {};
  if (queryPart) {
    const sp = new URLSearchParams(queryPart);
    sp.forEach((val, key) => {
      queryParams[key] = val;
    });
  }

  if (parts[0] === 'resources' && parts[1]) {
    const resourceName = parts[1];
    const view = (parts[2] as 'list' | 'create' | 'edit' | 'show') || 'list';
    const id = parts[3] || null;
    return { resourceName, view, id, queryParams };
  }
  return { resourceName: null, view: 'list' as const, id: null, queryParams: {} as Record<string, string> };
}

function setWindowHash(hash: string) {
  window.location.hash = hash;
}

export function ResourcePage(props: ResourcePageProps) {
  return (
    <ToastProvider>
      <ResourcePageContent {...props} />
    </ToastProvider>
  );
}

function ResourcePageContent({ useHashRouting = true, logo, theme }: ResourcePageProps) {
  const { data: metaData, isLoading, error } = useAdminMetadata();
  const adminContext = useAdminContext();
  const { toast } = useToast();

  const mergedContextValue = useMemo(
    () => ({
      ...adminContext,
      toast,
    }),
    [adminContext, toast]
  );

  useEffect(() => {
    const channel = new BroadcastChannel('cape-notifications');
    channel.onmessage = (event) => {
      if (event.data?.type === 'notification') {
        const { message, type } = event.data.payload;
        toast(message, type);
      }
    };
    return () => {
      channel.close();
    };
  }, [toast]);

  const [selectedResourceName, setSelectedResourceName] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'create' | 'edit' | 'show'>('list');
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [duplicateFromId, setDuplicateFromId] = useState<string | number | null>(null);

  useEffect(() => {
    if (!useHashRouting || !metaData) return;

    const handleHashChange = () => {
      const { resourceName, view: parsedView, id, queryParams } = parseHash(window.location.hash);
      if (resourceName) {
        setSelectedResourceName(resourceName);
        setView(parsedView);
        setSelectedId(id);
        setDuplicateFromId(queryParams.duplicateFrom || null);
      } else if (metaData.resources.length > 0) {
        const defaultResource = metaData.resources[0].name;
        setSelectedResourceName(defaultResource);
        setView('list');
        setSelectedId(null);
        setDuplicateFromId(null);

        const currentHash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
        if (!currentHash || currentHash === '/') {
          setWindowHash(`/resources/${defaultResource}`);
        }
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    handleHashChange();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [useHashRouting, metaData]);

  const navigateTo = (
    resourceName: string,
    nextView: 'list' | 'create' | 'edit' | 'show',
    id: string | number | null = null,
    extraParams?: Record<string, string>
  ) => {
    if (useHashRouting) {
      let newHash = `/resources/${resourceName}`;
      if (nextView !== 'list') {
        newHash += `/${nextView}`;
        if (id !== null && nextView !== 'create') {
          newHash += `/${id}`;
        }
      }
      if (extraParams && Object.keys(extraParams).length > 0) {
        const sp = new URLSearchParams(extraParams);
        newHash += `?${sp.toString()}`;
      }
      setWindowHash(newHash);
    } else {
      setSelectedResourceName(resourceName);
      setView(nextView);
      if (nextView === 'create') {
        setDuplicateFromId(extraParams?.duplicateFrom || null);
        setSelectedId(null);
      } else {
        setSelectedId(id);
        setDuplicateFromId(null);
      }
    }
  };

  const activeResource =
    metaData?.resources.find((r) => r.name === selectedResourceName) || metaData?.resources[0] || null;

  const selectResource = (res: SerializedResource) => {
    navigateTo(res.name, 'list');
  };

  const { data: duplicateRecordData, isLoading: isFetchingDuplicate } = useResourceRecord(
    selectedResourceName || '',
    duplicateFromId || undefined
  );

  let initialCreateData: any = undefined;
  if (duplicateFromId && duplicateRecordData?.data) {
    const rawData = duplicateRecordData.data;
    const cleanData = { ...rawData };
    if (activeResource) {
      delete cleanData[activeResource.primaryKey];
    } else {
      delete cleanData.id;
    }
    delete cleanData.createdAt;
    delete cleanData.updatedAt;
    initialCreateData = cleanData;
  }

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

  const themeStyles: React.CSSProperties & Record<string, string> = {};
  if (theme) {
    if (theme.primary) themeStyles['--cape-primary'] = theme.primary;
    if (theme.primaryForeground) themeStyles['--cape-primary-foreground'] = theme.primaryForeground;
    if (theme.sidebarBg) themeStyles['--cape-sidebar-bg'] = theme.sidebarBg;
    if (theme.sidebarText) themeStyles['--cape-sidebar-text'] = theme.sidebarText;
    if (theme.sidebarBorder) themeStyles['--cape-sidebar-border'] = theme.sidebarBorder;
    if (theme.sidebarActiveBg) themeStyles['--cape-sidebar-active-bg'] = theme.sidebarActiveBg;
    if (theme.sidebarActiveText) themeStyles['--cape-sidebar-active-text'] = theme.sidebarActiveText;
  }

  return (
    <AdminContext.Provider value={mergedContextValue}>
      <div style={themeStyles} className="flex min-h-screen bg-slate-50/50">
        {/* Sidebar */}
        <aside className="w-64 bg-[var(--cape-sidebar-bg,#0f172a)] text-[var(--cape-sidebar-text,#cbd5e1)] border-r border-[var(--cape-sidebar-border,#1e293b)] flex flex-col shrink-0">
          <div className="h-16 flex items-center px-6 border-b border-[var(--cape-sidebar-border,#1e293b)] gap-2">
            {logo ? (
              logo
            ) : (
              <>
                <Database className="h-5 w-5 text-white" />
                <span className="font-bold text-white text-base tracking-tight">Cape</span>
              </>
            )}
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
                      isSelected
                        ? 'bg-[var(--cape-sidebar-active-bg,#1e293b)] text-[var(--cape-sidebar-active-text,#ffffff)]'
                        : 'hover:bg-[var(--cape-sidebar-active-bg,#1e293b)]/50 hover:text-[var(--cape-sidebar-active-text,#ffffff)] text-[var(--cape-sidebar-text,#cbd5e1)]/80'
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
                    onCreate={() => navigateTo(activeResource.name, 'create')}
                    onEdit={(id) => navigateTo(activeResource.name, 'edit', id)}
                    onShow={(id) => navigateTo(activeResource.name, 'show', id)}
                    onDuplicate={(id) => navigateTo(activeResource.name, 'create', null, { duplicateFrom: String(id) })}
                  />
                )}
                {view === 'create' &&
                  (isFetchingDuplicate ? (
                    <div className="flex h-40 items-center justify-center text-sm text-slate-500 font-medium bg-white rounded-lg border border-slate-200 shadow-sm">
                      Loading duplicate source data...
                    </div>
                  ) : (
                    <ResourceCreate
                      resource={activeResource}
                      initialData={initialCreateData}
                      onSuccess={() => navigateTo(activeResource.name, 'list')}
                      onCancel={() => navigateTo(activeResource.name, 'list')}
                    />
                  ))}
                {view === 'edit' && selectedId !== null && (
                  <ResourceEdit
                    resource={activeResource}
                    id={selectedId}
                    onSuccess={() => navigateTo(activeResource.name, 'list')}
                    onCancel={() => navigateTo(activeResource.name, 'list')}
                  />
                )}
                {view === 'show' && selectedId !== null && (
                  <ResourceShow
                    resource={activeResource}
                    id={selectedId}
                    onBack={() => navigateTo(activeResource.name, 'list')}
                  />
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </AdminContext.Provider>
  );
}
