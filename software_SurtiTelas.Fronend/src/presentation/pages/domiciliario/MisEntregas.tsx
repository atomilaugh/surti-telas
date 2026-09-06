import React, { useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Eye, CheckCircle2, MapPin, Package, Phone, MessageCircle, RefreshCw, X } from 'lucide-react';
import s from './MisEntregas.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { deliveriesApi } from '@/infrastructure/api/deliveriesApi';
import { useAuthStore } from '@/core/stores/authStore';

interface Entrega {
  id: string;
  pedido: string;
  cliente: string;
  direccion: string;
  ciudad: string;
  barrio: string;
  telefono?: string;
  horaEstimada: string;
  estado: 'Pendiente' | 'En camino' | 'Entregado' | 'Fallido';
}

const deliveryStatusMap: Record<string, Entrega['estado']> = {
  'ENTREGADO': 'Entregado',
  'EN_RUTA': 'En camino',
  'ASIGNADO': 'Pendiente',
  'FALLIDO': 'Fallido',
};

const estadoConfig: Record<Entrega['estado'], { label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'default'; color: string }> = {
  'Pendiente': { label: 'Pendiente', variant: 'warning', color: '#f59e0b' },
  'En camino': { label: 'En camino', variant: 'info', color: '#C4A574' },
  'Entregado': { label: 'Entregado', variant: 'success', color: '#10b981' },
  'Fallido': { label: 'Fallido', variant: 'danger', color: '#ef4444' },
};

export const DomiciliarioEntregas: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<Entrega['estado'] | 'Todas'>('Todas');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedEntrega, setSelectedEntrega] = useState<Entrega | null>(null);
  const [statusEntrega, setStatusEntrega] = useState<Entrega | null>(null);
  const [nextEstado, setNextEstado] = useState<Entrega['estado']>('Pendiente');
  const [_updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await deliveriesApi.list(user?.uid ? { domiciliarioId: user.uid } : undefined);
        const mapped: Entrega[] = result.map((d) => ({
          id: d.id,
          pedido: d.orderId || d.id,
          cliente: d.clienteNombre || '',
          direccion: d.direccion || '',
          ciudad: d.ciudad || '',
          barrio: d.ciudad || '',
          telefono: (d as unknown as { telefono?: string }).telefono || '',
          horaEstimada: d.asignadoEn ? new Date(d.asignadoEn).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
          estado: deliveryStatusMap[d.estado] || 'Pendiente',
        }));
        setEntregas(mapped);
      } catch {
        setError('No se pudieron cargar las entregas');
      } finally {
        setLoading(false);
      }
    };
    if (user?.uid) void load();
  }, [user?.uid]);

  const filteredEntregas = useMemo(() => {
    if (activeFilter === 'Todas') return entregas;
    return entregas.filter((entrega) => entrega.estado === activeFilter);
  }, [entregas, activeFilter]);

  const counts = {
    Todas: entregas.length,
    Pendiente: entregas.filter((e) => e.estado === 'Pendiente').length,
    'En camino': entregas.filter((e) => e.estado === 'En camino').length,
    Entregado: entregas.filter((e) => e.estado === 'Entregado').length,
  };

  const openStatus = (entrega: Entrega) => {
    setStatusEntrega(entrega);
    setNextEstado(entrega.estado === 'Pendiente' ? 'En camino' : entrega.estado === 'En camino' ? 'Entregado' : 'Fallido');
  };

  const saveStatus = async () => {
    if (!statusEntrega) return;
    setUpdatingId(statusEntrega.id);
    try {
      const backendEstado = nextEstado === 'Pendiente' ? 'ASIGNADO' : nextEstado === 'En camino' ? 'EN_RUTA' : nextEstado === 'Entregado' ? 'ENTREGADO' : 'FALLIDO';
      await deliveriesApi.updateStatus(statusEntrega.id, backendEstado);
      setEntregas((prev) => prev.map((entrega) => entrega.id === statusEntrega.id ? { ...entrega, estado: nextEstado } : entrega));
      toast.success(`${statusEntrega.id} marcada como ${nextEstado}`);
      setStatusEntrega(null);
    } catch {
      toast.error('No se pudo actualizar el estado de la entrega');
    } finally {
      setUpdatingId(null);
    }
  };

  const llamarCliente = (entrega: Entrega) => {
    if (!entrega.telefono) return;
    window.open(`tel:${entrega.telefono}`, '_self');
  };

  const abrirWhatsApp = (entrega: Entrega) => {
    if (!entrega.telefono) return;
    const texto = encodeURIComponent(`Hola ${entrega.cliente}, soy tu domiciliario de SurtiTelas. Estoy en camino con tu pedido.`);
    window.open(`https://wa.me/${entrega.telefono}?text=${texto}`, '_blank', 'noopener');
  };

  const estadosDisponibles = (estadoActual: Entrega['estado']): Entrega['estado'][] => {
    switch (estadoActual) {
      case 'Pendiente':
        return ['En camino'];
      case 'En camino':
        return ['Entregado', 'Fallido'];
      default:
        return [];
    }
  };

  if (loading) {
    return (
      <div className={s.pageWrap}>
        <div className={s.header}>
          <div>
            <h1 className={s.pageTitle}>Entregas de Hoy</h1>
            <p className={s.pageSubtitle}>Cargando...</p>
          </div>
        </div>
        <div className={s.stateEmpty}>
          <div className={s.spinner} />
          <div className={s.stateText}>Cargando entregas...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={s.pageWrap}>
        <div className={s.header}>
          <div>
            <h1 className={s.pageTitle}>Entregas de Hoy</h1>
            <p className={s.pageSubtitle}>{error}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw size={14} /> Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.pageWrap}>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Entregas de Hoy</h1>
          <p className={s.pageSubtitle}>Tus entregas asignadas y su estado actual</p>
        </div>
        <div className={s.headerActions}>
          <div className={s.summaryChips}>
            {entregas.length > 0 && (
              <>
                <StatusBadge status={`${entregas.length} total`} />
                <StatusBadge status={`${counts['Pendiente']} pendientes`} />
                <StatusBadge status={`${counts['Entregado']} entregadas`} />
              </>
            )}
          </div>
          <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
            <RefreshCw size={14} /> Actualizar
          </Button>
        </div>
      </div>

      <div className={s.filterBar}>
        <div className={s.filterPills}>
          {(['Todas', 'Pendiente', 'En camino', 'Entregado'] as const).map((filtro) => {
            const cfg = filtro === 'Todas' ? { label: 'Todas', variant: 'default' as const } : estadoConfig[filtro];
            return (
              <button
                key={filtro}
                className={`${s.filterPill} ${activeFilter === filtro ? s.filterPillActive : ''}`}
                onClick={() => setActiveFilter(filtro)}
              >
                <span>{cfg.label}</span>
                <span className={s.filterCount}>{counts[filtro]}</span>
              </button>
            );
          })}
        </div>
        <div className={s.viewToggle}>
          <button className={`${s.viewToggleBtn} ${viewMode === 'grid' ? s.viewToggleBtnActive : ''}`} onClick={() => setViewMode('grid')} title="Vista en cuadrícula">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
          </button>
          <button className={`${s.viewToggleBtn} ${viewMode === 'list' ? s.viewToggleBtnActive : ''}`} onClick={() => setViewMode('list')} title="Vista en lista">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6" /><line x1="8" y1="12" x2="21" y2="12" /><line x1="8" y1="18" x2="21" y2="18" /><line x1="3" y1="6" x2="3.01" y2="6" /><line x1="3" y1="12" x2="3.01" y2="12" /><line x1="3" y1="18" x2="3.01" y2="18" /></svg>
          </button>
        </div>
      </div>

      {filteredEntregas.length === 0 ? (
        <div className={s.stateEmpty}>
          <Package size={32} />
          <div className={s.stateText}>Sin entregas para este filtro</div>
        </div>
      ) : (
        <div className={`${s.entregasGrid} ${viewMode === 'list' ? s.entregasGridList : ''}`}>
          {filteredEntregas.map((entrega) => {
            const cfg = estadoConfig[entrega.estado];
            return (
              <div key={entrega.id} className={`${s.entregaCard} ${s[`entregaCard${entrega.estado === 'Pendiente' ? 'Pendiente' : entrega.estado === 'En camino' ? 'Encamino' : entrega.estado === 'Entregado' ? 'Entregado' : 'Fallido'}`]}`}>
                <div className={s.entregaCardHeader}>
                  <div className={s.entregaNumero}>
                    <div className={s.entregaNumeroCircle}>{entrega.id.split('-')[1]}</div>
                    <div>
                      <div className={s.entregaCliente}>{entrega.cliente}</div>
                      <div className={s.entregaPedido}>Pedido #{entrega.pedido}</div>
                    </div>
                  </div>
                    <StatusBadge status={cfg.label} />
                </div>
                <div className={s.entregaCardBody}>
                  <div className={s.entregaDireccion}><MapPin size={14} /> {entrega.direccion} - {entrega.barrio}</div>
                  <div className={s.entregaMetaRow}>
                    <div className={s.entregaMeta}>
                      <div className={s.entregaMetaLabel}>Hora estimada</div>
                      <div className={s.entregaMetaValue}>{entrega.horaEstimada}</div>
                    </div>
                    <div className={s.entregaMeta}>
                      <div className={s.entregaMetaLabel}>Ciudad</div>
                      <div className={s.entregaMetaValue}>{entrega.ciudad}</div>
                    </div>
                  </div>
                </div>
                <div className={s.entregaCardFooter}>
                  <Button size="sm" variant="secondary" onClick={() => setSelectedEntrega(entrega)} title={`Ver detalle de entrega ${entrega.id}`}>
                    <Eye size={14} /> Ver detalle
                  </Button>
                  {entrega.estado !== 'Entregado' && (
                    <Button size="sm" variant="primary" onClick={() => openStatus(entrega)} title={`Cambiar estado de entrega ${entrega.id}`}>
                      <CheckCircle2 size={14} /> Cambiar estado
                    </Button>
                  )}
                  {entrega.telefono && (
                    <>
                      <Button size="sm" variant="secondary" onClick={() => llamarCliente(entrega)} title={`Llamar a ${entrega.cliente}`}>
                        <Phone size={14} />
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => abrirWhatsApp(entrega)} title={`Abrir WhatsApp con ${entrega.cliente}`}>
                        <MessageCircle size={14} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedEntrega && (
        <div className={s.overlay} onClick={() => setSelectedEntrega(null)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div>
                <div className={s.modalTitle}>Entrega {selectedEntrega.id}</div>
                <div className={s.modalSubtitle}>{selectedEntrega.cliente}</div>
              </div>
              <div className={s.modalHeaderActions}>
                <StatusBadge status={selectedEntrega.estado} />
                <button className={s.iconButton} onClick={() => setSelectedEntrega(null)}><X size={18} /></button>
              </div>
            </div>
            <div className={s.modalBody}>
              <table className={s.detailTable}>
                <tbody>
                  <tr>
                    <td className={s.detailCellLabel}>Pedido</td>
                    <td className={s.detailCell}>#{selectedEntrega.pedido}</td>
                  </tr>
                  <tr>
                    <td className={s.detailCellLabel}>Cliente</td>
                    <td className={s.detailCell}>{selectedEntrega.cliente}</td>
                  </tr>
                  <tr>
                    <td className={s.detailCellLabel}>Dirección</td>
                    <td className={s.detailCell}>{selectedEntrega.direccion} - {selectedEntrega.barrio}</td>
                  </tr>
                  <tr>
                    <td className={s.detailCellLabel}>Ciudad</td>
                    <td className={s.detailCell}>{selectedEntrega.ciudad}</td>
                  </tr>
                  <tr>
                    <td className={s.detailCellLabel}>Hora estimada</td>
                    <td className={s.detailCell}>{selectedEntrega.horaEstimada}</td>
                  </tr>
                  {selectedEntrega.telefono && (
                    <tr>
                      <td className={s.detailCellLabel}>Teléfono</td>
                      <td className={s.detailCell}>{selectedEntrega.telefono}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className={s.modalActions}>
              {selectedEntrega.telefono && (
                <>
                  <Button size="sm" onClick={() => llamarCliente(selectedEntrega)}><Phone size={14} /> Llamar</Button>
                  <Button size="sm" variant="secondary" onClick={() => abrirWhatsApp(selectedEntrega)}><MessageCircle size={14} /> WhatsApp</Button>
                </>
              )}
              {selectedEntrega.estado !== 'Entregado' && (
                <Button onClick={() => { setSelectedEntrega(null); openStatus(selectedEntrega); }}>Cambiar estado</Button>
              )}
              <Button variant="ghost" onClick={() => setSelectedEntrega(null)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}

      {statusEntrega && (
        <div className={s.overlay} onClick={() => setStatusEntrega(null)}>
          <div className={s.statusModal} onClick={(e) => e.stopPropagation()}>
            <div className={s.statusModalHeader}>
              <div>
                <div className={s.statusModalTitle}>Cambiar estado de entrega</div>
                <div className={s.statusModalSubtitle}>{statusEntrega.cliente} · Pedido #{statusEntrega.pedido}</div>
              </div>
              <button className={s.iconButton} onClick={() => setStatusEntrega(null)}><X size={18} /></button>
            </div>
            <div className={s.statusGrid}>
              {estadosDisponibles(statusEntrega.estado).map((estado) => {
                const cfg = estadoConfig[estado];
                return (
                  <button
                    key={estado}
                    className={s.statusCard}
                    onClick={() => { setNextEstado(estado); saveStatus(); }}
                  >
                    <div className={s.statusDot} style={{ background: cfg.color }} />
                    <div className={s.statusLabel}>{cfg.label}</div>
                    <div className={s.statusHint}>Cambiar a {cfg.label.toLowerCase()}</div>
                  </button>
                );
              })}
            </div>
            <div className={s.statusModalFooter}>
              <Button variant="ghost" onClick={() => setStatusEntrega(null)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
