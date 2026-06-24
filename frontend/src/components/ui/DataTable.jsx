import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { SelectField, SelectOption } from './SelectField';

/**
 * DataTable — Table standar dengan search, pagination, dan action menu
 *
 * Aturan (dari FRONTEND_UI_STYLE_GUIDE.md):
 * - Header: bg var(--theme-bg), text var(--theme-h4), uppercase, tracking-wider
 * - Row: hover bg-[var(--theme-primary-light)], border var(--theme-border-muted)
 * - Pagination: rounded-xl overflow-hidden
 * - Search: bg var(--theme-bg), border var(--theme-border)
 */
export default function DataTable({
  columns = [],
  data = [],
  loading = false,
  onRowClick,
  searchable = true,
  pagination = true,
  pageSize = 10,
  emptyMessage = 'Tidak ada data',
  emptyIcon = 'folder_open',
  onSearch,
  actions,
  onAdd,
  addLabel = 'Tambah',
  filters = [],
  searchPlaceholder = 'Cari...',
  serverPagination = false,
  serverSort = false,
  totalData = 0,
  currentPage = 1,
  onPageChange,
  onSearchChange,
  onSortChange,
  onPageSizeChange,
  tableFooter,
  toolbarActions,
  title,
  subtitle,
  searchValue,
  filterValues,
  onFilterChange,
  manualFiltering = false,
  customTable = null,
}) {
  const [internalSearch, setInternalSearch] = useState('');
  const search = searchValue !== undefined ? searchValue : internalSearch;
  const [internalPage, setInternalPage] = useState(1);
  const activePage = serverPagination ? currentPage : internalPage;
  const [internalFilters, setInternalFilters] = useState({});
  const selectedFilters = filterValues !== undefined ? filterValues : internalFilters;
  const [limit, setLimit] = useState(pageSize);

  const handlePageChange = (p) => {
    if (serverPagination && onPageChange) {
      onPageChange(p);
    } else {
      setInternalPage(p);
    }
  };

  React.useEffect(() => {
    setLimit(pageSize);
  }, [pageSize]);

  // Search filter
  const searchedData = (searchable && !manualFiltering)
    ? (onSearch ? onSearch(data, search) : (search ? data.filter(row =>
        columns.some(col => String(row[col.key] || '').toLowerCase().includes(search.toLowerCase()))
      ) : data))
    : data;

  // Selected filters
  const filteredData = manualFiltering ? searchedData : searchedData.filter(row => {
    for (const key of Object.keys(selectedFilters)) {
      const val = selectedFilters[key];
      if (val && val !== 'all') {
        const cellValue = String(row[key] || row[key.charAt(0).toUpperCase() + key.slice(1)] || '');
        if (key.toLowerCase() === 'role') {
          const roles = cellValue.split(',').map(r => {
            const trimmed = r.trim().toLowerCase();
            return trimmed === 'student' ? 'mahasiswa' : trimmed;
          });
          if (!roles.includes(val.toLowerCase())) {
            return false;
          }
        } else {
          if (cellValue !== val) {
            return false;
          }
        }
      }
    }
    return true;
  });

  // Sorting
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
    if (onSortChange) onSortChange({ key, direction });
  };

  const sortedData = useMemo(() => {
    if (serverSort) return filteredData;
    let items = [...filteredData];
    if (sortConfig.key) {
      items.sort((a, b) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];

        // Handle nested paths (e.g. Mahasiswa.Nama)
        if (sortConfig.key.includes('.')) {
          const keys = sortConfig.key.split('.');
          aVal = keys.reduce((o, i) => (o ? o[i] : ''), a);
          bVal = keys.reduce((o, i) => (o ? o[i] : ''), b);
        }

        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;

        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return items;
  }, [filteredData, sortConfig, serverSort]);

  // Pagination
  const totalPages = serverPagination ? Math.ceil(totalData / limit) : Math.ceil(filteredData.length / limit);
  const paginatedData = pagination
    ? (serverPagination ? sortedData : sortedData.slice((activePage - 1) * limit, activePage * limit))
    : sortedData;

  const handleSearch = (e) => {
    const val = e.target.value;
    if (searchValue === undefined) {
      setInternalSearch(val);
    }
    if (onSearchChange) onSearchChange(val);
    handlePageChange(1);
  };

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-none border"
      style={{
        backgroundColor: 'var(--theme-surface)',
        borderColor: 'var(--theme-border)',
      }}
    >
      {/* Table Header / Title */}
      <div className="px-5 py-4 border-b border-[var(--theme-border-muted)] bg-[var(--theme-bg)]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-bold text-sm text-[var(--theme-text)] leading-tight">{title || 'Manajemen Data'}</h2>
          {subtitle ? (
            <p className="text-[11px] font-medium text-[var(--theme-text-muted)] mt-0.5">{subtitle}</p>
          ) : (
            <p className="text-[11px] font-medium text-[var(--theme-text-muted)] mt-0.5">Menampilkan daftar data yang terdaftar dalam sistem.</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] font-black text-[var(--theme-text-muted)] uppercase tracking-widest font-headline">Total Data</span>
          <span className="text-sm font-extrabold text-[var(--theme-primary)] px-2.5 py-0.5 rounded-md bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 shadow-sm tabular-nums">
            {serverPagination ? totalData : filteredData.length}
          </span>
        </div>
      </div>

      {/* Table Toolbar */}
      {(searchable || onAdd || filters.length > 0 || toolbarActions) && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-3 gap-3 border-b" style={{ borderColor: 'var(--theme-border-muted)' }}>
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <span
                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-base"
                style={{ color: 'var(--theme-text-muted)' }}
              >
                search
              </span>
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={search}
                onChange={handleSearch}
                className="w-full pl-9 pr-4 h-9 rounded-lg text-xs font-semibold outline-none"
                style={{
                  backgroundColor: 'var(--theme-bg)',
                  color: 'var(--theme-text)',
                  border: '1px solid var(--theme-border)',
                }}
              />
            </div>
          )}

          <div className="flex items-center gap-3 sm:ml-auto flex-wrap justify-end">
            {/* Filters */}
            {filters.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {filters.map((f) => (
                  <div key={f.key} className={f.className || "min-w-[180px]"}>
                    <SelectField
                      value={selectedFilters[f.key] || 'all'}
                      onValueChange={(val) => {
                        if (filterValues === undefined) {
                          setInternalFilters(prev => ({ ...prev, [f.key]: val }));
                        }
                        if (onFilterChange) onFilterChange(f.key, val);
                        handlePageChange(1);
                      }}
                      placeholder={f.placeholder}
                      className="w-full h-9 text-xs rounded-lg font-semibold"
                    >
                      <SelectOption value="all">Semua {f.placeholder.replace('Pilih ', '')}</SelectOption>
                      {f.options.map((opt) => (
                        <SelectOption key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectOption>
                      ))}
                    </SelectField>
                  </div>
                ))}
              </div>
            )}

            {/* Actions & Add Button */}
            <div className="flex items-center gap-2">
              {toolbarActions && toolbarActions}
              {onAdd && (
                <button
                  type="button"
                  onClick={onAdd}
                  className="h-9 px-3.5 rounded-lg bg-[var(--theme-primary)] text-white text-[11px] font-black uppercase tracking-widest hover:bg-[var(--theme-primary-hover)] transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer border-none shadow-sm"
                >
                  <span className="material-symbols-outlined text-[14px]">add</span>
                  {addLabel}
                </button>
              )}
              {actions && typeof actions !== 'function' && actions}
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto w-full">
        {typeof customTable === 'function' ? customTable({ paginatedData, handleSort, sortConfig }) : customTable ? customTable : (
        <table className="w-full">
          <thead style={{ backgroundColor: 'var(--theme-bg)' }}>
            <tr>
              {columns.map((col) => {
                const isSortable = col.sortable !== false && col.key;
                return (
                  <th
                    key={col.key}
                    onClick={() => isSortable && handleSort(col.key)}
                    className={cn(
                      "px-6 py-3.5 text-left text-[10px] font-bold uppercase tracking-wider select-none whitespace-nowrap",
                      isSortable && "cursor-pointer hover:text-slate-900 group",
                      col.className
                    )}
                    style={{ color: 'var(--theme-text-subtle)' }}
                  >
                    <div className={cn(
                      "flex items-center gap-1",
                      col.className?.includes('text-right') ? 'justify-end' : col.className?.includes('text-center') ? 'justify-center' : ''
                    )}>
                      {col.label}
                      {isSortable && (
                        sortConfig.key === col.key ? (
                          sortConfig.direction === 'asc' ? (
                            <span className="material-symbols-outlined text-sm text-[var(--theme-primary)]" style={{ fontSize: '14px' }}>expand_less</span>
                          ) : (
                            <span className="material-symbols-outlined text-sm text-[var(--theme-primary)]" style={{ fontSize: '14px' }}>expand_more</span>
                          )
                        ) : (
                          <span className="material-symbols-outlined text-sm text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" style={{ fontSize: '14px' }}>unfold_more</span>
                        )
                      )}
                    </div>
                  </th>
                );
              })}
              {(onRowClick || (actions && typeof actions === 'function')) && (
                <th className="px-6 py-3.5 text-right text-[10px] font-bold uppercase tracking-wider whitespace-nowrap" style={{ color: 'var(--theme-text-subtle)' }}>
                  Aksi
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              // Loading skeleton
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-t" style={{ borderColor: 'var(--theme-border-muted)' }}>
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-6 py-4", col.className, col.cellClassName)}>
                      <div
                        className="h-4 rounded animate-pulse"
                        style={{ backgroundColor: 'var(--theme-border-muted)', width: `${60 + Math.random() * 40}%` }}
                      />
                    </td>
                  ))}
                  {(onRowClick || (actions && typeof actions === 'function')) && <td className="px-6 py-4"><div className="h-2.5 w-16 rounded animate-pulse" style={{ backgroundColor: 'var(--theme-border-muted)' }} /></td>}
                </tr>
              ))
            ) : paginatedData.length === 0 ? (
              // Empty state
              <tr>
                <td colSpan={columns.length + (onRowClick || (actions && typeof actions === 'function') ? 1 : 0)} className="px-6 py-12 text-center">
                  <div className="flex flex-col items-center justify-center gap-3">
                    <span
                      className="material-symbols-outlined text-4xl"
                      style={{ color: 'var(--theme-text-muted)' }}
                    >
                      {emptyIcon}
                    </span>
                    <p className="text-xs font-semibold" style={{ color: 'var(--theme-text-muted)' }}>{emptyMessage}</p>
                  </div>
                </td>
              </tr>
            ) : (
              // Data rows
              paginatedData.map((row, idx) => (
                <tr
                  key={row.id || idx}
                  className="border-t cursor-pointer transition-colors hover:bg-[var(--theme-primary-light)]"
                  style={{ borderColor: 'var(--theme-border-muted)' }}
                  onClick={() => onRowClick && onRowClick(row)}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn("px-6 py-4 text-sm font-semibold", col.className, col.cellClassName)}
                      style={{ color: 'var(--theme-text)' }}
                    >
                      {col.render ? col.render(row[col.key], row, (activePage - 1) * limit + idx) : row[col.key]}
                    </td>
                  ))}
                  {(onRowClick || (actions && typeof actions === 'function')) && (
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1.5">
                        {actions && typeof actions === 'function' && actions(row)}
                        {onRowClick && (
                          <button
                            className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-black/[0.05] transition-colors"
                            style={{ color: 'var(--theme-text-muted)' }}
                            onClick={(e) => { e.stopPropagation(); onRowClick(row); }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>visibility</span>
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
          {tableFooter}
        </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && (
        <div
          className="flex flex-col md:flex-row items-center justify-between px-4 py-3 border-t gap-4"
          style={{ borderColor: 'var(--theme-border-muted)' }}
        >
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <span className="text-xs font-medium" style={{ color: 'var(--theme-text-muted)' }}>
              Menampilkan {serverPagination
                ? (totalData > 0 ? (activePage - 1) * limit + 1 : 0)
                : (filteredData.length > 0 ? (activePage - 1) * limit + 1 : 0)}–{serverPagination
                  ? Math.min(activePage * limit, totalData)
                  : Math.min(activePage * limit, filteredData.length)} dari {serverPagination ? totalData : filteredData.length} entri
            </span>

            {/* Rows Per Page Selector */}
            <div className="flex items-center gap-1.5 text-xs animate-in fade-in duration-200" style={{ color: 'var(--theme-text-muted)' }}>
              <span>Tampilkan</span>
              <div className="relative">
                <select
                  value={limit}
                  onChange={(e) => {
                    const newLimit = parseInt(e.target.value);
                    setLimit(newLimit);
                    handlePageChange(1);
                    if (onPageSizeChange) onPageSizeChange(newLimit);
                  }}
                  className="pl-2 pr-6 py-1 bg-surface border rounded-md text-xs font-bold outline-none cursor-pointer appearance-none"
                  style={{
                    borderColor: 'var(--theme-border)',
                    color: 'var(--theme-text)',
                    backgroundColor: 'var(--theme-surface)'
                  }}
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="material-symbols-outlined absolute right-1 top-1/2 -translate-y-1/2 pointer-events-none" style={{ fontSize: '14px', color: 'var(--theme-text-muted)' }}>expand_more</span>
              </div>
              <span>entri</span>
            </div>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1 sm:pb-0 hide-scrollbar">
            <button
              onClick={() => handlePageChange(Math.max(1, activePage - 1))}
              disabled={activePage === 1 || totalPages <= 1}
              className="px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 hover:bg-black/[0.03] flex items-center gap-1 text-xs font-semibold border border-slate-200 bg-white cursor-pointer"
              style={{ color: 'var(--theme-text)' }}
            >
              <span className="material-symbols-outlined text-base" style={{ fontSize: '16px' }}>chevron_left</span>
              Sebelumnya
            </button>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {(() => {
                  const pages = [];
                  const addPage = (p) => {
                    pages.push(
                      <button
                        key={p}
                        onClick={() => handlePageChange(p)}
                        className="w-8 h-8 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        style={
                          activePage === p
                            ? { backgroundColor: 'var(--theme-primary)', color: 'white' }
                            : { color: 'var(--theme-text-muted)' }
                        }
                      >
                        {p}
                      </button>
                    );
                  };
                  const addEllipsis = (key) => {
                    pages.push(
                      <span key={key} className="w-8 h-8 flex items-center justify-center text-xs font-bold" style={{ color: 'var(--theme-text-muted)' }}>…</span>
                    );
                  };

                  if (totalPages <= 7) {
                    for (let i = 1; i <= totalPages; i++) addPage(i);
                  } else {
                    addPage(1);
                    if (activePage > 3) addEllipsis('left-ellipsis');
                    const start = Math.max(2, activePage - 1);
                    const end = Math.min(totalPages - 1, activePage + 1);
                    for (let i = start; i <= end; i++) addPage(i);
                    if (activePage < totalPages - 2) addEllipsis('right-ellipsis');
                    addPage(totalPages);
                  }
                  return pages;
                })()}
              </div>
            )}
            <button
              onClick={() => handlePageChange(Math.min(totalPages, activePage + 1))}
              disabled={activePage === totalPages || totalPages <= 1}
              className="px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40 hover:bg-black/[0.03] flex items-center gap-1 text-xs font-semibold border border-slate-200 bg-white cursor-pointer"
              style={{ color: 'var(--theme-text)' }}
            >
              Berikutnya
              <span className="material-symbols-outlined text-base" style={{ fontSize: '16px' }}>chevron_right</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export { DataTable };