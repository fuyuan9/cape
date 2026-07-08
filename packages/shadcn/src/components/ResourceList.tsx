import React, { useState } from 'react';
import {
  useResourceList,
  useResourceDelete,
  useResourceBulkDelete,
  useResourceAction,
  useResourceExport,
  useResourceImport,
  ImportResult,
  SerializedResource,
} from '@fuyuan9/cape-react';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Button,
  Badge,
  Dialog,
  EmptyState,
  ErrorState,
} from './ui.js';
import {
  Trash2,
  Edit,
  Eye,
  Copy,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Search,
  Download,
  Upload,
} from 'lucide-react';

export interface ResourceListProps {
  resource: SerializedResource;
  onEdit: (id: string | number) => void;
  onCreate: () => void;
  onShow: (id: string | number) => void;
  onDuplicate: (id: string | number) => void;
}

export function ResourceList({ resource, onEdit, onCreate, onShow, onDuplicate }: ResourceListProps) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [sortField, setSortField] = useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, any>>({});
  const [selectedIds, setSelectedIds] = useState<(string | number)[]>([]);
  const [deleteTargetId, setDeleteTargetId] = useState<string | number | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);

  const queryParams: any = {
    page,
    pageSize,
    search,
    filters,
  };
  if (sortField !== undefined) queryParams.sortField = sortField;
  if (sortOrder !== undefined) queryParams.sortOrder = sortOrder;

  const { data: listData, isLoading, error, refetch } = useResourceList(resource.name, queryParams);

  const deleteMutation = useResourceDelete(resource.name);
  const bulkDeleteMutation = useResourceBulkDelete(resource.name);
  const runAction = useResourceAction(resource.name);
  const { triggerExport } = useResourceExport(resource.name, { search, filters });
  const importMutation = useResourceImport(resource.name);

  const handleSort = (field: string) => {
    if (sortField === field) {
      if (sortOrder === 'asc') {
        setSortOrder('desc');
      } else if (sortOrder === 'desc') {
        setSortField(undefined);
        setSortOrder(undefined);
      } else {
        setSortOrder('asc');
      }
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked && listData?.data) {
      setSelectedIds(listData.data.map((item) => item[resource.primaryKey]));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string | number, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  const handleDeleteConfirm = async () => {
    if (deleteTargetId !== null) {
      await deleteMutation.mutateAsync(deleteTargetId);
      setDeleteTargetId(null);
      refetch();
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} records?`)) {
      await bulkDeleteMutation.mutateAsync(selectedIds);
      setSelectedIds([]);
      refetch();
    }
  };

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  const items = listData?.data || [];
  const total = listData?.total || 0;
  const totalPages = Math.ceil(total / pageSize);

  // Identify filterable columns and map them with form field metadata if available
  const filterableFields = resource.table.columns
    .filter((col) => col.isFilterable)
    .map((col) => {
      const field = resource.form.fields.find((f) => f.name === col.name);
      return {
        name: col.name,
        label: field?.label || col.name.charAt(0).toUpperCase() + col.name.slice(1),
        type: field?.type || col.type || 'text',
        options: field?.options || [],
      };
    });

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg border border-slate-100 shadow-sm">
        <div className="flex flex-1 items-center gap-2 w-full md:max-w-md">
          <div className="relative w-full">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search database..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 w-full rounded-md border border-slate-200 bg-slate-50/50 h-9 text-sm focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* Dynamic Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {filterableFields.map((field) => (
            <div key={field.name} className="flex items-center gap-1">
              {field.type === 'select' || field.type === 'badge' || field.type === 'radio' ? (
                <select
                  value={filters[field.name] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters((prev) => ({ ...prev, [field.name]: val }));
                    setPage(1);
                  }}
                  className="rounded-md border border-slate-200 h-9 text-xs px-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">All {field.label}</option>
                  {field.options?.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              ) : field.type === 'boolean' ? (
                <select
                  value={filters[field.name] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters((prev) => ({ ...prev, [field.name]: val }));
                    setPage(1);
                  }}
                  className="rounded-md border border-slate-200 h-9 text-xs px-2 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900"
                >
                  <option value="">All {field.label}</option>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              ) : (
                <input
                  type="text"
                  placeholder={`Filter by ${field.label}...`}
                  value={filters[field.name] || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setFilters((prev) => ({ ...prev, [field.name]: val }));
                    setPage(1);
                  }}
                  className="rounded-md border border-slate-200 h-9 text-xs px-3 bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 w-32"
                />
              )}
            </div>
          ))}

          {/* New Record Button */}
          <Button onClick={onCreate} className="h-9">
            Create {resource.label}
          </Button>

          {/* Export CSV Button */}
          <Button variant="outline" className="h-9" onClick={triggerExport} title="Export current view to CSV">
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>

          {/* Import CSV Button */}
          <Button
            variant="outline"
            className="h-9"
            onClick={() => {
              setShowImportModal(true);
              setImportResult(null);
              setImportFile(null);
            }}
            title="Import records from CSV"
          >
            <Upload className="h-4 w-4 mr-1" />
            Import
          </Button>
        </div>
      </div>

      {/* Selected Items / Bulk Actions */}
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3 rounded-lg animate-in fade-in slide-in-from-top-1">
          <span className="text-xs font-medium text-slate-600">{selectedIds.length} records selected</span>
          <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
            <Trash2 className="h-3.5 w-3.5 mr-1" />
            Delete Selected
          </Button>
        </div>
      )}

      {/* Import Modal */}
      {showImportModal && (
        <Dialog
          open={showImportModal}
          onClose={() => setShowImportModal(false)}
          title={`Import ${resource.label} from CSV`}
        >
          <div className="space-y-4">
            {!importResult ? (
              <>
                <p className="text-sm text-slate-600">
                  Upload a <code>.csv</code> file. The first row must be a header row with column names. Unknown columns
                  are ignored. The <code>id</code> column is always ignored (new records are created).
                </p>
                <input
                  id="csv-import-file"
                  type="file"
                  accept=".csv,text/csv"
                  className="block w-full text-sm text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowImportModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    disabled={!importFile || importMutation.isPending}
                    onClick={async () => {
                      if (!importFile) return;
                      try {
                        const result = await importMutation.mutateAsync(importFile);
                        setImportResult(result);
                        refetch();
                      } catch {
                        // error handled by mutation onError toast
                      }
                    }}
                  >
                    {importMutation.isPending ? 'Importing…' : 'Import'}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div
                  className={`rounded-md p-3 text-sm ${
                    importResult.success
                      ? 'bg-green-50 text-green-800 border border-green-200'
                      : 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                  }`}
                >
                  <p className="font-medium">
                    {importResult.success ? '✓ Import successful' : '⚠ Import completed with errors'}
                  </p>
                  <p>
                    {importResult.created} record(s) created, {importResult.skipped} skipped.
                  </p>
                </div>
                {importResult.errors.length > 0 && (
                  <div className="max-h-48 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-1 pr-3 font-medium text-slate-500">Row</th>
                          <th className="text-left py-1 pr-3 font-medium text-slate-500">Field</th>
                          <th className="text-left py-1 font-medium text-slate-500">Error</th>
                        </tr>
                      </thead>
                      <tbody>
                        {importResult.errors.map((e, i) => (
                          <tr key={i} className="border-b border-slate-100">
                            <td className="py-1 pr-3 text-slate-600">{e.row}</td>
                            <td className="py-1 pr-3 text-slate-600">{e.field || '—'}</td>
                            <td className="py-1 text-red-600">{e.message}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <div className="flex justify-end">
                  <Button onClick={() => setShowImportModal(false)}>Close</Button>
                </div>
              </>
            )}
          </div>
        </Dialog>
      )}

      {/* Table Section */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex h-40 items-center justify-center text-sm text-slate-500">Loading...</div>
        ) : items.length === 0 ? (
          <EmptyState
            title={`No ${resource.label} items found`}
            description="Create your first entry to see records in this table."
            action={
              <Button onClick={onCreate} size="sm">
                Create {resource.label}
              </Button>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12 text-center">
                  <input
                    type="checkbox"
                    checked={items.length > 0 && selectedIds.length === items.length}
                    onChange={(e) => handleSelectAll(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                  />
                </TableHead>
                {resource.table.columns.map((col) => (
                  <TableHead key={col.name}>
                    {col.isSortable ? (
                      <button
                        onClick={() => handleSort(col.name)}
                        className="flex items-center gap-1 hover:text-slate-900 font-semibold"
                      >
                        {col.name.charAt(0).toUpperCase() + col.name.slice(1)}
                        <ArrowUpDown className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      col.name.charAt(0).toUpperCase() + col.name.slice(1)
                    )}
                  </TableHead>
                ))}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => {
                const id = item[resource.primaryKey];
                const isSelected = selectedIds.includes(id);

                return (
                  <TableRow key={id} data-state={isSelected ? 'selected' : undefined}>
                    <TableCell className="text-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleSelectOne(id, e.target.checked)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                    </TableCell>
                    {resource.table.columns.map((col) => {
                      const val = item[col.name];

                      return (
                        <TableCell key={col.name}>
                          {col.type === 'image' && val ? (
                            <img
                              src={val}
                              alt={col.name}
                              className="h-10 w-10 object-cover rounded-md border border-slate-200"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/100x100?text=No+Image';
                              }}
                            />
                          ) : col.type === 'email' && val ? (
                            <a href={`mailto:${val}`} className="text-blue-600 hover:underline">
                              {val}
                            </a>
                          ) : col.type === 'badge' && val ? (
                            <Badge variant={val === 'admin' ? 'default' : 'secondary'}>{val}</Badge>
                          ) : col.type === 'boolean' ? (
                            <Badge variant={val ? 'success' : 'destructive'}>{val ? 'Yes' : 'No'}</Badge>
                          ) : col.type === 'datetime' || col.type === 'date' ? (
                            val ? (
                              new Date(val).toLocaleString()
                            ) : (
                              '-'
                            )
                          ) : (
                            String(val ?? '-')
                          )}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-right space-x-1">
                      {resource.actions?.map((act) => (
                        <Button
                          key={act.name}
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => runAction.mutate({ id, actionName: act.name })}
                          disabled={runAction.isPending}
                        >
                          {act.label || act.name}
                        </Button>
                      ))}
                      <Button variant="ghost" size="icon" onClick={() => onShow(id)} title="View">
                        <Eye className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onEdit(id)} title="Edit">
                        <Edit className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onDuplicate(id)} title="Duplicate">
                        <Copy className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTargetId(id)} title="Delete">
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <div className="flex-1 text-xs text-slate-500">
            Showing {items.length} of {total} records
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Previous
            </Button>
            <span className="text-xs text-slate-600 font-medium">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteTargetId !== null} onClose={() => setDeleteTargetId(null)} title="Delete Record">
        <p className="text-sm text-slate-500 mb-4">
          Are you sure you want to delete this record? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeleteTargetId(null)}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDeleteConfirm}>
            Delete
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
