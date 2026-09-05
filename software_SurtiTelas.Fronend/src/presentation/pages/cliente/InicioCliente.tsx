import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { StatCard } from '../admin/StatCard';
import { ShoppingBag, Clock, CheckCircle2, DollarSign, ArrowRight, Package, User, MapPin, MessageCircle, Archive, Loader2, AlertCircle } from 'lucide-react';
import s from './InicioCliente.module.css';
import { Badge } from '@/shared/ui/Badge';
import { DetailModal } from '@/shared/ui/DetailModal';
import { Button } from '@/shared/ui/Button';
import type { Pedido } from '@/core/types';
import { ordersApi } from '@/infrastructure/api/ordersApi';
import { useAuthStore } from '@/core/stores/authStore';

const statusVariant = (estado: Pedido['estado']) => {
  if (estado === 'Entregado') return 'success';
  if (estado === 'Listo' || estado === 'Enviado') return 'info';
  if (estado === 'Rechazado' || estado === 'Cancelado') return 'danger';
  return 'default';
};

export const InicioCliente: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pedidoActivoState, setPedidoActivoState] = useState<Pedido | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const ordersResult = await ordersApi.list();
        setPedidos(ordersResult.pedidos);
      } catch {
        setError('No se pudieron cargar tus datos. Intenta nuevamente.');
        toast.error('Error al cargar el dashboard');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const pedidoActivo = pedidos.find(p => p.estado !== 'Entregado' && p.estado !== 'Rechazado' && p.estado !== 'Cancelado') || pedidos[0] || null;
  const totalPedidos = pedidos.length;
  const pedidosEnProceso = pedidos.filter(p => p.estado === 'Listo' || p.estado === 'Enviado' || p.estado === 'Entregado').length;
  const pedidosEntregados = pedidos.filter(p => p.estado === 'Entregado').length;

  const stats = [
    { label: 'Pedidos Realizados', value: String(totalPedidos), trend: 'Total histórico', trendUp: true, Icon: ShoppingBag, color: 'accent' as const },
    { label: 'En Proceso', value: String(pedidosEnProceso), trend: 'Activos ahora', trendUp: true, Icon: Clock, color: 'warning' as const },
    { label: 'Entregados', value: String(pedidosEntregados), trend: 'Completados', trendUp: true, Icon: CheckCircle2, color: 'success' as const },
  ];

  const asesorNombre = pedidos.find(p => p.asesor)?.asesor ?? 'Sin asignar';
  const asesorIniciales = asesorNombre !== 'Sin asignar'
    ? asesorNombre.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : '—';
  const asesorAsignado = {
    nombre: asesorNombre,
    iniciales: asesorIniciales,
    telefono: pedidos.find(p => p.asesorTelefono)?.asesorTelefono || '',
    email: pedidos.find(p => p.asesorEmail)?.asesorEmail || '',
  };

  const ultimosPedidos = pedidos.slice(0, 5);

  const openPedido = (pedido: Pedido) => setPedidoActivoState(pedido);

  if (loading) {
    return (
      <div className={s.inicioLayout}>
        <div className={s.loadingState}>
          <Loader2 size={28} className={s.loadingSpinner} />
          <span>Cargando tu dashboard…</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={s.inicioLayout}>
        <div className={s.errorState}>
          <AlertCircle size={28} />
          <span>{error}</span>
          <Button variant="secondary" onClick={() => window.location.reload()}>Reintentar</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={s.inicioLayout}>
      <h1 className={s.pageTitle}>Dashboard</h1>
      <p className={s.pageSubtitle}>Resumen de tu experiencia de compra</p>

      <div className={s.welcomeBanner}>
        <div className={s.welcomeText}>
          <div className={s.welcomeGreeting}>¡Bienvenido de vuelta!</div>
          <div className={s.welcomeName}>
            {user?.name || 'Cliente'} <span>▸ Tienda</span>
          </div>
          <div className={s.welcomeDesc}>
            Consulta nuestro catálogo de productos, haz seguimiento a tus pedidos y gestiona tu perfil desde un solo lugar.
          </div>
          <div className={s.welcomeActions}>
            <Link to="/cliente/pedidos" className="inline-flex">
              <button className="btn btn--primary btn--sm">Mis pedidos</button>
            </Link>
            <Link to="/catalogo" className="inline-flex">
              <button className="btn btn--secondary btn--sm">Ver catálogo</button>
            </Link>
          </div>
        </div>
        <div className={s.welcomeIllustration}>
          <ShoppingBag size={64} />
        </div>
      </div>

      <div className={s.statsGrid}>
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      <div className={s.mainGrid}>
        <div className={s.pedidoActivoCard}>
          <div className={s.pedidoActivoHeader}>
            <div className={s.pedidoActivoTitle}>Pedido activo</div>
            <Badge variant={pedidoActivo ? statusVariant(pedidoActivo.estado) : 'default'}>{pedidoActivo?.estado || 'Sin pedido'}</Badge>
          </div>
          <div className={s.pedidoActivoBody}>
            <div className={s.pedidoActivoId}>
              {pedidoActivo ? `${pedidoActivo.id} • ${pedidoActivo.fecha} • ${pedidoActivo.items} artículos • Total: ${pedidoActivo.total}` : 'No tienes pedidos activos'}
            </div>

            <div className={s.trackingTimeline}>
              <div className={s.trackingStep}>
                <div className={s.trackingLeft}>
                  <div className={`${s.trackingDot} ${s['trackingDot--done']}`}>✓</div>
                  <div className={`${s.trackingLine} ${s['trackingLine--done']}`} />
                </div>
                <div className={s.trackingContent}>
                  <div className={s.trackingLabel}>Pedido recibido</div>
                  <div className={s.trackingDesc}>Tu pedido fue registrado</div>
                </div>
              </div>
              <div className={s.trackingStep}>
                <div className={s.trackingLeft}>
                  <div className={`${s.trackingDot} ${pedidoActivo && ['Aceptado', 'En validación', 'Recibo generado', 'Listo'].includes(pedidoActivo.estado) ? s['trackingDot--active'] : s['trackingDot--done']}`}>
                    {pedidoActivo && ['Aceptado', 'En validación', 'Recibo generado', 'Listo'].includes(pedidoActivo.estado) ? '●' : '✓'}
                  </div>
                  <div className={`${s.trackingLine} ${pedidoActivo && ['Aceptado', 'En validación', 'Recibo generado', 'Listo', 'Enviado', 'Entregado'].includes(pedidoActivo.estado) ? s['trackingLine--done'] : s['trackingLine--pending']}`} />
                </div>
                <div className={s.trackingContent}>
                  <div className={s.trackingLabel}>En proceso</div>
                  <div className={s.trackingDesc}>Estamos preparando tu pedido</div>
                </div>
              </div>
              <div className={s.trackingStep}>
                <div className={s.trackingLeft}>
                  <div className={`${s.trackingDot} ${pedidoActivo?.estado === 'Enviado' ? s['trackingDot--done'] : s['trackingDot--pending']}`}>
                    {pedidoActivo?.estado === 'Enviado' ? '✓' : ''}
                  </div>
                  <div className={`${s.trackingLine} ${pedidoActivo && ['Enviado', 'Entregado'].includes(pedidoActivo.estado) ? s['trackingLine--done'] : s['trackingLine--pending']}`} />
                </div>
                <div className={s.trackingContent}>
                  <div className={s.trackingLabel}>Enviado</div>
                  <div className={s.trackingDesc}>En camino a tu dirección</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className={s.asesorCard}>
          <div className={s.asesorCardTitle}>Asesor asignado</div>
          <div className={s.asesorProfile}>
            <div className={s.asesorAvatarLg}>{asesorAsignado.iniciales}</div>
            <div>
              <div className={s.asesorName}>{asesorAsignado.nombre}</div>
              <div className={s.asesorContact}>Asesor de Ventas</div>
            </div>
          </div>
          <div className={s.asesorContactRow}>
            <MapPin size={14} className={s.asesorContactIcon} />
            {asesorAsignado.telefono || 'Sin asignar'}
          </div>
          <div className={s.asesorContactRow}>
            <User size={14} className={s.asesorContactIcon} />
            {asesorAsignado.email || 'Sin asignar'}
          </div>
        </div>
      </div>

      <div className={s.bottomGrid}>
        <div className={s.quickAccessGrid}>
          <Link to="/cliente/pedidos" className={s.quickAccessCard} style={{ textDecoration: 'none' }} onClick={() => toast.info('Navegando a mis pedidos')}>
            <div className={`${s.quickAccessIcon} ${s.quickAccessIconSuccess}`}>
              <ShoppingBag size={22} />
            </div>
            <div className={s.quickAccessLabel}>Mis Pedidos</div>
            <div className={s.quickAccessDesc}>Seguimiento de tus compras</div>
            <ArrowRight size={16} className={s.quickAccessArrow} />
          </Link>

          <Link to="/cliente/perfil" className={s.quickAccessCard} style={{ textDecoration: 'none' }} onClick={() => toast.info('Navegando a mi perfil')}>
            <div className={`${s.quickAccessIcon} ${s.quickAccessIconInfo}`}>
              <User size={22} />
            </div>
            <div className={s.quickAccessLabel}>Mi Perfil</div>
            <div className={s.quickAccessDesc}>Datos personales y direcciones</div>
            <ArrowRight size={16} className={s.quickAccessArrow} />
          </Link>
        </div>

        <div className={s.historialCard}>
          <div className={s.historialHeader}>
            <div className={s.historialTitle}>Últimos pedidos</div>
          </div>
          <div className={s.historialList}>
            {ultimosPedidos.length === 0 ? (
              <div style={{ padding: '20px', color: 'var(--color-text-secondary)' }}>No hay pedidos</div>
            ) : (
              ultimosPedidos.map((pedido) => (
                <button type="button" key={pedido.id} className={s.historialItem} onClick={() => openPedido(pedido)}>
                  <div>
                    <div className={s.historialId}>{pedido.id}</div>
                    <div className={s.historialMeta}>{pedido.fecha} • {pedido.estado}</div>
                  </div>
                  <div className={s.historialTotal}>{pedido.total}</div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      <DetailModal
        children={null}
        open={Boolean(pedidoActivoState)}
        onClose={() => setPedidoActivoState(null)}
        title={pedidoActivoState ? `Pedido ${pedidoActivoState.id}` : 'Pedido'}
        subtitle={pedidoActivoState?.fecha}
        size="lg"
        header={{
          icon: <Archive size={18} />,
          status: pedidoActivoState ? <Badge variant={statusVariant(pedidoActivoState.estado)}>{pedidoActivoState.estado}</Badge> : undefined,
        }}
        sections={[
          {
            title: 'Seguimiento',
            fields: [
              { label: 'Cliente', value: pedidoActivoState?.cliente, icon: <User size={16} /> },
              { label: 'Total', value: pedidoActivoState?.total, icon: <DollarSign size={16} /> },
              { label: 'Artículos', value: pedidoActivoState?.items, icon: <Package size={16} /> },
              { label: 'Observaciones', value: pedidoActivoState?.observaciones || 'Sin observaciones', fullWidth: true, icon: <MessageCircle size={16} /> },
            ],
          },
          {
            title: 'Artículos',
            children: (
              <div className="grid gap-2">
                {(pedidoActivoState?.itemsList || []).map((item, index) => (
                  <div key={`${item.nombre}-${index}`} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-elevated)] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium text-[var(--color-text-primary)]">{item.nombre}</div>
                      <div className="text-sm text-[var(--color-text-muted)]">x{item.cantidad}</div>
                    </div>
                  </div>
                ))}
                {(!(pedidoActivoState?.itemsList || []).length) && <div className="text-sm text-[var(--color-text-muted)]">Sin detalle de artículos registrado.</div>}
              </div>
            ),
          },
        ]}
      />
    </div>
  );
};
