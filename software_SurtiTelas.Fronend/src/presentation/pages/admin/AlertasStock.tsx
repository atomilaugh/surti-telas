import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Search, Trash2, AlertTriangle, Package, Bell, CheckCircle, BarChart3 } from 'lucide-react';
import s from './AlertasStock.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable } from '@/shared/ui/DataTable';
import { DataTableColumn, DataTableAction, DataTableDetailPanel } from '@/shared/ui/DataTable';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';
import { inventoryApi, type StockAlert } from '@/infrastructure/api/inventoryApi';
import { alertsApi } from '@/infrastructure/api/alertsApi';
import { ESTADOS_ALERTA_STOCK } from '@/shared/constants/options';

type AlertaStock = StockAlert;

export const AdminAlertasStock: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState<'Todos' | (typeof ESTADOS_ALERTA_STOCK)[number]>('Todos');
  const [alertas, setAlertas] = useState<AlertaStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<AlertaStock | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await inventoryApi.listAlerts();
        setAlertas(result.data);
      } catch {
        setError('No se pudieron cargar las alertas');
        toast.error('No se pudieron cargar las alertas');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filteredAlertas = alertas.filter(a =>
    (filtro === 'Todos' || a.estado === filtro) &&
    ((a.nombre ?? '').toLowerCase().includes(search.toLowerCase()))
  );

  const columns: DataTableColumn<AlertaStock>[] = [
    { key: 'id', header: 'ID', width: '80px', sortable: true, render: (a) => <span className={s.tdMono}>{a.id}</span> },
    { key: 'nombre', header: 'Insumo', sortable: true, render: (a) => (
      <div className={s.insumoCell}>
        <Package size={14} />
        <span className={s.tdPrimary}>{a.nombre}</span>
      </div>
    )},
    { key: 'stockActual', header: 'Stock Actual', width: '110px', sortable: true, align: 'center', render: (a) => (
      <span className={a.stockActual < a.stockMinimo ? s.diferenciaNegativa : ''}>{a.stockActual}</span>
    )},
    { key: 'stockMinimo', header: 'Stock Mínimo', width: '110px', sortable: true, align: 'center', render: (a) => a.stockMinimo },
    { key: 'diferencia', header: 'Diferencia', width: '90px', sortable: true, align: 'center', render: (a) => (
      <span className={a.diferencia < 0 ? s.diferenciaNegativa : s.diferenciaPositiva}>{a.diferencia}</span>
    )},
    { key: 'estado', header: 'Estado', width: '110px', sortable: true, filterable: true, filterType: 'select', filterOptions: ESTADOS_ALERTA_STOCK.map(e => ({ value: e, label: e === 'Critico' ? 'Crítico' : e })), render: (a) => (
      <StatusBadge status={a.estado} />
    )},
  ];

  const detailPanel: DataTableDetailPanel<AlertaStock> = {
    title: (item) => `Alerta ${item.id}`,
    size: 'xl',
    header: (item) => ({
      icon: <Bell size={18} />,
      title: 'Alerta de stock',
      code: item.id,
      subtitle: `${item.nombre} · ${item.categoria}`,
      meta: item.unidadMedida,
      status: <StatusBadge status={item.estado} dot />,
    }),
    kpis: (item) => [
      { label: 'Stock actual', value: item.stockActual, icon: <Package size={16} />, tone: item.stockActual < item.stockMinimo ? 'warning' : 'success' },
      { label: 'Stock mínimo', value: item.stockMinimo, icon: <AlertTriangle size={16} />, tone: 'default' },
      { label: 'Diferencia', value: item.diferencia, helper: item.diferencia < 0 ? 'Requiere reposición' : 'Cobertura suficiente', icon: <BarChart3 size={16} />, tone: item.diferencia < 0 ? 'danger' : 'success' },
    ],
    render: (item) => (
      <div className={s.detailPanel}>
        <div className={s.detailSection}>
          <h4 className={s.detailSectionTitle}>Información del insumo</h4>
          <div className={s.detailGrid}>
            <div className={s.detailItem}><span className={s.detailLabel}>Nombre</span><span>{item.nombre}</span></div>
            <div className={s.detailItem}><span className={s.detailLabel}>Categoría</span><span>{item.categoria}</span></div>
            <div className={s.detailItem}><span className={s.detailLabel}>Unidad</span><span>{item.unidadMedida}</span></div>
            <div className={s.detailItem}><span className={s.detailLabel}>Stock actual</span><span>{item.stockActual}</span></div>
            <div className={s.detailItem}><span className={s.detailLabel}>Stock mínimo</span><span>{item.stockMinimo}</span></div>
            <div className={s.detailItem}><span className={s.detailLabel}>Diferencia</span><span className={item.diferencia < 0 ? s.diferenciaNegativa : s.diferenciaPositiva}>{item.diferencia}</span></div>
          </div>
        </div>
        <div className={s.modalActions}>
          <Button variant="secondary">Cerrar</Button>
        </div>
      </div>
    ),
  };

  const actions: DataTableAction<AlertaStock>[] = [
    { label: 'Resolver', icon: <CheckCircle size={14} aria-hidden="true" focusable="false" />, onClick: async (a) => {
      try {
        await alertsApi.markAsResolved(a.id);
        setAlertas(prev => prev.map(al => al.id === a.id ? { ...al, estado: 'Resuelta' } : al));
        toast.success('Alerta resuelta');
      } catch {
        toast.error('No se pudo resolver la alerta');
      }
    }, disabled: (a) => a.estado === 'Resuelta' },
    { label: 'Eliminar', icon: <Trash2 size={14} aria-hidden="true" focusable="false" />, danger: true, onClick: (a) => setDeleteConfirm(a) },
  ];

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Alertas de Stock</h1>
          <p className={s.pageSubtitle}>Notificaciones de inventario bajo</p>
        </div>
        <div className={s.statsRow}>
          <div className={s.statCard}>
            <AlertTriangle size={20} className={s.statIcon} />
            <div>
              <div className={s.statValue}>{alertas.filter(a => a.estado === 'Pendiente').length}</div>
              <div className={s.statLabel}>Pendientes</div>
            </div>
          </div>
          <div className={s.statCard}>
            <Bell size={20} className={s.statIcon} />
            <div>
              <div className={s.statValue}>{alertas.filter(a => a.estado === 'Critico').length}</div>
              <div className={s.statLabel}>Críticos</div>
            </div>
          </div>
        </div>
      </div>

      <div className={s.filters}>
        <div className={s.filterGroup}>
          {['Todos', ...ESTADOS_ALERTA_STOCK].map(f => (
            <button
              key={f}
              className={`${s.filterBtn} ${filtro === f ? s.filterBtnActive : ''}`}
              onClick={() => setFiltro(f as typeof filtro)}
            >
              {f}
            </button>
          ))}
        </div>
        <div className={s.searchBox}>
          <Search size={16} className={s.searchIcon} />
          <input
            type="text"
            placeholder="Buscar alertas..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={s.searchInput} />
        </div>
      </div>

      <div className={s.tableWrapper}>
        <DataTable enableExport={false} enableRowSelection={false}
          data={filteredAlertas}
          pageSize={10}
          emptyMessage={loading ? 'Cargando alertas...' : error ? error : 'No se encontraron alertas'}
          maxVisibleColumns={5}
          detailPanel={detailPanel}
          actions={actions}
          columns={columns}
          enableColumnFilters={false}

          enableSorting={true}
          toolbarLeft={null} />
      </div>

      <ConfirmationModal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          if (!deleteConfirm) return;
          setAlertas(prev => prev.filter(al => al.id !== deleteConfirm.id));
          toast.success('Alerta eliminada');
          setDeleteConfirm(null);
        }}
        title="Eliminar alerta"
        description={`¿Estás seguro de que deseas eliminar la alerta de "${deleteConfirm?.nombre ?? deleteConfirm?.id}"? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar"
        variant="danger" />
    </div>
  );
};
