import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Phone, MessageCircle, RefreshCw, Navigation, PackageCheck, User, MapPin } from 'lucide-react';
import s from './RutaDelDia.module.css';
import { Button } from '@/shared/ui/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { DetailModal } from '@/shared/ui/DetailModal';
import { deliveriesApi } from '@/infrastructure/api/deliveriesApi';
import { useAuthStore } from '@/core/stores/authStore';
import { RouteMap } from './DeliveryMap';
import { cn } from '@/shared/utils';

export interface Entrega {
  id: string;
  cliente: string;
  direccion: string;
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

const statusVariant = (estado: Entrega['estado']) => {
  if (estado === 'Entregado') return 'success';
  if (estado === 'En camino') return 'info';
  if (estado === 'Fallido') return 'danger';
  return 'warning';
};

export const RutaDelDia: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [selectedEntrega, setSelectedEntrega] = useState<Entrega | null>(null);
  const [statusEntrega, setStatusEntrega] = useState<Entrega | null>(null);
  const [nextEstado, setNextEstado] = useState<Entrega['estado']>('Pendiente');
  const [isNavigating, setIsNavigating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const filters = user?.uid ? { domiciliarioId: user.uid } : undefined;
      const result = await deliveriesApi.rutaDelDia(filters);
      const mapped: Entrega[] = result.map((d) => ({
        id: d.id,
        cliente: d.order?.cliente || d.domiciliarioNombre || '',
        direccion: d.order?.direccion || d.direccion || '',
        barrio: d.order?.ciudad || d.ciudad || '',
        telefono: d.order?.telefono || d.telefono || '',
        horaEstimada: d.asignadoEn ? new Date(d.asignadoEn).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }) : '',
        estado: deliveryStatusMap[d.estado] || 'Pendiente',
      }));
      setEntregas(mapped);
    } catch {
      toast.error('No se pudieron cargar las entregas');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (user?.uid) void load();
  }, [user?.uid, load]);

  const sync = async () => {
    setSyncing(true);
    try {
      await load();
      toast.success('Ruta sincronizada');
    } catch {
      toast.error('No se pudo sincronizar la ruta');
    } finally {
      setSyncing(false);
    }
  };

  const completed = entregas.filter(e => e.estado === 'Entregado').length;
  const pending = entregas.length - completed;

  const openStatus = (entrega: Entrega) => {
    setStatusEntrega(entrega);
    setNextEstado(entrega.estado === 'Pendiente' ? 'En camino' : entrega.estado === 'En camino' ? 'Entregado' : 'Fallido');
  };

  const saveStatus = async () => {
    if (!statusEntrega) return;
    try {
      const backendEstado = nextEstado === 'Pendiente' ? 'ASIGNADO' : nextEstado === 'En camino' ? 'EN_RUTA' : nextEstado === 'Entregado' ? 'ENTREGADO' : 'FALLIDO';
      await deliveriesApi.updateStatus(statusEntrega.id, backendEstado);
      setEntregas(prev => prev.map(entrega => entrega.id === statusEntrega.id ? { ...entrega, estado: nextEstado } : entrega));
      setSelectedEntrega(prev => prev?.id === statusEntrega.id ? { ...prev, estado: nextEstado } : prev);
      toast.success(`${statusEntrega.id} marcada como ${nextEstado}`);
      setStatusEntrega(null);
    } catch {
      toast.error('No se pudo actualizar el estado');
    }
  };

  const optimizarRuta = () => {
    setEntregas(prev => {
      const orden: Record<Entrega['estado'], number> = { 'Pendiente': 0, 'En camino': 1, 'Fallido': 2, 'Entregado': 3 };
      return [...prev].sort((a, b) => orden[a.estado] - orden[b.estado] || a.horaEstimada.localeCompare(b.horaEstimada));
    });
    toast.success('Ruta optimizada: pendientes primero, entregados al final');
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

  const abrirNavegacion = (entrega: Entrega) => {
    const query = encodeURIComponent(`${entrega.direccion}, ${entrega.barrio}`);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${query}`, '_blank', 'noopener');
  };

  if (loading) {
    return (
      <div>
        <h1 className={s.pageTitle}>Ruta del Día</h1>
        <p className={s.pageSubtitle}>Cargando entregas...</p>
      </div>
    );
  }

  if (entregas.length === 0) {
    return (
      <div>
        <h1 className={s.pageTitle}>Ruta del Día</h1>
        <p className={s.pageSubtitle}>No tienes entregas programadas para hoy</p>
        <div className="rounded-2xl border border-dashed border-[var(--color-border)] p-8 text-center text-[var(--color-text-muted)]">
          Cuando se te asignen entregas, aparecerán aquí para que puedas planificar tu ruta.
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className={s.pageTitle}>Ruta del Día</h1>
          <p className={s.pageSubtitle}>{entregas.length} entregas programadas</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" onClick={optimizarRuta}>
            <Navigation size={14} />
            Optimizar ruta
          </Button>
          <Button size="sm" variant="secondary" onClick={sync} disabled={syncing}>
            <RefreshCw size={14} className={syncing ? 'animate-spin' : ''} />
            Sincronizar
          </Button>
        </div>
      </div>

      <div className={s.rutaLayout}>
        <div className={s.rutaPanel}>
          <div className={s.rutaPanelHeader}>
            <div className={s.rutaPanelTitle}>Secuencia de paradas</div>
            <div className={s.rutaResumen}>
              <span className={`${s.rutaResumenChip} ${s.rutaResumenChipTotal}`}>{entregas.length}</span>
              <span className={`${s.rutaResumenChip} ${s.rutaResumenChipDone}`}>{completed}</span>
              <span className={`${s.rutaResumenChip} ${s.rutaResumenChipPending}`}>{pending}</span>
            </div>
          </div>

          <div className={s.rutaTimeline}>
            {entregas.map((entrega, i) => (
              <div
                key={entrega.id}
                className={`${s.rutaStop} ${selectedEntrega?.id === entrega.id ? s.rutaStopActive : ''} ${entrega.estado === 'Entregado' ? s.rutaStopDone : ''}`}
                onClick={() => setSelectedEntrega(entrega)}
                title={`Parada ${i + 1}: ${entrega.cliente}`}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedEntrega(entrega);
                  }
                }}
              >
                <div className={s.rutaStopLeft}>
                  <div className={s.rutaStopNumber}>{i + 1}</div>
                  <div className={s.rutaStopLine} />
                </div>
                <div className={s.rutaStopBody}>
                  <div className={s.rutaStopCliente}>{entrega.cliente}</div>
                  <div className={s.rutaStopDireccion}>{entrega.direccion}, {entrega.barrio}</div>
                  <div className={s.rutaStopFooter}>
                    <span className={s.rutaStopHora}>{entrega.horaEstimada}</span>
                    <StatusBadge status={entrega.estado} />
                  </div>
                  <div className="flex gap-2 mt-2">
                    <Button size="xs" variant="secondary" onClick={(e) => { e.stopPropagation(); abrirNavegacion(entrega); }} title="Abrir navegación">
                      <Navigation size={12} />
                      Navegar
                    </Button>
                    {entrega.telefono && (
                      <>
                        <Button size="xs" variant="secondary" onClick={(e) => { e.stopPropagation(); llamarCliente(entrega); }} title="Llamar">
                          <Phone size={12} />
                          Llamar
                        </Button>
                        <Button size="xs" variant="secondary" onClick={(e) => { e.stopPropagation(); abrirWhatsApp(entrega); }} title="WhatsApp">
                          <MessageCircle size={12} />
                          WhatsApp
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className={s.mapPanel}>
          <div className={s.mapHeader}>
            <div className={s.mapTitle}>Mapa de ruta</div>
            <div className="flex gap-2">
              <StatusBadge status={entregas.some(e => e.estado === 'Pendiente') ? 'Tienes entregas pendientes' : 'Todas las entregas completadas'} />
            </div>
          </div>
          <RouteMap entregas={entregas} onSelect={setSelectedEntrega} selectedId={selectedEntrega?.id} isNavigating={isNavigating} onToggleNavigation={setIsNavigating} />
        </div>
      </div>

      <DetailModal
        children={null}
        open={Boolean(selectedEntrega)}
        onClose={() => setSelectedEntrega(null)}
        title={selectedEntrega ? `Parada ${entregas.findIndex(e => e.id === selectedEntrega.id) + 1}` : 'Ruta'}
        subtitle={selectedEntrega?.horaEstimada}
        header={{
          icon: <PackageCheck size={18} />,
          status: selectedEntrega ? <StatusBadge status={selectedEntrega.estado} /> : undefined,
        }}
        kpis={
          selectedEntrega ? [
            { label: 'Pedido', value: selectedEntrega.id, icon: <PackageCheck size={16} />, monospace: true },
            { label: 'Estado', value: selectedEntrega.estado, icon: <PackageCheck size={16} />, tone: statusVariant(selectedEntrega.estado) },
            { label: 'Hora estimada', value: selectedEntrega.horaEstimada, icon: <PackageCheck size={16} /> },
          ] : undefined
        }
        sections={[
          {
            title: 'Información del cliente',
            icon: <User size={16} />,
            description: 'Datos de contacto y ubicación de entrega',
            fields: [
              { label: 'Cliente', value: selectedEntrega?.cliente, icon: <User size={16} />, fullWidth: true },
              { label: 'Dirección', value: selectedEntrega?.direccion, icon: <MapPin size={16} />, fullWidth: true },
              { label: 'Barrio / Ciudad', value: selectedEntrega?.barrio, icon: <MapPin size={16} /> },
              { label: 'Teléfono', value: selectedEntrega?.telefono, icon: <Phone size={16} />, helper: selectedEntrega?.telefono ? 'Toca para llamar' : undefined },
            ],
          },
        ]}
        footer={
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="secondary" onClick={() => setSelectedEntrega(null)}>Cerrar</Button>
            {selectedEntrega && (
              <>
                {selectedEntrega.telefono && (
                  <>
                    <Button size="sm" onClick={() => llamarCliente(selectedEntrega)} title={`Llamar a ${selectedEntrega.cliente}`}>
                      <Phone size={14} />
                      Llamar
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => abrirWhatsApp(selectedEntrega)} title={`Abrir WhatsApp con ${selectedEntrega.cliente}`}>
                      <MessageCircle size={14} />
                      WhatsApp
                    </Button>
                  </>
                )}
                <Button size="sm" variant="secondary" onClick={() => abrirNavegacion(selectedEntrega)}>
                  <Navigation size={14} />
                  Navegar
                </Button>
                {selectedEntrega.estado !== 'Entregado' && (
                  <Button onClick={() => { setSelectedEntrega(null); openStatus(selectedEntrega); }}>Cambiar estado</Button>
                )}
              </>
            )}
          </div>
        }
      />

      <DetailModal
        children={null}
        open={Boolean(statusEntrega)}
        onClose={() => setStatusEntrega(null)}
        title="Actualizar estado"
        subtitle={statusEntrega ? `${statusEntrega.id} - ${statusEntrega.cliente}` : undefined}
        header={{
          icon: <PackageCheck size={18} />,
          status: statusEntrega ? <StatusBadge status={statusEntrega.estado} /> : undefined,
        }}
        sections={[
          {
            title: 'Selecciona el nuevo estado',
            description: 'Actualiza el progreso de esta entrega',
            children: (
              <div className="grid gap-3 sm:grid-cols-2">
                {(['Pendiente', 'En camino', 'Entregado', 'Fallido'] as const).map((estado) => {
                  const selected = nextEstado === estado;
                  const tone = statusVariant(estado);
                  return (
                    <button
                      key={estado}
                      type="button"
                      onClick={() => setNextEstado(estado)}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-all',
                        selected ? 'border-[var(--color-primary)] bg-[var(--color-bg-elevated)] shadow-sm' : 'border-[var(--color-border)] hover:border-[var(--color-text-muted)]'
                      )}
                    >
                      <span className={cn('flex h-10 w-10 items-center justify-center rounded-lg text-white', tone === 'success' && 'bg-emerald-500', tone === 'info' && 'bg-amber-500', tone === 'warning' && 'bg-amber-500', tone === 'danger' && 'bg-red-500')}>
                        <PackageCheck size={18} />
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-[var(--color-text-primary)]">{estado}</div>
                        <div className="text-xs text-[var(--color-text-muted)]">
                          {estado === 'Pendiente' && 'Queda pendiente para ruta'}
                          {estado === 'En camino' && 'El domiciliario va al cliente'}
                          {estado === 'Entregado' && 'Se confirmó la entrega'}
                          {estado === 'Fallido' && 'No se pudo entregar'}
                        </div>
                      </div>
                      {selected && <span className="ml-auto text-[var(--color-primary)]">●</span>}
                    </button>
                  );
                })}
              </div>
            ),
          },
        ]}
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setStatusEntrega(null)}>Cancelar</Button>
            <Button onClick={saveStatus}>Guardar avance</Button>
          </div>
        }
      />
    </div>
  );
};
