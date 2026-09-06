import React, { useState, useEffect, useCallback } from 'react';
import { Search, AlertTriangle, Bell, Clock, Calendar, Factory, Package, X, CheckCircle } from 'lucide-react';
import s from './AlertasSeguimientoProduccion.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { DataTable } from '@/shared/ui/DataTable';
import { alertsApi, type Alert } from '@/infrastructure/api/alertsApi';
import { TIPO_ALERTA_SEGUIMIENTO, ESTADOS_ALERTA } from '@/shared/constants/options';

interface AlertaSeguimiento {
  id: string;
  numeroOrden: string;
  prenda: string;
  tallerNombre: string;
  tipo: string;
  descripcion: string;
  fechaAlerta: string;
  fechaComprometida: string;
  estado: (typeof ESTADOS_ALERTA)[number] | 'Cancelada';
  prioridad: 'Alta' | 'Media' | 'Baja';
  avance: number;
}

const TIPO_MAP = TIPO_ALERTA_SEGUIMIENTO;

const MODULO = 'seguimiento-produccion';

function mapAlert(a: Alert): AlertaSeguimiento {
  const metadata = (a.metadata ?? {}) as Record<string, unknown>;
  const tipo = TIPO_MAP[a.tipo] ?? (a.tipo as AlertaSeguimiento['tipo']);
  return {
    id: a.id,
    numeroOrden: (metadata.numeroOrden as string) ?? a.referenciaId ?? '-',
    prenda: (metadata.prenda as string) ?? '-',
    tallerNombre: (metadata.tallerNombre as string) ?? '-',
    tipo,
    descripcion: a.mensaje,
    fechaAlerta: a.createdAt ? a.createdAt.slice(0, 10) : '-',
    fechaComprometida: (metadata.fechaComprometida as string) ?? '-',
    estado: a.estado,
    prioridad: a.prioridad as AlertaSeguimiento['prioridad'],
    avance: typeof metadata.avance === 'number' ? metadata.avance : 0,
  };
}

export const AdminAlertasSeguimientoProduccion: React.FC = () => {
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'Todos' | (typeof ESTADOS_ALERTA)[number]>('Todos');
  const [filtroTipo] = useState<string>('Todos');
  const [selectedAlerta, setSelectedAlerta] = useState<AlertaSeguimiento | null>(null);
  const [_showFilters] = useState(true);
  const [alertas, setAlertas] = useState<AlertaSeguimiento[]>([]);
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

  const handleMarcarResuelta = async (alerta: AlertaSeguimiento) => {
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

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'Retraso en entrega': return <Clock size={14} />;
      case 'Cancelacion de taller': return <AlertTriangle size={14} />;
      case 'Calidad baja': return <Package size={14} />;
      case 'Cambio de fecha': return <Calendar size={14} />;
      case 'Produccion detenida': return <Factory size={14} />;
      case 'Material faltante': return <Package size={14} />;
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

  const getAvanceColor = (avance: number) => {
    if (avance < 30) return s.avanceBajo;
    if (avance < 70) return s.avanceMedio;
    return s.avanceAlto;
  };

  const stats = {
    pendientes: alertas.filter(a => a.estado === 'Pendiente').length,
    criticas: alertas.filter(a => a.prioridad === 'Alta' && a.estado !== 'Resuelta').length,
    resueltas: alertas.filter(a => a.estado === 'Resuelta').length,
    retrasadas: alertas.filter(a => a.tipo === 'Retraso en entrega' && a.estado !== 'Resuelta').length,
  };

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Alertas de Seguimiento de Producción</h1>
          <p className={s.pageSubtitle}>Tracking de producción externa</p>
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
          <div className={s.statCard}>
            <Clock size={20} className={s.statIconWarning} />
            <div>
              <div className={s.statValue}>{stats.retrasadas}</div>
              <div className={s.statLabel}>Con Retraso</div>
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
              <div className={s.tallerCell}>
                <Factory size={14} />
                {a.tallerNombre}
              </div>
            )},
            { key: 'tipo', header: 'Tipo', width: '170px', render: (a) => (
              <div className={s.tipoCell}>
                {getTipoIcon(a.tipo)}
                <span>{a.tipo}</span>
              </div>
            )},
            { key: 'descripcion', header: 'Descripción', width: '180px', render: (a) => (
              <div className={s.descripcionCell} title={a.descripcion}>{a.descripcion}</div>
            )},
            { key: 'avance', header: 'Avance', width: '120px', render: (a) => (
              <div className={s.avanceCell}>
                <div className={s.avanceBar}>
                  <div className={`${s.avanceFill} ${getAvanceColor(a.avance)}`} style={{ width: `${a.avance}%` }} />
                </div>
                <span className={s.avanceText}>{a.avance}%</span>
              </div>
            )},
            { key: 'fechaComprometida', header: 'Fecha límite', width: '120px', render: (a) => (
              <div className={s.fechaCell}>
                <Calendar size={14} />
                {a.fechaComprometida}
              </div>
            )},
            { key: 'prioridad', header: 'Prioridad', width: '100px', render: (a) => (
              <StatusBadge status={a.prioridad} />
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
                  <span className={s.detailLabel}>Fecha límite</span>
                  <span className={s.detailValue}>{selectedAlerta.fechaComprometida}</span>
                </div>
                <div className={s.detailItemFull}>
                  <span className={s.detailLabel}>Descripción</span>
                  <span className={s.detailValue}>{selectedAlerta.descripcion}</span>
                </div>
                <div className={s.detailItemFull}>
                  <span className={s.detailLabel}>Avance</span>
                  <div className={s.detailAvance}>
                    <div className={s.avanceBarLarge}>
                      <div className={`${s.avanceFillLarge} ${getAvanceColor(selectedAlerta.avance)}`} style={{ width: `${selectedAlerta.avance}%` }} />
                    </div>
                    <span className={s.avanceTextLarge}>{selectedAlerta.avance}%</span>
                  </div>
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
