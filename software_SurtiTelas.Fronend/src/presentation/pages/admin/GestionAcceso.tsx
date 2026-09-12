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
  accion: string;
  estado: string;
  ip: string;
  fecha: string;
  userAgent: string;
  metadata: Record<string, unknown> | null;
}

const formatFecha = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
};

const toEstado = (accion: string, result?: string | null): string => {
  const a = (accion ?? '').toLowerCase();
  if (a.includes('logout')) return 'Cerrado';
  if (result === 'DENIED' || a.includes('denegado')) return 'Denegado';
  if (
    result === 'FAILURE' ||
    a.includes('fallido') ||
    a.includes('fall') ||
    a.includes('fail')
  )
    return 'Fallido';
  if (
    result === 'SUCCESS' ||
    a.includes('exitoso') ||
    a.includes('success') ||
    a.includes('conced') ||
    a.includes('creado') ||
    a.includes('created')
  )
    return 'Exitoso';
  return 'Observación';
};

const toAcceso = (log: AuditLog): Acceso => {
  const usuario = log.usuario
    ? log.usuario.nombre
    : log.actorUserId
      ? 'Usuario sin perfil'
      : 'Sistema';
  return {
    id: log.id ?? '—',
    usuario,
    rol: log.usuario?.role ?? '—',
    modulo: log.modulo ?? '—',
    accion: log.accion ?? '—',
    estado: toEstado(log.accion ?? '', log.result),
    ip: log.ip ? log.ip : 'No aplica',
    fecha: formatFecha(log.createdAt),
    userAgent: log.userAgent ? log.userAgent : 'No aplica',
    metadata: (log.metadata as Record<string, unknown> | null) ?? null,
  };
};

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
    return items.filter(
      (a) =>
        a.usuario.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        a.rol.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        a.modulo.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        a.accion.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        a.estado.toLowerCase().includes(debouncedSearch.toLowerCase())
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
    title: (item) => `Detalle: ${item.usuario}`,
    render: (item) => (
      <div className={s.detailPanel}>
        <div className={s.detailRow}>
          <span>Usuario:</span> {item.usuario}
        </div>
        <div className={s.detailRow}>
          <span>Rol:</span> {item.rol}
        </div>
        <div className={s.detailRow}>
          <span>Módulo:</span> {item.modulo}
        </div>
        <div className={s.detailRow}>
          <span>Acción/Evento:</span> {item.accion}
        </div>
        <div className={s.detailRow}>
          <span>Estado:</span> {item.estado}
        </div>
        <div className={s.detailRow}>
          <span>IP:</span> {item.ip}
        </div>
        <div className={s.detailRow}>
          <span>Fecha:</span> {item.fecha}
        </div>
        <div className={s.detailRow}>
          <span>User Agent:</span> {item.userAgent}
        </div>
        {item.metadata ? (
          <div className={s.detailRow}>
            <span>Metadata:</span> {JSON.stringify(item.metadata)}
          </div>
        ) : null}
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
        <Button onClick={() => window.location.reload()} variant="secondary">
          Recargar
        </Button>
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
        {error && !loading && <div className={s.errorRow}>{error}</div>}
        <DataTable
          data={filteredAccesos}
          columns={columns}
          detailPanel={detailPanel}
          enableColumnFilters={false}
          enableSorting={true}
          toolbarLeft={null}
          maxVisibleColumns={5}
          enableExport={false}
          enableRowSelection={false}
        />
      </div>
    </div>
  );
};
