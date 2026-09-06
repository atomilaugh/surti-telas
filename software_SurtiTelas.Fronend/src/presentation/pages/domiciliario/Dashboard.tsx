import React, { useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { StatCard } from '../admin/StatCard';
import s from './Dashboard.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { DetailModal } from '@/shared/ui/DetailModal';
import { deliveriesApi } from '@/infrastructure/api/deliveriesApi';
import { useAuthStore } from '@/core/stores/authStore';
import { PackageCheck, CheckCircle2, Clock, XCircle, MapPin } from 'lucide-react';

interface Entrega {
  id: string;
  cliente: string;
  direccion: string;
  barrio: string;
  horaEstimada: string;
  estado: 'Entregado' | 'En camino' | 'Pendiente' | 'Fallido';
}

const deliveryStatusMap: Record<string, Entrega['estado']> = {
  'ENTREGADO': 'Entregado',
  'EN_RUTA': 'En camino',
  'ASIGNADO': 'Pendiente',
  'FALLIDO': 'Fallido',
};

export const DomiciliarioDashboard: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedEntrega, setSelectedEntrega] = useState<Entrega | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await deliveriesApi.list(user?.uid ? { domiciliarioId: user.uid } : undefined);
        const mapped: Entrega[] = result.map((d) => ({
          id: d.id,
          cliente: d.clienteNombre || '',
          direccion: d.direccion || '',
          barrio: d.ciudad || '',
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

  const completed = entregas.filter((e) => e.estado === 'Entregado').length;
  const enCamino = entregas.filter((e) => e.estado === 'En camino').length;
  const pendientes = entregas.filter((e) => e.estado === 'Pendiente').length;
  const fallidas = entregas.filter((e) => e.estado === 'Fallido').length;
  const nextEntrega = entregas.find((e) => e.estado === 'Pendiente') || entregas.find((e) => e.estado === 'En camino') || null;

  const stats = useMemo(() => [
    { label: 'Entregas Hoy', value: String(entregas.length), trend: 'Jornada actual', trendUp: true, Icon: PackageCheck, color: 'info' as const },
    { label: 'Completadas', value: String(completed), trend: `${Math.round((completed / Math.max(entregas.length, 1)) * 100)}% del día`, trendUp: true, Icon: CheckCircle2, color: 'success' as const },
    { label: 'Pendientes', value: String(pendientes), trend: nextEntrega ? `Próxima ${nextEntrega.horaEstimada}` : 'Sin pendientes', trendUp: pendientes === 0, Icon: Clock, color: 'warning' as const },
    { label: 'Fallidas', value: String(fallidas), trend: fallidas === 0 ? 'Sin novedades' : 'Requiere atención', trendUp: fallidas === 0, Icon: XCircle, color: 'accent' as const },
  ], [entregas.length, completed, pendientes, fallidas, nextEntrega]);

  const actividad = useMemo(() => {
    const entregasOrdenadas = [...entregas].sort((a, b) => a.id.localeCompare(b.id));
    return entregasOrdenadas.map((e) => ({
      tipo: e.estado === 'Entregado' ? ('success' as const) : e.estado === 'En camino' ? ('info' as const) : e.estado === 'Fallido' ? ('warning' as const) : ('default' as const),
      texto: e.estado === 'Entregado'
        ? `Entregado: ${e.cliente}`
        : e.estado === 'En camino'
          ? `En camino: ${e.cliente}`
          : e.estado === 'Fallido'
            ? `Fallida: ${e.cliente}`
            : `Pendiente: ${e.cliente}`,
      tiempo: e.horaEstimada,
    }));
  }, [entregas]);

  const marcarSiguiente = async () => {
    if (!nextEntrega) {
      toast.info('No hay entregas pendientes para marcar');
      return;
    }
    const nuevoEstado: Entrega['estado'] = nextEntrega.estado === 'Pendiente' ? 'En camino' : 'Entregado';
    try {
      await deliveriesApi.updateStatus(nextEntrega.id, nuevoEstado === 'En camino' ? 'EN_RUTA' : 'ENTREGADO');
      setEntregas((prev) => prev.map((entrega) => entrega.id === nextEntrega.id ? { ...entrega, estado: nuevoEstado } : entrega));
      toast.success(`${nextEntrega.id} marcada como ${nuevoEstado}`);
    } catch {
      toast.error('No se pudo actualizar el estado de la entrega');
    }
  };

  if (loading) {
    return (
      <div>
        <h1 className={s.pageTitle}>Panel de Entregas</h1>
        <p className={s.pageSubtitle}>Cargando métricas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className={s.pageTitle}>Panel de Entregas</h1>
        <p className={s.pageSubtitle}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className={s.pageTitle}>Panel de Entregas</h1>
      <p className={s.pageSubtitle}>Bienvenido, {user?.name ?? 'domiciliario'}. Aquí tienes el resumen de tu jornada.</p>

      <div className={s.statsGrid}>
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      <div className={s.mainGrid}>
        <div className={s.nextDeliveryCard}>
          <div className={s.nextDeliveryLabel}>Próxima entrega</div>
          <div className={s.nextDeliveryName}>{nextEntrega?.cliente || 'Sin entregas pendientes'}</div>
          <div className={s.nextDeliveryAddress}>{nextEntrega ? `${nextEntrega.direccion}, ${nextEntrega.barrio}` : 'Tu jornada está completa'}</div>
          <div className={s.nextDeliveryMeta}>
            <div className={s.nextDeliveryMetaItem}>
              <div className={s.nextDeliveryMetaLabel}>Entrega</div>
              <div className={s.nextDeliveryMetaValue}>{nextEntrega?.id || '—'}</div>
            </div>
            <div className={s.nextDeliveryMetaItem}>
              <div className={s.nextDeliveryMetaLabel}>Hora estimada</div>
              <div className={s.nextDeliveryMetaValue}>{nextEntrega?.horaEstimada || '—'}</div>
            </div>
          </div>
          <button style={{
            width: '100%',
            padding: '10px 18px',
            borderRadius: 'var(--radius-sm)',
            border: 'none',
            background: nextEntrega?.estado === 'En camino' ? 'var(--color-success)' : 'var(--color-info)',
            color: '#fff',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: nextEntrega ? 'pointer' : 'not-allowed',
          }} disabled={!nextEntrega} onClick={marcarSiguiente} title={nextEntrega?.estado === 'En camino' ? 'Marcar entrega como completada' : 'Marcar entrega como en camino'}>
            {nextEntrega?.estado === 'En camino' ? 'Marcar como Entregada' : 'Marcar como En camino'}
          </button>
        </div>

        <div className={s.dayProgressCard}>
          <div className={s.dayProgressTitle}>Progreso del día</div>
          <div className={s.progressRing}>
            <svg className={s.progressRing} viewBox="0 0 100 100">
              <circle className={s.progressRingCircle} cx="50" cy="50" r="42" />
            </svg>
            <div className={s.progressRingText}>
              <span className={s.progressRingPercent}>{Math.round((completed / Math.max(entregas.length, 1)) * 100)}%</span>
              <span className={s.progressRingLabel}>Completado</span>
            </div>
          </div>
          <div className={s.dayBreakdown}>
            <div className={s.dayBreakdownItem}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className={s.dayBreakdownDot} style={{ background: 'var(--color-success)' }} />
                Completadas
              </span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{completed}</span>
            </div>
            <div className={s.dayBreakdownItem}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className={s.dayBreakdownDot} style={{ background: 'var(--color-info)' }} />
                En camino
              </span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{enCamino}</span>
            </div>
            <div className={s.dayBreakdownItem}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className={s.dayBreakdownDot} style={{ background: 'var(--color-warning)' }} />
                Pendientes
              </span>
              <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{pendientes}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={s.bottomGrid}>
        <div className={s.deliveryList}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Entregas del día
          </div>
          {entregas.map((entrega, i) => (
            <button type="button" key={entrega.id} className={s.deliveryItem} onClick={() => setSelectedEntrega(entrega)}>
              <div className={`${s.deliveryNumber} ${entrega.estado === 'Entregado' ? s.deliveryNumberDone : entrega.estado === 'En camino' ? s.deliveryNumberActive : ''}`}>
                {i + 1}
              </div>
              <div className={s.deliveryInfo}>
                <div className={s.deliveryClientName}>{entrega.cliente}</div>
                <div className={s.deliveryAddress}>{entrega.direccion} - {entrega.barrio}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div className={s.deliveryTime}>{entrega.horaEstimada}</div>
                <StatusBadge status={entrega.estado} />
              </div>
            </button>
          ))}
        </div>

        <div className={s.deliveryList}>
          <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--color-border)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            Actividad reciente
          </div>
          {actividad.length === 0 ? (
            <div style={{ padding: '20px', color: 'rgba(255,255,255,0.5)' }}>Sin actividad registrada</div>
          ) : (
            actividad.map((a, i) => (
              <div key={i} className={s.activityItem}>
                <div className={`${s.activityDot} ${(a.tipo as string) === 'success' ? s.activityDotSuccess : (a.tipo as string) === 'info' ? s.activityDotInfo : (a.tipo as string) === 'warning' ? s.activityDotWarning : s.activityDotError}`} />
                <span className={s.activityText}>{a.texto}</span>
                <span className={s.activityTime}>{a.tiempo}</span>
              </div>
            ))
          )}
        </div>
      </div>

      <DetailModal
        children={null}
        open={Boolean(selectedEntrega)}
        onClose={() => setSelectedEntrega(null)}
        title={selectedEntrega ? `Entrega ${selectedEntrega.id}` : 'Entrega'}
        subtitle={selectedEntrega?.horaEstimada}
        header={{
          icon: <MapPin size={18} />,
          status: selectedEntrega ? <StatusBadge status={selectedEntrega.estado} /> : undefined,
        }}
        sections={[
          {
            title: 'Ubicación',
            fields: [
              { label: 'Cliente', value: selectedEntrega?.cliente, icon: <MapPin size={16} /> },
              { label: 'Dirección', value: selectedEntrega?.direccion, icon: <MapPin size={16} /> },
              { label: 'Barrio', value: selectedEntrega?.barrio, icon: <MapPin size={16} /> },
              { label: 'Hora estimada', value: selectedEntrega?.horaEstimada, icon: <Clock size={16} /> },
            ],
          },
        ]}
        footer={
          <div className="flex justify-end gap-3">
            <button type="button" className="inline-flex h-8 items-center justify-center rounded-xl border border-[var(--color-border)] bg-transparent px-4 text-sm font-medium text-[var(--color-text-primary)]" onClick={() => setSelectedEntrega(null)}>Cerrar</button>
            {selectedEntrega && selectedEntrega.estado !== 'Entregado' && (
              <button type="button" className="inline-flex h-8 items-center justify-center rounded-xl bg-[var(--btn-primary-bg)] px-4 text-sm font-medium text-[var(--btn-primary-text)]" onClick={async () => {
                const nuevoEstado = selectedEntrega.estado === 'Pendiente' ? 'En camino' : 'Entregado';
                try {
                  await deliveriesApi.updateStatus(selectedEntrega.id, nuevoEstado === 'En camino' ? 'EN_RUTA' : 'ENTREGADO');
                  setEntregas((prev) => prev.map((e) => e.id === selectedEntrega.id ? { ...e, estado: nuevoEstado } : e));
                  setSelectedEntrega((prev) => prev ? { ...prev, estado: nuevoEstado } : prev);
                  toast.success(`${selectedEntrega.id} actualizada a ${nuevoEstado}`);
                } catch {
                  toast.error('No se pudo actualizar el estado');
                }
              }}>
                Marcar avance
              </button>
            )}
          </div>
        }
      />
    </div>
  );
};