import React, { useState, useEffect, useCallback } from 'react';
import { Search, AlertTriangle, Bell, Clock, Calendar, Factory, Package, X, CheckCircle } from 'lucide-react';
import s from './AlertasAsignacionProduccion.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable } from '@/shared/ui/DataTable';
import { alertsApi, type Alert } from '@/infrastructure/api/alertsApi';
import { TIPO_ALERTA_ASIGNACION, ESTADOS_ALERTA } from '@/shared/constants/options';

interface AlertaAsignacion {
  id: string;
  numeroOrden: string;
  prenda: string;
  tallerNombre: string;
  tipo: string;
  descripcion: string;
  fechaAlerta: string;
  estado: (typeof ESTADOS_ALERTA)[number] | 'Cancelada';
  prioridad: 'Alta' | 'Media' | 'Baja';
}

const TIPO_MAP = TIPO_ALERTA_ASIGNACION;

const MODULO = 'asignacion-produccion';

function mapAlert(a: Alert): AlertaAsignacion {
  const metadata = (a.metadata ?? {}) as Record<string, unknown>;
  const tipo = TIPO_MAP[a.tipo] ?? (a.tipo as AlertaAsignacion['tipo']);
  return {
    id: a.id,
    numeroOrden: (metadata.numeroOrden as string) ?? a.referenciaId ?? '-',
    prenda: (metadata.prenda as string) ?? '-',
    tallerNombre: (metadata.tallerNombre as string) ?? '-',
    tipo,
    descripcion: a.mensaje,
    fechaAlerta: a.createdAt ? a.createdAt.slice(0, 10) : '-',
    estado: a.estado,
    prioridad: a.prioridad as AlertaAsignacion['prioridad'],
  };
}

export const AdminAlertasAsignacionProduccion: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | (typeof ESTADOS_ALERTA)[number]>('Todos');
  const [filtroTipo, setFiltroTipo] = useState<string>('Todos');
  const [selectedAlerta, setSelectedAlerta] = useState<AlertaAsignacion | null>(null);
  const [alertas, setAlertas] = useState<AlertaAsignacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAlertas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await alertsApi.list({ modulo: MODULO });
      setAlertas(data.map(mapAlert));
    } catch (_e) {
      setError('No se pudieron cargar las alertas');
      setAlertas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAlertas();
  }, [loadAlertas]);

  const handleMarcarResuelta = async (alerta: AlertaAsignacion) => {
    try {
      await alertsApi.markAsResolved(alerta.id);
      await loadAlertas();
    } catch {
      setError('No se pudo marcar como resuelta');
    }
  };

  const filteredAlertas = alertas.filter(a =>
    (filtroEstado === 'Todos' || a.estado === filtroEstado) &&
    (filtroTipo === 'Todos' || a.tipo === filtroTipo) &&
    (a.numeroOrden.toLowerCase().includes(search.toLowerCase()) ||
     a.prenda.toLowerCase().includes(search.toLowerCase()) ||
     a.tallerNombre.toLowerCase().includes(search.toLowerCase()) ||
     a.descripcion.toLowerCase().includes(search.toLowerCase()))
  );

  const tiposUnicos = Array.from(new Set(alertas.map(a => a.tipo)));

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'Orden sin asignar': return <Package size={14} />;
      case 'Taller sin capacidad': return <Factory size={14} />;
      case 'Fecha comprometida': return <Calendar size={14} />;
      case 'Retraso en asignacion': return <Clock size={14} />;
      case 'Cambio de taller': return <AlertTriangle size={14} />;
      default: return <AlertTriangle size={14} />;
    }
  };

  const getPrioridadColor = (prioridad: string) => {
    switch (prioridad) {
      case 'Alta': return s.prioridadAlta;
      case 'Media': return s.prioridadMedia;
      case 'Baja': return s.prioridadBaja;
      default: return '';
    }
  };

  const stats = {
    pendientes: alertas.filter(a => a.estado === 'Pendiente').length,
    criticas: alertas.filter(a => a.prioridad === 'Alta' && a.estado !== 'Resuelta').length,
    resueltas: alertas.filter(a => a.estado === 'Resuelta').length,
  };

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Alertas de Asignación de Producción</h1>
          <p className={s.pageSubtitle}>Asignar órdenes a talleres</p>
        </div>
        <div className={s.statsRow}>
          <div className={s.statCard}>
            <Bell size={20} className={s.statIcon} />
            <div>
              <div className={s.statValue}>{stats.pendientes}</div>
              <div className={s.statLabel}>Pendientes</div>
            </div>
          </div>
          <div className={`${s.statCard} ${s.statCardWarning}`}>
            <AlertTriangle size={20} className={s.statIconWarning} />
            <div>
              <div className={s.statValue}>{stats.criticas}</div>
              <div className={s.statLabel}>Críticas</div>
            </div>
          </div>
          <div className={s.statCard}>
            <div className={s.statIconDone}>✓</div>
            <div>
              <div className={s.statValue}>{stats.resueltas}</div>
              <div className={s.statLabel}>Resueltas</div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className={s.errorBox}>
          <span>{error}</span>
          <Button className={s.retryBtn} onClick={loadAlertas}>Reintentar</Button>
        </div>
      )}

      <div className={s.filters}>
        <div className={s.filterGroup}>
          {['Todos', ...ESTADOS_ALERTA].map(estado => (
            <button
              key={estado}
              className={`${s.filterBtn} ${filtroEstado === estado ? s.filterBtnActive : ''}`}
              onClick={() => setFiltroEstado(estado as typeof filtroEstado)}
            >
              {estado}
            </button>
          ))}
        </div>
        <div className={s.filterGroup}>
          {tiposUnicos.map(tipo => (
            <button
              key={tipo}
              className={`${s.filterBtn} ${filtroTipo === tipo ? s.filterBtnActive : ''}`}
              onClick={() => setFiltroTipo(tipo)}
            >
              {getTipoIcon(tipo)}
              <span className={s.filterBtnText}>{tipo}</span>
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
            className={s.searchInput}
          />
        </div>
      </div>

      {loading ? (
        <div className={s.loadingBox}>Cargando alertas...</div>
      ) : (
        <DataTable enableExport={false} enableRowSelection={false}
          data={filteredAlertas}
          pageSize={10}
          emptyMessage="No se encontraron alertas"
          onRowClick={setSelectedAlerta}
          actions={(a) => [
            ...(a.estado !== 'Resuelta' ? [{ label: 'Marcar resuelta', icon: <CheckCircle size={14} />, onClick: () => handleMarcarResuelta(a) }] : []),
          ]}
          columns={[
            { key: 'id', header: 'ID', width: '80px', render: (a) => <span className={s.tdMono}>{a.id}</span> },
            { key: 'numeroOrden', header: 'Orden', width: '120px', render: (a) => <span className={s.tdMono}>{a.numeroOrden}</span> },
            { key: 'prenda', header: 'Prenda', render: (a) => a.prenda },
            { key: 'tallerNombre', header: 'Taller', width: '160px', render: (a) => (
              a.tallerNombre !== '-' ? (
                <div className={s.tallerCell}>
                  <Factory size={14} />
                  {a.tallerNombre}
                </div>
              ) : <span className={s.sinAsignar}>Sin asignar</span>
            )},
            { key: 'tipo', header: 'Tipo', width: '150px', render: (a) => (
              <div className={s.tipoCell}>
                {getTipoIcon(a.tipo)}
                <span>{a.tipo}</span>
              </div>
            )},
            { key: 'descripcion', header: 'Descripción', width: '180px', render: (a) => (
              <div className={s.descripcionCell} title={a.descripcion}>{a.descripcion}</div>
            )},
            { key: 'prioridad', header: 'Prioridad', width: '100px', render: (a) => (
              <StatusBadge status={a.prioridad} />
            )},
            { key: 'fechaAlerta', header: 'Fecha', width: '110px', render: (a) => (
              <div className={s.fechaCell}>
                <Calendar size={14} />
                {a.fechaAlerta}
              </div>
            )},
            { key: 'estado', header: 'Estado', width: '110px', sortable: true, filterable: true, filterType: 'select', filterOptions: ESTADOS_ALERTA.map(e => ({ value: e, label: e })), render: (a) => (
              <StatusBadge status={a.estado} />
            )},
          ]}
        />
      )}

      {selectedAlerta && (
        <div className={s.modalOverlay}>
          <div className={s.modal} onClick={e => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <h2 className={s.modalTitle}>
                Detalle de Alerta - {selectedAlerta.id}
              </h2>
              <button className={s.closeBtn} onClick={() => setSelectedAlerta(null)}>
                <X size={16} />
              </button>
            </div>
            <div className={s.modalBody}>
              <div className={s.detailGrid}>
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Orden</span>
                  <span className={s.detailValue}>{selectedAlerta.numeroOrden}</span>
                </div>
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Prenda</span>
                  <span className={s.detailValue}>{selectedAlerta.prenda}</span>
                </div>
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Taller</span>
                  <span className={s.detailValue}>{selectedAlerta.tallerNombre}</span>
                </div>
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Tipo</span>
                  <span className={s.detailValue}>{selectedAlerta.tipo}</span>
                </div>
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Prioridad</span>
                  <span className={`${s.detailValue} ${getPrioridadColor(selectedAlerta.prioridad)}`}>
                    {selectedAlerta.prioridad}
                  </span>
                </div>
                <div className={s.detailItem}>
                  <span className={s.detailLabel}>Fecha</span>
                  <span className={s.detailValue}>{selectedAlerta.fechaAlerta}</span>
                </div>
                <div className={s.detailItemFull}>
                  <span className={s.detailLabel}>Descripción</span>
                  <span className={s.detailValue}>{selectedAlerta.descripcion}</span>
                </div>
              </div>
              <div className={s.formActions}>
                <Button variant="secondary" onClick={() => setSelectedAlerta(null)}>
                  Cerrar
                </Button>
                {selectedAlerta.estado !== 'Resuelta' && (
                  <Button onClick={() => { handleMarcarResuelta(selectedAlerta); setSelectedAlerta(null); }}>
                    Marcar como resuelta
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
