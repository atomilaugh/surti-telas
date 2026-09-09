import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { SearchInput } from '@/shared/ui/SearchInput';
import { Button } from '@/shared/ui/Button';
import { DataTable, DataTableColumn, DataTableDetailPanel } from '@/shared/ui/DataTable';
import { auditApi, type AuditLog } from '@/infrastructure/api/auditApi';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import s from './GestionAcceso.module.css';

interface Acceso {
  id: string;
  usuario: string;
  rol: string;
  modulo: string;
  permiso: string;
  fechaAsignacion: string;
  expira: string | null;
  estado: 'Activo' | 'Expirado' | 'Pendiente';
}

const formatFecha = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toISOString().slice(0, 10);
};

const toAcceso = (log: AuditLog): Acceso => ({
  id: log.id,
  usuario: typeof log.usuario === 'object' && log.usuario !== null ? log.usuario.nombre : (log.usuario ?? '—'),
  rol: typeof log.usuario === 'object' && log.usuario !== null ? log.usuario.role : '—',
  modulo: log.modulo ?? '—',
  permiso: `${log.accion}${log.ip ? ` · ${log.ip}` : ''}`,
  fechaAsignacion: formatFecha(log.createdAt),
  expira: null,
  estado: 'Activo',
});

export const AdminGestionAcceso: React.FC = () => {
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 300);
  const [items, setItems] = useState<Acceso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await auditApi.list();
        setItems(data.map(toAcceso));
      } catch {
        setError('No se pudieron cargar los registros de auditoría');
        toast.error('No se pudieron cargar los registros de auditoría');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const filteredAccesos = useMemo(() => {
    return items.filter(a =>
      a.usuario.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      a.rol.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      a.modulo.toLowerCase().includes(debouncedSearch.toLowerCase())
    );
  }, [debouncedSearch, items]);

  const columns: DataTableColumn<Acceso>[] = [
    { key: 'id', header: 'ID', sortable: true },
    { key: 'usuario', header: 'Usuario', sortable: true },
    { key: 'rol', header: 'Rol', sortable: true },
    { key: 'modulo', header: 'Módulo', sortable: true },
    { key: 'estado', header: 'Estado', sortable: true },
  ];

  const detailPanel: DataTableDetailPanel<Acceso> = {
    title: item => `Detalle: ${item.usuario}`,
    render: (item) => (
      <div className={s.detailPanel}>
        <div className={s.detailRow}><span>Módulo:</span> {item.modulo}</div>
        <div className={s.detailRow}><span>Permiso:</span> {item.permiso}</div>
        <div className={s.detailRow}><span>Fecha:</span> {item.fechaAsignacion}</div>
        <div className={s.detailRow}><span>Expira:</span> {item.expira || '-'}</div>
      </div>
    ),
  };

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Gestión de Acceso</h1>
          <p className={s.pageSubtitle}>Registros de auditoría del sistema</p>
        </div>
        <Button onClick={() => window.location.reload()} variant="secondary">Recargar</Button>
      </div>

      <div className={s.toolbar}>
        <SearchInput
          placeholder="Buscar accesos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSearch={(value) => setSearch(value)}
          debounceMs={300}
          minChars={0}
        />
      </div>

      <div className={s.tableWrapper}>
        {loading && (
          <div className={s.loadingRow}>
            <Loader2 size={18} className={s.spin} />
            <span>Cargando registros de acceso...</span>
          </div>
        )}
        {error && !loading && (
          <div className={s.errorRow}>{error}</div>
        )}
        <DataTable
          data={filteredAccesos}
          columns={columns}
          detailPanel={detailPanel}
          enableColumnFilters={false}
          enableSorting={true}
          toolbarLeft={null}
          maxVisibleColumns={5} enableExport={false} enableRowSelection={false}
        />
      </div>
    </div>
  );
};
