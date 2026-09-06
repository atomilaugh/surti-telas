import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PackageCheck, MapPin, Phone, User, Filter, RefreshCw, X } from 'lucide-react';
import s from './DomiciliarioEntregas.module.css';
import { Button } from '@/shared/ui/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { deliveriesApi, type DeliveryDTO } from '@/infrastructure/api/deliveriesApi';

const ESTADOS = ['ASIGNADO', 'EN_RUTA', 'ENTREGADO', 'FALLIDO'] as const;

const estadoConfig: Record<string, { label: string; variant: 'success' | 'info' | 'warning' | 'danger' | 'default'; color: string }> = {
  ASIGNADO: { label: 'Pendiente', variant: 'warning', color: '#f59e0b' },
  EN_RUTA: { label: 'En camino', variant: 'info', color: '#C4A574' },
  ENTREGADO: { label: 'Entregado', variant: 'success', color: '#10b981' },
  FALLIDO: { label: 'Fallido', variant: 'danger', color: '#ef4444' },
};

export const DomiciliarioEntregas: React.FC = () => {
  const [entregas, setEntregas] = useState<DeliveryDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<string>('TODOS');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [statusModalId, setStatusModalId] = useState<string | null>(null);

  const cargar = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await deliveriesApi.rutaDelDia();
      setEntregas(data as DeliveryDTO[]);
    } catch {
      setError('No se pudieron cargar las entregas');
      toast.error('No se pudieron cargar las entregas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  const filtradas = useMemo(() => {
    if (filtro === 'TODOS') return entregas;
    if (filtro === 'ENVIADO') return entregas.filter(e => e.estado === 'ASIGNADO' || e.estado === 'EN_RUTA');
    return entregas.filter(e => e.estado === filtro);
  }, [entregas, filtro]);

  const cambiarEstado = async (id: string, estado: DeliveryDTO['estado']) => {
    setUpdatingId(id);
    try {
      await deliveriesApi.updateStatus(id, estado);
      setEntregas(prev => prev.map(e => e.id === id ? { ...e, estado } : e));
      toast.success('Estado actualizado');
      setStatusModalId(null);
    } catch {
      toast.error('No se pudo actualizar el estado');
    } finally {
      setUpdatingId(null);
    }
  };

  const accionesDisponibles = (estado: DeliveryDTO['estado']) => {
    switch (estado) {
      case 'ASIGNADO':
        return [{ label: 'Iniciar entrega', estado: 'EN_RUTA' as const, variant: 'primary' as const }];
      case 'EN_RUTA':
        return [
          { label: 'Marcar entregado', estado: 'ENTREGADO' as const, variant: 'success' as const },
          { label: 'Marcar fallido', estado: 'FALLIDO' as const, variant: 'danger' as const },
        ];
      default:
        return [];
    }
  };

  const selected = entregas.find(e => e.id === selectedId) ?? null;
  const statusEntrega = entregas.find(e => e.id === statusModalId) ?? null;

  const estadosDisponibles = (estadoActual: DeliveryDTO['estado']): DeliveryDTO['estado'][] => {
    switch (estadoActual) {
      case 'ASIGNADO':
        return ['EN_RUTA'];
      case 'EN_RUTA':
        return ['ENTREGADO', 'FALLIDO'];
      default:
        return [];
    }
  };

  return (
    <div>
      <div className={s.header}>
        <div>
          <h1 className={s.pageTitle}>Entregas de Hoy</h1>
          <p className={s.pageSubtitle}>Tus entregas asignadas y su estado actual</p>
        </div>
        <Button variant="secondary" size="sm" onClick={cargar} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Actualizar
        </Button>
      </div>

      <div className={s.toolbar}>
        <div className={s.filtros}>
          <Filter size={16} />
          <select className={s.selectFiltro} value={filtro} onChange={e => setFiltro(e.target.value)}>
            <option value="TODOS">Todos</option>
            <option value="ENVIADO">Enviados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{estadoConfig[e]?.label ?? e}</option>)}
          </select>
        </div>
        <div className={s.summary}>
          {entregas.length > 0 && (
            <>
              <StatusBadge status={`${entregas.length} total`} />
              <StatusBadge status={`${entregas.filter(e => e.estado === 'ASIGNADO').length} pendientes`} />
              <StatusBadge status={`${entregas.filter(e => e.estado === 'ENTREGADO').length} entregadas`} />
            </>
          )}
        </div>
      </div>

      {error && <div className={s.error}>{error}</div>}

      {loading ? (
        <div className={s.state}><div className={s.spinner} /> Cargando entregas...</div>
      ) : filtradas.length === 0 ? (
        <div className={s.emptyState}>
          <PackageCheck size={32} />
          <div className={s.emptyText}>Sin entregas para este filtro</div>
        </div>
      ) : (
        <div className={s.grid}>
          {filtradas.map(entrega => {
            const config = estadoConfig[entrega.estado] ?? { label: entrega.estado, variant: 'default' as const, color: '#6b7280' };
            return (
              <div key={entrega.id} className={s.card} onClick={() => setSelectedId(entrega.id)}>
                <div className={s.cardHeader}>
                  <div>
                    <div className={s.cliente}>{entrega.clienteNombre ?? 'Cliente'}</div>
                    <div className={s.pedido}>Pedido #{entrega.orderNumero ?? entrega.orderId}</div>
                  </div>
                  <div className={s.badgeWrap}>
                    <StatusBadge status={config.label} />
                  </div>
                </div>

                <div className={s.cardBody}>
                  <div className={s.row}><MapPin size={14} /> {entrega.direccion ?? 'Sin dirección'} {entrega.ciudad ? `· ${entrega.ciudad}` : ''}</div>
                  {entrega.telefono && <div className={s.row}><Phone size={14} /> {entrega.telefono}</div>}
                  {entrega.notas && <div className={s.row}><User size={14} /> {entrega.notas}</div>}
                </div>

                <div className={s.cardActions}>
                  {accionesDisponibles(entrega.estado).map(accion => (
                    <Button
                      key={accion.estado}
                      size="sm"
                      variant={accion.variant}
                      loading={updatingId === entrega.id}
                      onClick={(e) => { e.stopPropagation(); cambiarEstado(entrega.id, accion.estado); }}
                    >
                      {accion.label}
                    </Button>
                  ))}
                  <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setStatusModalId(entrega.id); }}>
                    Cambiar estado
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div className={s.overlay} onClick={() => setSelectedId(null)}>
          <div className={s.modal} onClick={(e) => e.stopPropagation()}>
            <div className={s.modalHeader}>
              <div>
                <div className={s.modalTitle}>{selected.clienteNombre ?? 'Cliente'}</div>
                <div className={s.modalSubtitle}>Pedido #{selected.orderNumero ?? selected.orderId}</div>
              </div>
              <div className={s.modalHeaderActions}>
                <StatusBadge status={estadoConfig[selected.estado]?.label ?? selected.estado} />
                <button className={s.iconButton} onClick={() => setSelectedId(null)}><X size={18} /></button>
              </div>
            </div>

            <div className={s.modalBody}>
              <div className={s.modalRow}><MapPin size={18} /> {selected.direccion ?? 'Sin dirección'} {selected.ciudad ? `· ${selected.ciudad}` : ''}</div>
              {selected.telefono && <div className={s.modalRow}><Phone size={18} /> {selected.telefono}</div>}
              {selected.notas && <div className={s.modalRow}><User size={18} /> {selected.notas}</div>}
            </div>

            <div className={s.modalActions}>
              {accionesDisponibles(selected.estado).map(accion => (
                <Button
                  key={accion.estado}
                  variant={accion.variant}
                  loading={updatingId === selected.id}
                  onClick={() => cambiarEstado(selected.id, accion.estado)}
                >
                  {accion.label}
                </Button>
              ))}
              <Button variant="ghost" onClick={() => setSelectedId(null)}>Cerrar</Button>
            </div>
          </div>
        </div>
      )}

      {statusEntrega && (
        <div className={s.overlay} onClick={() => setStatusModalId(null)}>
          <div className={s.statusModal} onClick={(e) => e.stopPropagation()}>
            <div className={s.statusModalHeader}>
              <div>
                <div className={s.statusModalTitle}>Cambiar estado de entrega</div>
                <div className={s.statusModalSubtitle}>{statusEntrega.clienteNombre ?? 'Cliente'} · Pedido #{statusEntrega.orderNumero ?? statusEntrega.orderId}</div>
              </div>
              <button className={s.iconButton} onClick={() => setStatusModalId(null)}><X size={18} /></button>
            </div>

            <div className={s.statusGrid}>
              {estadosDisponibles(statusEntrega.estado).map(estado => {
                const cfg = estadoConfig[estado];
                return (
                  <button
                    key={estado}
                    className={s.statusCard}
                    onClick={() => cambiarEstado(statusEntrega.id, estado)}
                  >
                    <div className={s.statusDot} style={{ background: cfg.color }} />
                    <div className={s.statusLabel}>{cfg.label}</div>
                    <div className={s.statusHint}>Cambiar a {cfg.label.toLowerCase()}</div>
                  </button>
                );
              })}
            </div>

            <div className={s.statusModalFooter}>
              <Button variant="ghost" onClick={() => setStatusModalId(null)}>Cancelar</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
