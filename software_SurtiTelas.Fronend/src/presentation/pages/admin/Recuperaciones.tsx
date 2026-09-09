import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/Button';
import s from './Recuperaciones.module.css';
import { SearchInput } from '@/shared/ui/SearchInput';
import { DataTable, DataTableColumn, DataTableDetailPanel, DataTableAction } from '@/shared/ui/DataTable';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { recoveryApi, type RecoveryRequest } from '@/infrastructure/api/recoveryApi';
import { ConfirmationModal } from '@/shared/ui/ConfirmationModal';

const ESTADOS = ['Pendiente', 'Completada', 'Expirada', 'Rechazada'] as const;
type Estado = typeof ESTADOS[number];

interface Filtros {
  estado: Estado | 'Todos';
  busqueda: string;
}

export const AdminRecuperaciones: React.FC = () => {
  const [solicitudes, setSolicitudes] = useState<RecoveryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtros, setFiltros] = useState<Filtros>({ estado: 'Todos', busqueda: '' });
  const [rechazo, setRechazo] = useState<RecoveryRequest | null>(null);
  const [motivo, setMotivo] = useState('');

  const cargar = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { items } = await recoveryApi.list();
      setSolicitudes(items);
    } catch {
      setError('No se pudieron cargar las solicitudes de recuperación');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void cargar(); }, [cargar]);

  const filtradas = useMemo(() => {
    return solicitudes.filter(s => {
      if (filtros.estado !== 'Todos' && s.estado !== filtros.estado) return false;
      const q = filtros.busqueda.toLowerCase();
      if (!q) return true;
      return (
        s.email.toLowerCase().includes(q) ||
        s.userId.toLowerCase().includes(q) ||
        s.id.toLowerCase().includes(q)
      );
    });
  }, [solicitudes, filtros]);

  const handleRechazar = async () => {
    if (!rechazo || !motivo.trim()) return;
    try {
      await recoveryApi.reject(rechazo.id, motivo.trim());
      toast.success('Solicitud rechazada');
      setRechazo(null);
      setMotivo('');
      void cargar();
    } catch {
      toast.error('No se pudo rechazar la solicitud');
    }
  };

  const columns: DataTableColumn<RecoveryRequest>[] = [
    { key: 'id', header: 'ID', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'estado', header: 'Estado', sortable: true, render: (s) => <StatusBadge status={s.estado} /> },
    { key: 'fechaSolicitud', header: 'Fecha solicitud', sortable: true },
    { key: 'expiracion', header: 'Expiración', sortable: true },
  ];

  const detailPanel: DataTableDetailPanel<RecoveryRequest> = {
    title: (r) => `Recuperación ${r.id}`,
    render: (r) => (
      <div className={s.detailPanel}>
        <div className={s.detailRow}><span>Usuario ID:</span> {r.userId}</div>
        <div className={s.detailRow}><span>Email:</span> {r.email}</div>
        <div className={s.detailRow}><span>Estado:</span> {r.estado}</div>
        <div className={s.detailRow}><span>Fecha solicitud:</span> {r.fechaSolicitud}</div>
        <div className={s.detailRow}><span>Expira:</span> {r.expiracion}</div>
        <div className={s.detailRow}><span>Completada:</span> {r.completada ?? '—'}</div>
        <div className={s.detailRow}><span>IP:</span> {r.ip ?? '—'}</div>
      </div>
    ),
  };

  const actions: DataTableAction<RecoveryRequest>[] = [
    { label: 'Rechazar', onClick: (item) => { setRechazo(item); setMotivo(''); }, disabled: (item) => item.estado !== 'Pendiente' },
  ];

  return (
    <div className={s.pageContainer}>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Recuperaciones</h1>
          <p className={s.pageSubtitle}>Solicitudes de recuperación de contraseña</p>
        </div>
        <Button onClick={cargar} variant="secondary">Recargar</Button>
      </div>

      <div className={s.filters}>
        <SearchInput
          placeholder="Buscar por email o ID..."
          value={filtros.busqueda}
          onChange={(e) => setFiltros(f => ({ ...f, busqueda: e.target.value }))}
          onSearch={(value) => setFiltros(f => ({ ...f, busqueda: value }))}
          debounceMs={300}
          minChars={0}
        />
        <select
          className={s.select}
          value={filtros.estado}
          onChange={(e) => setFiltros(f => ({ ...f, estado: e.target.value as Estado | 'Todos' }))}
        >
          <option value="Todos">Todos</option>
          {ESTADOS.map(e => <option key={e} value={e}>{e}</option>)}
        </select>
      </div>

      {error && <div className={s.errorBox}>{error}</div>}

      <div className={s.tableWrapper}>
        {loading && <div className={s.loadingRow}>Cargando solicitudes...</div>}
        <DataTable
          data={filtradas}
          columns={columns}
          detailPanel={detailPanel}
          actions={actions}
          enableColumnFilters={false}
          enableSorting={true}
          toolbarLeft={null}
          maxVisibleColumns={5}
          emptyMessage={loading ? 'Cargando...' : error ? error : 'No hay solicitudes'}
          enableExport={false}
          enableRowSelection={false}
        />
      </div>

      <ConfirmationModal
        open={!!rechazo}
        onClose={() => { setRechazo(null); setMotivo(''); }}
        onConfirm={handleRechazar}
        title="Rechazar solicitud"
        description={`¿Estás seguro de que deseas rechazar la solicitud de ${rechazo?.email ?? ''}?`}
        confirmLabel="Rechazar"
        variant="danger"
      />
    </div>
  );
};
