import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Shield, Clock, User, Globe } from 'lucide-react';
import s from './Auditoria.module.css';
import { SearchInput } from '@/shared/ui/SearchInput';
import { Button } from '@/shared/ui/Button';
import { DataTable, DataTableColumn, DataTableDetailPanel } from '@/shared/ui/DataTable';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { auditApi, type AuditLog } from '@/infrastructure/api/auditApi';
import { ESTADOS_AUDITORIA } from '@/shared/constants/options';

type EstadoAuditoria = (typeof ESTADOS_AUDITORIA)[number];

interface Auditoria {
  id: string;
  usuario: string;
  accion: string;
  modulo: string;
  ip: string;
  fecha: string;
  hora: string;
  estado: EstadoAuditoria;
}

function deriveEstado(accion: string): EstadoAuditoria {
  const a = accion.toLowerCase();
  if (a.includes('fallid') || a.includes('error') || a.includes('denegad') || a.includes('rechaz')) return 'Fallido';
  if (a.includes('no autorizado') || a.includes('intento') || a.includes('alerta') || a.includes('sospech')) return 'Alerta';
  return 'Éxito';
}

function toAuditoria(log: AuditLog): Auditoria {
  const created = new Date(log.createdAt);
  const validDate = !Number.isNaN(created.getTime());
  return {
    id: log.id,
    usuario: log.usuario?.nombre ?? 'Sistema',
    accion: log.accion,
    modulo: log.modulo,
    ip: log.ip ?? '—',
    fecha: validDate ? created.toISOString().slice(0, 10) : '—',
    hora: validDate ? created.toTimeString().slice(0, 8) : '—',
    estado: deriveEstado(log.accion),
  };
}

export const AdminAuditoria: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filtro, setFiltro] = useState<'Todos' | EstadoAuditoria>('Todos');
  const [auditorias, setAuditorias] = useState<Auditoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditorias = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await auditApi.list();
      setAuditorias(data.map(toAuditoria));
    } catch {
      setError('No se pudieron cargar los registros de auditoría');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchAuditorias(); }, [fetchAuditorias]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return auditorias.filter(a =>
      (filtro === 'Todos' || a.estado === filtro) &&
      (a.usuario.toLowerCase().includes(q) ||
        a.accion.toLowerCase().includes(q) ||
        a.modulo.toLowerCase().includes(q))
    );
  }, [auditorias, filtro, search]);

  const columns: DataTableColumn<Auditoria>[] = [
    { key: 'id', header: 'ID', sortable: true },
    { key: 'usuario', header: 'Usuario', sortable: true, render: (a) => (
      <div className={s.usuarioCell}>
        <User size={14} />
        <span className={s.tdPrimary}>{a.usuario}</span>
      </div>
    ) },
    { key: 'accion', header: 'Acción', sortable: true },
    { key: 'modulo', header: 'Módulo', sortable: true },
    { key: 'ip', header: 'IP', sortable: true, render: (a) => (
      <div className={s.ipCell}>
        <Globe size={14} />
        {a.ip}
      </div>
    ) },
    { key: 'fecha', header: 'Fecha', sortable: true },
    { key: 'hora', header: 'Hora', sortable: true },
    { key: 'estado', header: 'Estado', sortable: true, render: (a) => (
      <StatusBadge status={a.estado} />
    ) },
  ];

  const detailPanel: DataTableDetailPanel<Auditoria> = {
    title: (a) => `Detalle de auditoría - ${a.id}`,
    size: 'lg',
    header: (a) => ({
      icon: <Shield size={18} />,
      title: 'Registro de auditoría',
      code: a.id,
      subtitle: `${a.modulo} · ${a.fecha}`,
      status: a.estado,
      badgeVariant: a.estado === 'Éxito' ? 'success' : a.estado === 'Fallido' ? 'default' : 'warning',
    }),
    kpis: (a) => [
      { label: 'Módulo', value: a.modulo, icon: <Shield size={16} />, tone: 'primary' },
      { label: 'IP', value: a.ip, icon: <Globe size={16} />, tone: 'default' },
      { label: 'Fecha', value: `${a.fecha} ${a.hora}`, icon: <Clock size={16} />, tone: 'default' },
    ],
    render: (a) => (
      <div className={s.detailPanel}>
        <div className={s.detailRow}><span>Usuario:</span> {a.usuario}</div>
        <div className={s.detailRow}><span>Acción:</span> {a.accion}</div>
        <div className={s.detailRow}><span>Módulo:</span> {a.modulo}</div>
        <div className={s.detailRow}><span>IP:</span> {a.ip}</div>
        <div className={s.detailRow}><span>Fecha:</span> {a.fecha}</div>
        <div className={s.detailRow}><span>Hora:</span> {a.hora}</div>
      </div>
    ),
  };

  return (
    <div className={s.pageContainer}>
      <div className={s.header}>
        <div className={s.headerTop}>
          <div>
            <h1 className={s.pageTitle}>Auditoría</h1>
            <p className={s.pageSubtitle}>Registro de actividades del sistema</p>
          </div>
        </div>
        <div className={s.statsRow}>
          <div className={s.statCard}>
            <Shield size={20} className={s.statIcon} />
            <div>
              <div className={s.statValue}>{auditorias.filter(a => a.estado === 'Éxito').length}</div>
              <div className={s.statLabel}>Éxitos</div>
            </div>
          </div>
          <div className={s.statCard}>
            <Shield size={20} className={s.statIcon} />
            <div>
              <div className={s.statValue}>{auditorias.filter(a => a.estado === 'Alerta').length}</div>
              <div className={s.statLabel}>Alertas</div>
            </div>
          </div>
          <div className={s.statCard}>
            <Clock size={20} className={s.statIcon} />
            <div>
              <div className={s.statValue}>{auditorias.length}</div>
              <div className={s.statLabel}>Registros</div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className={s.errorBox}>
          <span>{error}</span>
          <Button className={s.retryBtn} onClick={() => void fetchAuditorias()}>Reintentar</Button>
        </div>
      )}

      <div className={s.filters}>
        <div className={s.filterPanel}>
          <div className={s.filterGroup}>
            {['Todos', ...ESTADOS_AUDITORIA].map(f => (
              <button
                key={f}
                className={`${s.filterBtn} ${filtro === f ? s.filterBtnActive : ''}`}
                onClick={() => setFiltro(f as typeof filtro)}
              >
                {f}
              </button>
            ))}
          </div>
          <SearchInput
            placeholder="Buscar en auditoría..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onSearch={(value) => setSearch(value)}
            debounceMs={100}
            minChars={0}
          />
        </div>
      </div>

      <div className={s.tableWrapper}>
        <DataTable
          data={filtered}
          columns={columns}
          detailPanel={detailPanel}
          enableColumnFilters={false}
          enableSorting={true}
          toolbarLeft={null}
          maxVisibleColumns={5}
          emptyMessage={loading ? 'Cargando auditoría...' : error ? error : 'No se encontraron registros'}
          enableExport={false}
          enableRowSelection={false}
        />
      </div>
    </div>
  );
};
