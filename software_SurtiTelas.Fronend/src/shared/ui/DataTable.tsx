import { useCallback, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Eye,
  FileText,
  Filter,
  MoreHorizontal,
  Square,
} from 'lucide-react';
import s from './DataTable.module.css';
import { cn } from '@/shared/utils';
import { Badge } from '@/shared/ui/Badge';
import { Button } from '@/shared/ui/Button';
import { TableActionsMenu, TableAction } from '@/shared/ui/TableActionsMenu';
import { useDelegatedTooltips } from '@/shared/components/Tooltip';
import { DropdownMenu } from '@/shared/ui/DropdownMenu';
import { SearchInput } from '@/shared/ui/SearchInput';
import { DetailModal, type DetailModalHeader, type KpiCard, type ObservationBlock } from '@/shared/ui/DetailModal';

export interface DataTableColumn<T> {
  key: string;
  header: string;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  widthStrategy?: 'fixed' | 'flexible';
  sortable?: boolean;
  filterable?: boolean;
  filterType?: 'text' | 'select';
  filterOptions?: { value: string; label: string }[];
  filterPlaceholder?: string;
  render?: (item: T) => ReactNode;
  sortValue?: (item: T) => unknown;
  exportValue?: (item: T) => unknown;
  align?: 'left' | 'center' | 'right';
  hidden?: boolean;
}

export interface DataTableAction<T> {
  label: string | ((item: T) => string);
  icon?: ReactNode;
  iconClassName?: string;
  onClick: (item: T) => void;
  danger?: boolean;
  disabled?: boolean | ((item: T) => boolean);
  testId?: string | ((item: T) => string);
}

export interface DataTableDetailPanel<T> {
  title: (item: T) => string;
  render: (item: T, onClose: () => void) => ReactNode;
  header?: (item: T) => DetailModalHeader;
  kpis?: (item: T) => KpiCard[];
  observations?: (item: T) => ObservationBlock | ObservationBlock[];
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  pageSize?: number;
  className?: string;
  emptyMessage?: string;
  maxHeight?: string;
  headerBg?: string;
  title?: string;
  subtitle?: string;
  toolbarLeft?: ReactNode;
  toolbarRight?: ReactNode;

  enableSorting?: boolean;
  enableColumnFilters?: boolean;
  enableRowSelection?: boolean;
  enableExport?: boolean;
  exportFileName?: string;

  onSelectionChange?: (selectedItems: T[]) => void;

  detailPanel?: DataTableDetailPanel<T>;
  onRowClick?: (item: T) => void;
  modalSize?: 'sm' | 'md' | 'lg' | 'xl' | '2xl';

  actions?: DataTableAction<T>[] | ((item: T) => DataTableAction<T>[]);

  actionsCellRenderer?: (item: T, rowActions: { primaryAction?: TableAction; actions: TableAction[] }, openDetail: (item: T) => void) => ReactNode;

  maxVisibleColumns?: number;

  serverMode?: boolean;
  currentPage?: number;
  totalPages?: number;
  totalItems?: number;
  onPageChange?: (page: number) => void;

  compact?: boolean;
}

type SortDirection = 'asc' | 'desc';
type SortConfig = { key: string; direction: SortDirection };

const TABLE_EMPTY_TEXT = 'Sin registros por mostrar';
const ACTION_COLUMN_KEYS = new Set(['acciones', 'actions', 'action']);

const JumpButton = ({ disabled, onClick, title, children, compact }: { disabled?: boolean; onClick?: () => void; title?: string; children?: ReactNode; compact?: boolean }) => (
  <Button variant="outline" size="icon-xs" onClick={onClick} disabled={disabled} data-bs-toggle="tooltip" data-bs-title={title} className={cn(s.jumpButton, compact && s.jumpButtonCompact)}>
    {children}
  </Button>
);

const isActionColumn = (key: string) => ACTION_COLUMN_KEYS.has(key.toLowerCase());
const isStatusColumn = (key: string) => {
  const normalized = key.toLowerCase();
  return normalized.includes('estado') || normalized.includes('status') || normalized.includes('state');
};

const getId = <T extends { id?: string | number }>(item: T) => item.id;

const normalizeValue = (value: unknown) => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .trim();

const getRawValue = <T extends { id?: string | number }>(item: T, column: DataTableColumn<T>) => (item as Record<string, unknown>)[column.key];

const getDisplayValue = <T extends { id?: string | number }>(item: T, column: DataTableColumn<T>) => {
  if (column.render) return column.render(item);
  const rawValue = getRawValue(item, column);
  if (rawValue == null || rawValue === '') return null;
  if (isStatusColumn(column.key)) return <Badge variant={getBadgeVariant(String(rawValue))}>{String(rawValue)}</Badge>;
  if (typeof rawValue === 'object') return JSON.stringify(rawValue);
  return String(rawValue);
};

const getSortValue = <T extends { id?: string | number }>(item: T, column: DataTableColumn<T>) => column.sortValue?.(item) ?? getRawValue(item, column);

const getExportValue = <T extends { id?: string | number }>(item: T, column: DataTableColumn<T>) => column.exportValue?.(item) ?? getRawValue(item, column);

const compareValues = (a: unknown, b: unknown) => {
  if (a == null && b == null) return 0;
  if (a == null) return 1;
  if (b == null) return -1;
  if (typeof a === 'number' && typeof b === 'number') return a - b;

  const aDate = Date.parse(String(a));
  const bDate = Date.parse(String(b));
  if (!Number.isNaN(aDate) && !Number.isNaN(bDate)) return aDate - bDate;

  return String(a).localeCompare(String(b), 'es-CO', { numeric: true, sensitivity: 'base' });
};

const getBadgeVariant = (value: string) => {
  const normalized = normalizeValue(value);
  if (['activo', 'activa', 'active', 'pagado', 'pagada', 'completada', 'completado', 'aprobado', 'reingresado', 'cerrado', 'resuelta', 'recibido', 'entregado'].some(item => normalized.includes(item))) return 'success';
  if (['pendiente', 'en inspeccion', 'en inspección', 'en produccion', 'en producción', 'asignada', 'en camino', 'en taller', 'enviada', 'nuevo', 'leido', 'leído', 'alta'].some(item => normalized.includes(item))) return 'warning';
  if (['vencida', 'vencido', 'rechazado', 'cancelada', 'cancelado', 'descartado', 'en mora', 'con novedad', 'baja'].some(item => normalized.includes(item))) return 'danger';
  if (['parcial', 'en reparacion', 'en reparación', 'media', 'info'].some(item => normalized.includes(item))) return 'info';
  if (['admin', 'administrador', 'cotizacion', 'cotización', 'primaria'].some(item => normalized.includes(item))) return 'primary';
  return 'default';
};

const escapeCsv = (value: unknown) => {
  const raw = value == null ? '' : String(value).replace(/\r?\n/g, ' ');
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
};

const escapeHtml = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, char => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
}[char] ?? char));

const downloadFile = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const getExportFileName = (fileName: string, extension: string) => {
  const baseName = fileName.replace(/[^\w-]+/g, '_').replace(/^_+|_+$/g, '') || 'export';
  const date = new Date().toISOString().split('T')[0];
  return `${baseName}_${date}.${extension}`;
};

export function DataTable<T extends { id?: string | number }>({
  data,
  columns,
  pageSize = 10,
  className,
  emptyMessage = TABLE_EMPTY_TEXT,
  maxHeight = '520px',
  headerBg,
  title = 'Registros',
  subtitle,
  toolbarLeft,
  toolbarRight,
  enableSorting = true,
  enableColumnFilters = true,
  enableRowSelection = true,
  enableExport = true,
  exportFileName = 'export',
  onSelectionChange,
  detailPanel,
  onRowClick,
  actions,
  actionsCellRenderer,
  modalSize,
  maxVisibleColumns = 5,
  serverMode = false,
  currentPage: externalPage,
  totalPages: externalTotalPages,
  totalItems: externalTotalItems,
  onPageChange,
  compact = false,
}: DataTableProps<T>) {
  const tableRef = useRef<HTMLDivElement>(null);
  useDelegatedTooltips(tableRef);

  const resolveColumnWidth = useCallback((column: DataTableColumn<T>): { width?: string; minWidth?: string; maxWidth?: string; strategy?: 'fixed' | 'flexible' } => {
    const strategy = column.widthStrategy;
    const explicit = { width: column.width, minWidth: column.minWidth, maxWidth: column.maxWidth, strategy };
    const header = (column.header || '').toLowerCase();
    const key = (column.key || '').toLowerCase();

    if (column.width || column.minWidth || column.maxWidth) {
      return { ...explicit, strategy: strategy ?? 'fixed' };
    }

    if (key.includes('id') || key.includes('codigo') || key.includes('numero') || header.includes('id') || header.includes('código') || header.includes('número')) {
      return { width: '110px', strategy: 'fixed' };
    }
    if (header.includes('estado') || header.includes('status')) {
      return { width: '120px', strategy: 'fixed' };
    }
    if (header.includes('stock') || header.includes('cantidad') || header.includes('total') || header.includes('precio') || header.includes('ocupación') || header.includes('ocupacion')) {
      return { width: '100px', strategy: 'fixed' };
    }
    if (header.includes('fecha')) {
      return { width: '120px', strategy: 'fixed' };
    }

    return { strategy: 'flexible' };
  }, []);

  const getColumnWidthStyle = (column: DataTableColumn<T>): React.CSSProperties | undefined => {
    const resolved = resolveColumnWidth(column);
    if (resolved.strategy === 'fixed') {
      const style: React.CSSProperties = {};
      if (resolved.width) style.width = resolved.width;
      if (resolved.minWidth) style.minWidth = resolved.minWidth;
      if (resolved.maxWidth) style.maxWidth = resolved.maxWidth;
      return style;
    }
    return { minWidth: '140px' };
  };

  const allColumns = useMemo(() => columns.filter(column => !isActionColumn(column.key)), [columns]);
  const limitedColumns = useMemo(() => allColumns.filter(column => !column.hidden), [allColumns]);
  const visibleColumns = useMemo(() => {
    const cols = limitedColumns.slice(0, maxVisibleColumns);
    return cols;
  }, [limitedColumns, maxVisibleColumns]);
  const hiddenByLimitCount = limitedColumns.length - visibleColumns.length;
  const filterableColumns = useMemo(() => visibleColumns.filter(column => column.filterable && enableColumnFilters), [visibleColumns, enableColumnFilters]);

  const [currentPage, setCurrentPage] = useState(1);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());
  const [showDetailPanel, setShowDetailPanel] = useState(false);
  const [selectedDetailItem, setSelectedDetailItem] = useState<T | null>(null);
  const [searchText, setSearchText] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const processedData = useMemo(() => {
    let result = [...data];
    const search = normalizeValue(searchText);

    if (search) {
      result = result.filter(item => allColumns.some(column => normalizeValue(getRawValue(item, column)).includes(search)));
    }

    filterableColumns.forEach(column => {
      const filterValue = normalizeValue(columnFilters[column.key]);
      if (!filterValue) return;

      result = result.filter(item => {
        if (column.filterType === 'select' && column.filterOptions?.length) {
          return normalizeValue(getRawValue(item, column)) === filterValue;
        }

        return normalizeValue(getRawValue(item, column)).includes(filterValue);
      });
    });

    if (sortConfig && enableSorting) {
      const sortColumn = visibleColumns.find(item => item.key === sortConfig.key) ?? visibleColumns[0];

      if (sortColumn) {
        result.sort((a, b) => {
          const comparison = compareValues(getSortValue(a, sortColumn), getSortValue(b, sortColumn));
          return sortConfig.direction === 'asc' ? comparison : -comparison;
        });
      }
    }

    return result;
  }, [data, allColumns, visibleColumns, filterableColumns, columnFilters, sortConfig, enableSorting, searchText]);

  const totalPages = serverMode
    ? (externalTotalPages ?? 1)
    : Math.max(1, Math.ceil(processedData.length / pageSize));
  const safePage = serverMode
    ? (externalPage ?? 1)
    : Math.min(currentPage, totalPages);
  const start = serverMode ? 0 : (safePage - 1) * pageSize;
  const memoizedPageData = useMemo(() => processedData.slice(start, start + pageSize), [processedData, start, pageSize]);
  const pageData = serverMode ? processedData : memoizedPageData;

  const effectiveTotalItems = serverMode && externalTotalItems != null && externalTotalItems > 0
    ? externalTotalItems
    : processedData.length;
  const from = serverMode && externalTotalItems != null && externalTotalItems > 0
    ? (safePage - 1) * pageSize + 1
    : processedData.length === 0
      ? 0
      : start + 1;
  const to = serverMode && externalTotalItems != null && externalTotalItems > 0
    ? Math.min(safePage * pageSize, externalTotalItems)
    : Math.min(start + pageSize, processedData.length);
  const activeFilterCount = (searchText.trim() ? 1 : 0) + Object.values(columnFilters).filter(value => value.trim()).length;
  const hasActiveFilters = activeFilterCount > 0;

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [currentPage, totalPages]);

  const selectedItems = useMemo(() => data.filter(item => {
    const id = getId(item);
    return id != null && selectedIds.has(id);
  }), [data, selectedIds]);

  const allFilteredIds = useMemo(() => new Set(processedData.map(getId).filter((id): id is string | number => id != null)), [processedData]);
  const isAllSelected = allFilteredIds.size > 0 && Array.from(allFilteredIds).every(id => selectedIds.has(id));
  const isSomeSelected = !isAllSelected && Array.from(allFilteredIds).some(id => selectedIds.has(id));
  const selectedCount = selectedIds.size;

  useEffect(() => {
    onSelectionChange?.(selectedItems);
  }, [onSelectionChange, selectedItems]);

  const goTo = (page: number) => {
    if (serverMode) {
      onPageChange?.(page);
    } else {
      setCurrentPage(Math.min(Math.max(page, 1), totalPages));
    }
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const toggleSelect = (id: string | number | undefined) => {
    if (id == null) return;
    setSelectedIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(current => {
      const next = new Set(current);
      if (isAllSelected) {
        allFilteredIds.forEach(id => next.delete(id));
      } else {
        allFilteredIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleSort = (key: string) => {
    if (!enableSorting) return;
    setSortConfig(current => {
      if (current?.key === key) {
        if (current.direction === 'asc') return { key, direction: 'desc' };
        return null;
      }
      return { key, direction: 'asc' };
    });
  };

  const handleColumnFilter = (key: string, value: string) => {
    setColumnFilters(current => ({ ...current, [key]: value }));
    setCurrentPage(1);
  };

  const clearAllFilters = () => {
    setColumnFilters({});
    setSearchText('');
    setCurrentPage(1);
  };

  const handleRowClick = (item: T) => {
    if (onRowClick) {
      onRowClick(item);
      return;
    }

    if (detailPanel) {
      setSelectedDetailItem(item);
      setShowDetailPanel(true);
    }
  };

  const getActions = (item: T): DataTableAction<T>[] => {
    if (!actions) return [];
    return typeof actions === 'function' ? actions(item) : actions;
  };

  const hasRowActions = data.some(item => getActions(item).length > 0 || Boolean(detailPanel || onRowClick));

  const selectionWidthStyle = enableRowSelection ? { width: '44px', minWidth: '44px' } : undefined;
  const actionsWidthStyle = { width: '180px', minWidth: '180px', maxWidth: '180px' };
  const hiddenColsWidthStyle = hiddenByLimitCount > 0 && detailPanel ? { width: '70px', minWidth: '70px', maxWidth: '70px' } : undefined;

  const colgroup = useMemo(() => {
    const cols: React.ReactElement[] = [];
    if (enableRowSelection) {
      cols.push(<col key="selection" style={{ width: '44px', minWidth: '44px' }} />);
    }
    visibleColumns.forEach((column) => {
      const resolved = resolveColumnWidth(column);
      if (resolved.strategy === 'fixed') {
        const style: React.CSSProperties = {};
        if (resolved.width) style.width = resolved.width;
        else if (resolved.minWidth) style.width = resolved.minWidth;
        if (resolved.minWidth) style.minWidth = resolved.minWidth;
        if (resolved.maxWidth) style.maxWidth = resolved.maxWidth;
        cols.push(<col key={column.key} style={style} />);
      } else {
        cols.push(<col key={column.key} style={{ minWidth: '140px' }} />);
      }
    });
    if (hiddenByLimitCount > 0 && detailPanel) {
      cols.push(<col key="hidden" style={{ width: '70px', minWidth: '70px' }} />);
    }
    if (hasRowActions) {
      cols.push(<col key="actions" style={{ width: '180px', minWidth: '180px' }} />);
    }
    return cols;
  }, [enableRowSelection, visibleColumns, hiddenByLimitCount, detailPanel, hasRowActions, resolveColumnWidth]);

  const getRowActions = (item: T): { primaryAction?: TableAction; actions: TableAction[] } => {
    const actions: TableAction[] = [];
    let primaryAction: TableAction | undefined;

    if (detailPanel || onRowClick) {
      primaryAction = {
        key: 'view-detail',
        label: 'Ver detalles',
        icon: <Eye size={16} />,
        onClick: () => handleRowClick(item),
      };
    }

    const secondaryActions = getActions(item);
    for (const action of secondaryActions) {
      const label = typeof action.label === 'function' ? action.label(item) : action.label;
      actions.push({
        key: label,
        label,
        icon: action.icon,
        iconClassName: action.iconClassName,
        onClick: () => action.onClick(item),
        danger: action.danger,
        disabled:
          typeof action.disabled === 'function' ? action.disabled(item) : action.disabled,
      });
    }

    return { primaryAction, actions };
  };

  // We don't use export: true on mobile, so the export dropdown
  // stays hidden on small screens. See `enableExport` check in render body.
  const exportToCSV = useCallback(() => {
    const headers = allColumns.map(column => column.header).join(',');
    const rows = processedData.map(item => allColumns.map(column => escapeCsv(getExportValue(item, column))).join(',')).join('\n');
    const csv = `\uFEFF${headers}\n${rows}`;
    downloadFile(new Blob([csv], { type: 'text/csv;charset=utf-8;' }), getExportFileName(exportFileName, 'csv'));
  }, [allColumns, processedData, exportFileName]);

  const exportToExcel = useCallback(() => {
    const headerCells = allColumns.map(column => `<th>${escapeHtml(column.header)}</th>`).join('');
    const bodyRows = processedData.map(item => `<tr>${allColumns.map(column => `<td>${escapeHtml(getExportValue(item, column))}</td>`).join('')}</tr>`).join('');
    const tableHTML = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head><meta charset="utf-8"><style>body{font-family:Segoe UI,Arial,sans-serif;}table{border-collapse:collapse;width:100%;}th{background:#f8fafc;color:#334155;font-size:12px;text-transform:uppercase;letter-spacing:.05em;text-align:left;padding:10px 12px;border-bottom:1px solid #e2e8f0;}td{padding:9px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#0f172a;}</style></head>
      <body><table border="1"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table></body>
      </html>
    `;
    downloadFile(new Blob([tableHTML], { type: 'application/vnd.ms-excel;charset=utf-8;' }), getExportFileName(exportFileName, 'xls'));
  }, [allColumns, processedData, exportFileName]);

  const exportToPDF = useCallback(() => {
    const headerCells = allColumns.map(column => `<th>${escapeHtml(column.header)}</th>`).join('');
    const bodyRows = processedData.map(item => `<tr>${allColumns.map(column => `<td>${escapeHtml(getExportValue(item, column))}</td>`).join('')}</tr>`).join('');
    const generatedAt = new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${escapeHtml(exportFileName)}</title>
        <style>
          body{font-family:Segoe UI,Arial,sans-serif;padding:28px;color:#0f172a;}
          h1{font-size:20px;margin:0 0 6px;}
          .date{color:#64748b;font-size:12px;margin-bottom:24px;}
          table{width:100%;border-collapse:collapse;font-size:12px;}
          th{background:#f8fafc;padding:10px 12px;text-align:left;font-weight:700;border-bottom:2px solid #e2e8f0;color:#475569;text-transform:uppercase;font-size:11px;letter-spacing:.05em;}
          td{padding:10px 12px;border-bottom:1px solid #f1f5f9;}
          tr:last-child td{border-bottom:2px solid #e2e8f0;}
          .footer{margin-top:24px;font-size:11px;color:#94a3b8;text-align:center;}
        </style>
      </head>
      <body>
        <h1>${escapeHtml(exportFileName)}</h1>
        <div class="date">Generado el ${escapeHtml(generatedAt)} · ${processedData.length} registros</div>
        <table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>
        <div class="footer">SurtiTelas · Documento generado automáticamente</div>
      </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 300);
  }, [allColumns, processedData, exportFileName]);

  const renderFilterControl = (column: DataTableColumn<T>) => {
    const value = columnFilters[column.key] ?? '';
    if (column.filterType === 'select' && column.filterOptions?.length) {
      return (
        <select
          value={value}
          onChange={event => handleColumnFilter(column.key, event.target.value)}
          className={s.filterSelect}
        >
          <option value="">{column.filterPlaceholder ?? `Todos`}</option>
          {column.filterOptions.map(option => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      );
    }

    return (
      <input
        type="text"
        value={value}
        onChange={event => handleColumnFilter(column.key, event.target.value)}
        placeholder={column.filterPlaceholder ?? `Filtrar ${column.header.toLowerCase()}...`}
        className={s.filterInput}
      />
    );
  };

  return (
    <div className={cn(s.card, className)} ref={tableRef}>
      <div className={s.toolbar}>
        <div className={s.toolbarLeft}>
          {toolbarLeft ?? (
            <div className={s.toolbarMeta}>
              <span className={s.toolbarTitle}>{title}</span>
              {subtitle && <span className={s.toolbarSubtitle}>{subtitle}</span>}
              <span className={s.toolbarCount}>{processedData.length} registros</span>
            </div>
          )}
        </div>
        <div className={s.toolbarRight}>
          {enableColumnFilters && (
            <Button
              variant={filtersOpen || hasActiveFilters ? 'secondary' : 'ghost'}
              size="sm"
              leftIcon={<Filter size={14} />}
              rightIcon={hasActiveFilters ? <span className={s.filterBadge}>{activeFilterCount}</span> : undefined}
              onClick={() => setFiltersOpen(current => !current)}
            >
              Filtros
            </Button>
          )}
          {enableExport && (
            <DropdownMenu
              align="right"
              trigger={
                <Button variant="secondary" size="sm" leftIcon={<Download size={14} />} rightIcon={<ChevronDown size={12} />}>
                  Exportar
                </Button>
              }
              items={[
                { label: 'PDF', icon: <FileText size={14} />, onClick: exportToPDF },
                { label: 'Excel', icon: <FileText size={14} />, onClick: exportToExcel },
                { label: 'CSV', icon: <FileText size={14} />, onClick: exportToCSV },
              ]}
            />
          )}
          {toolbarRight}
        </div>
      </div>

      {enableColumnFilters && (filtersOpen || hasActiveFilters) && (
        <div className={s.filterPanel}>
          <div className={s.filterSearch}>
            <SearchInput
              value={searchText}
              onSearch={setSearchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Buscar en toda la tabla..."
              className="flex-1"
              debounceMs={100}
              minChars={0}
            />
          </div>
          <div className={s.filterGrid}>
            {filterableColumns.map(column => (
              <label key={column.key} className={s.filterControl}>
                <span>{column.header}</span>
                {renderFilterControl(column)}
              </label>
            ))}
          </div>
          {hasActiveFilters && (
            <button type="button" className={s.clearFiltersButton} onClick={clearAllFilters}>
              Limpiar filtros
            </button>
          )}
        </div>
      )}

      {selectedCount > 0 && enableRowSelection && (
        <div className={s.selectionBar}>
          <div className={s.selectionText}>
            <strong>{selectedCount}</strong> {selectedCount === 1 ? 'registro seleccionado' : 'registros seleccionados'}
          </div>
          <Button variant="ghost" size="xs" onClick={clearSelection}>Limpiar selección</Button>
        </div>
      )}

      <div className={s.tableWrap} style={{ maxHeight }}>
        <table className={cn(s.table, compact && s.tableCompact)}>
          <colgroup>
            {colgroup}
          </colgroup>
          <thead>
            <tr className={s.headerRow} style={headerBg ? { backgroundColor: headerBg } : undefined}>
              {enableRowSelection && (
                   <th className={cn(s.headerCell, s.selectionHeader, compact && s.headerCellCompact)} style={selectionWidthStyle} aria-label="Seleccionar registros">
                     <button type="button" className={s.selectionButton} onClick={toggleSelectAll} aria-label={isAllSelected ? 'Deseleccionar todos' : 'Seleccionar todos'}>
                       {isAllSelected ? <CheckSquare size={16} className={s.checkedIcon} /> : isSomeSelected ? <span className={s.indeterminateBox} /> : <Square size={16} />}
                     </button>
                   </th>
                 )}
                 {visibleColumns.map((column, index) => {
                   const activeSort = sortConfig?.key === column.key;
                   const sortIcon = enableSorting && column.sortable !== false ? (
                     activeSort ? (
                       sortConfig.direction === 'asc' ? <ArrowUp size={13} className={s.sortIcon} /> : <ArrowDown size={13} className={s.sortIcon} />
                     ) : <ArrowUpDown size={13} className={s.sortIconMuted} />
                   ) : null;

                    return (
                       <th
                         key={column.key}
                         className={cn(
                           s.headerCell,
                           compact && s.headerCellCompact,
                           column.align === 'right' && s.alignRight,
                           column.align === 'center' && s.alignCenter,
                           index === 0 && s.primaryHeader
                         )}
                         style={getColumnWidthStyle(column)}
                         aria-sort={activeSort ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                       >
                        {enableSorting && column.sortable !== false ? (
                          <button type="button" className={s.headerButton} onClick={() => handleSort(column.key)}>
                            <span>{column.header}</span>
                            {sortIcon}
                          </button>
                        ) : (
                          <span className={s.headerLabel}>{column.header}{sortIcon}</span>
                        )}
                      </th>
                    );
                  })}
                  {hasRowActions && (
                    <th className={cn(s.headerCell, s.actionHeader, compact && s.headerCellCompact)} style={actionsWidthStyle}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        Acciones
                        {hiddenByLimitCount > 0 && detailPanel && (
                          <span className={s.hiddenColsIndicator} data-bs-toggle="tooltip" data-bs-title={`${hiddenByLimitCount} columnas ocultas disponibles en el detalle`}>
                            +{hiddenByLimitCount}
                          </span>
                        )}
                      </div>
                    </th>
                  )}
              </tr>
            </thead>
          <tbody>
            {pageData.length === 0 ? (
              <tr>
                <td colSpan={visibleColumns.length + (enableRowSelection ? 1 : 0) + (hiddenByLimitCount > 0 && detailPanel ? 1 : 0) + (hasRowActions ? 1 : 0)} className={s.emptyCell}>
                  <div className={s.emptyState}>
                    <div className={s.emptyIcon}><FileText size={18} /></div>
                    <p>{emptyMessage}</p>
                    {hasActiveFilters && (
                      <button type="button" className={s.emptyButton} onClick={clearAllFilters}>Limpiar filtros</button>
                    )}
                  </div>
                </td>
              </tr>
            ) : pageData.map((item, index) => {
              const itemId = getId(item) ?? `${safePage}-${index}`;
              const isSelected = getId(item) != null && selectedIds.has(getId(item) as string | number);
              const rowActions = getRowActions(item);
              const firstColumn = visibleColumns[0];
              const firstValue = firstColumn ? getRawValue(item, firstColumn) : undefined;

              return (
                <tr
                  key={itemId}
                  className={cn(
                    s.bodyRow,
                    isSelected && s.bodyRowSelected,
                    (onRowClick || detailPanel) && s.clickableRow
                  )}
                  onClick={() => handleRowClick(item)}
                >
 {enableRowSelection && (
                       <td className={cn(s.selectionCell, compact && s.selectionCellCompact)} style={selectionWidthStyle} onClick={event => event.stopPropagation()}>
                         <button type="button" className={cn(s.selectionButton, compact && s.selectionButtonCompact)} onClick={() => toggleSelect(getId(item))} aria-label={isSelected ? 'Deseleccionar fila' : 'Seleccionar fila'}>
                           {isSelected ? <CheckSquare size={16} className={s.checkedIcon} /> : <Square size={16} />}
                         </button>
                       </td>
                     )}
                    {visibleColumns.map((column, columnIndex) => {
                     const rawValue = getRawValue(item, column);
                     const content = getDisplayValue(item, column);

                      return (
                        <td
                          key={column.key}
                          className={cn(
                            s.bodyCell,
                            compact && s.bodyCellCompact,
                            column.align === 'right' && s.alignRight,
                            column.align === 'center' && s.alignCenter,
                            columnIndex === 0 && s.primaryCell
                          )}
                           style={getColumnWidthStyle(column)}
                           data-bs-toggle={columnIndex === 0 ? 'tooltip' : undefined}
                           data-bs-title={columnIndex === 0 ? (typeof rawValue === 'string' ? rawValue : typeof firstValue === 'string' ? String(firstValue) : undefined) : undefined}
                       >
                          {content ?? <span className={s.mutedValue}>—</span>}
                        </td>
                      );
                   })}
                       {hiddenByLimitCount > 0 && detailPanel && (
                         <td className={cn(s.bodyCell, s.hiddenColsCell, compact && s.hiddenColsCellCompact)} style={hiddenColsWidthStyle} onClick={event => event.stopPropagation()}>
                           <button
                             type="button"
                              className={cn(s.detailInlineBtn, compact && s.detailInlineBtnCompact)}
                              onClick={() => { setSelectedDetailItem(item); setShowDetailPanel(true); }}
                              data-bs-toggle="tooltip"
                              data-bs-title={`${hiddenByLimitCount} columnas adicionales`}
                           >
                             <Eye size={14} />
                             <span className={s.detailInlineText}>Ver más</span>
                           </button>
                         </td>
                       )}
                         {hasRowActions && (
                           <td className={cn(s.actionCell, compact && s.actionCellCompact)} style={actionsWidthStyle} onClick={event => event.stopPropagation()}>
                            {actionsCellRenderer ? (
                              actionsCellRenderer(item, rowActions, (detailItem) => {
                                setSelectedDetailItem(detailItem);
                                setShowDetailPanel(true);
                              })
                            ) : (
                             <TableActionsMenu
                               align="right"
                               trigger={
                                 <button
                                   type="button"
                                    className={cn(s.actionButton, compact && s.actionButtonCompact)}
                                    aria-label="Abrir menú de acciones"
                                  >
                                   <MoreHorizontal size={16} strokeWidth={2} />
                                 </button>
                               }
                               primaryAction={rowActions.primaryAction}
                               actions={rowActions.actions}
                             />
                           )}
                         </td>
                       )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className={cn(s.footer, compact && s.footerCompact)}>
        <div className={cn(s.footerInfo, compact && s.footerInfoCompact)}>
          {serverMode && effectiveTotalItems > 0 ? (
            <>
              <span className={s.footerRange}>Mostrando {from}-{to}</span>
              <span> de </span>
              <span>{effectiveTotalItems}</span>
              <span className={s.pageSizePill}>{pageSize} por página</span>
            </>
          ) : (
            <>
              <span className={s.footerRange}>{from}-{to}</span>
              <span> de </span>
              <span>{processedData.length}</span>
              <span className={s.pageSizePill}>{pageSize} por página</span>
            </>
          )}
        </div>

        <div className={cn(s.pagination, compact && s.paginationCompact)}>
          <JumpButton onClick={() => goTo(1)} disabled={safePage <= 1} title="Primera página" compact={compact}><ChevronsLeft size={14} /></JumpButton>
          <JumpButton onClick={() => goTo(safePage - 1)} disabled={safePage <= 1} title="Anterior" compact={compact}><ChevronLeft size={14} /></JumpButton>
          {Array.from({ length: Math.min(5, totalPages) }, (_, index) => {
            let page: number;
            if (totalPages <= 5) page = index + 1;
            else if (safePage <= 3) page = index + 1;
            else if (safePage >= totalPages - 2) page = totalPages - 4 + index;
            else page = safePage - 2 + index;

            return (
              <Button
                key={page}
                variant={page === safePage ? 'primary' : 'ghost'}
                size="icon-xs"
                onClick={() => goTo(page)}
                className={cn(s.pageButton, page === safePage && s.pageButtonActive, compact && s.pageButtonCompact)}
              >
                {page}
              </Button>
            );
          })}
          <JumpButton onClick={() => goTo(safePage + 1)} disabled={safePage >= totalPages} title="Siguiente" compact={compact}><ChevronRight size={14} /></JumpButton>
          <JumpButton onClick={() => goTo(totalPages)} disabled={safePage >= totalPages} title="Última página" compact={compact}><ChevronsRight size={14} /></JumpButton>
        </div>
      </div>

      {detailPanel && selectedDetailItem && (
        <DetailModal
          open={showDetailPanel}
          onClose={() => {
            setShowDetailPanel(false);
            setSelectedDetailItem(null);
          }}
          title={detailPanel.title(selectedDetailItem)}
          header={detailPanel.header?.(selectedDetailItem)}
          kpis={detailPanel.kpis?.(selectedDetailItem)}
          observations={detailPanel.observations?.(selectedDetailItem)}
          size={detailPanel.size ?? modalSize ?? 'lg'}
        >
          {detailPanel.render(selectedDetailItem, () => {
            setShowDetailPanel(false);
            setSelectedDetailItem(null);
          })}
        </DetailModal>
      )}
    </div>
  );
}

export { TABLE_EMPTY_TEXT };
