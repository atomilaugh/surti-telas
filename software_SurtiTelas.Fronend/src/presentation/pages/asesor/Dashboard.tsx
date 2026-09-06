import React, { useMemo, useEffect, useState } from 'react';
import { StatCard } from '../admin/StatCard';
import s from './Dashboard.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Users, ShoppingBag, BadgeDollarSign, Target } from 'lucide-react';
import { ordersApi } from '@/infrastructure/api/ordersApi';
import { customersApi } from '@/infrastructure/api/customersApi';
import { useAuthStore } from '@/core/stores/authStore';
import type { Pedido, Cliente } from '@/core/types';

export const AsesorDashboard: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [ordersResult, clientsResult] = await Promise.all([
          ordersApi.list({ asesorId: user?.uid }),
          customersApi.list({ asesorId: user?.uid }),
        ]);
        setPedidos(ordersResult.pedidos);
        setClientes(clientsResult.data.filter((c) => c.asesor === user?.name));
      } catch {
        setError('No se pudieron cargar las métricas');
      } finally {
        setLoading(false);
      }
    };
    if (user?.uid) void load();
  }, [user?.uid, user?.name]);

  const misPedidos = pedidos;
  const misClientes = clientes;

  const totalPedidos = misPedidos.length;
  const totalClientes = misClientes.length;
  const ingresosTotales = misPedidos
    .filter((p) => p.estado === 'Entregado')
    .reduce((sum, p) => sum + (parseInt(p.total.replace(/[^0-9]/g, ''), 10) || 0), 0);

  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const parsePedidoFecha = (fecha: string) => {
    const meses: Record<string, number> = { 'ene': 0, 'feb': 1, 'mar': 2, 'abr': 3, 'may': 4, 'jun': 5, 'jul': 6, 'ago': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dic': 11 };
    const partes = fecha.toLowerCase().trim().split(' ');
    if (partes.length >= 3) {
      const dia = parseInt(partes[0], 10);
      const mes = meses[partes[1].replace('.', '')];
      const anio = parseInt(partes[2], 10);
      if (!Number.isNaN(dia) && mes !== undefined && !Number.isNaN(anio)) {
        return new Date(anio, mes, dia);
      }
    }
    const d = new Date(fecha);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const pedidosMesActual = misPedidos.filter((p) => {
    const d = parsePedidoFecha(p.fecha);
    return d && d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  });
  const pedidosMesAnterior = misPedidos.filter((p) => {
    const d = parsePedidoFecha(p.fecha);
    return d && d.getFullYear() === prevYear && d.getMonth() === prevMonth;
  });

  const diffMesActual = pedidosMesActual.length - pedidosMesAnterior.length;
  const pedidosMesActualNum = pedidosMesActual.length;
  const pedidosMesAnteriorNum = pedidosMesAnterior.length;
  const tendenciaPedidos = pedidosMesAnteriorNum > 0
    ? `${diffMesActual >= 0 ? '+' : ''}${diffMesActual} vs mes ant.`
    : 'Sin datos del mes ant.';

  const clientesMesActual = misClientes.filter((c) => {
    const d = parsePedidoFecha(misPedidos.find((p) => p.cliente === c.nombre)?.fecha || '');
    return d && d.getFullYear() === currentYear && d.getMonth() === currentMonth;
  }).length;

  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const _daysRemaining = Math.max(lastDayOfMonth.getDate() - today.getDate(), 0);

  const ultimaCompraPorCliente = useMemo(() => {
    const map: Record<string, string> = {};
    misPedidos.forEach((p) => {
      if (!map[p.cliente] || p.fecha > map[p.cliente]) map[p.cliente] = p.fecha;
    });
    return map;
  }, [misPedidos]);

  const stats = [
    { label: 'Mis Clientes', value: String(totalClientes), trend: clientesMesActual > 0 ? `+${clientesMesActual} este mes` : 'Sin datos', trendUp: clientesMesActual > 0, Icon: Users, color: 'accent' as const },
    { label: 'Pedidos del Mes', value: String(pedidosMesActualNum), trend: tendenciaPedidos, trendUp: diffMesActual >= 0, Icon: ShoppingBag, color: 'success' as const },
    { label: 'Comisión Acumulada', value: ingresosTotales > 0 ? `$${(ingresosTotales * 0.05).toLocaleString()}` : '—', trend: ingresosTotales > 0 ? 'Por ventas entregadas' : 'Sin datos', trendUp: ingresosTotales > 0, Icon: BadgeDollarSign, color: 'warning' as const },
    { label: 'Ventas Entregadas', value: ingresosTotales > 0 ? `$${ingresosTotales.toLocaleString('es-CO')}` : '—', trend: totalPedidos > 0 ? `${totalPedidos} pedidos en total` : 'Sin datos', trendUp: totalPedidos > 0, Icon: Target, color: 'info' as const },
  ];

  const actividad = useMemo(() => {
    if (misPedidos.length === 0) {
      return [{ tipo: 'info' as const, texto: 'Sin actividad reciente', tiempo: '' }];
    }
    return misPedidos.slice(0, 4).map((p) => ({
      tipo: p.estado === 'Entregado' ? ('success' as const) : p.estado === 'Rechazado' ? ('danger' as const) : p.estado === 'Enviado' ? ('info' as const) : ('warning' as const),
      texto: `Pedido ${p.id} — ${p.cliente}`,
      tiempo: p.fecha,
    }));
  }, [misPedidos]);

  if (loading) {
    return (
      <div>
        <h1 className={s.pageTitle}>Dashboard</h1>
        <p className={s.pageSubtitle}>Cargando métricas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className={s.pageTitle}>Dashboard</h1>
        <p className={s.pageSubtitle}>{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className={s.pageTitle}>Dashboard</h1>
      <p className={s.pageSubtitle}>Métricas de tus ventas</p>

      <div className={s.statsGrid}>
        {stats.map((stat, i) => (
          <StatCard key={i} {...stat} />
        ))}
      </div>

      <div className={s.middleGrid}>
        <div className={s.tableSection}>
          <h2 className={s.sectionTitle}>Mis pedidos recientes</h2>
          <div className={s.tableWrapper}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Cliente</th>
                  <th>Fecha</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {misPedidos.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
                      No hay pedidos
                    </td>
                  </tr>
                ) : (
                  misPedidos.map((order) => (
                    <tr key={order.id}>
                      <td className={s.tdMono}>{order.id}</td>
                      <td className={s.tdPrimary}>{order.cliente}</td>
                      <td>{order.fecha}</td>
                      <td>{order.items}</td>
                      <td>{order.total}</td>
                      <td>
                        <StatusBadge status={order.estado} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={s.metaCard}>
          <div className={s.metaHeader}>
            <span className={s.metaTitle}>Ventas del mes actual</span>
            <span className={s.metaPercent}>{pedidosMesActualNum} pedidos</span>
          </div>
          <div className={s.progressTrack}>
            <div className={s.progressFill} style={{ width: `${pedidosMesAnteriorNum > 0 ? Math.min(Math.round((pedidosMesActualNum / pedidosMesAnteriorNum) * 100), 100) : (pedidosMesActualNum > 0 ? 100 : 0)}%` }} />
          </div>
          <div className={s.metaDetail}>
            <span>Ventas logradas: <strong>${ingresosTotales.toLocaleString('es-CO')}</strong></span>
            <span>Mes anterior: <strong>{pedidosMesAnteriorNum} pedidos</strong></span>
          </div>
        </div>
      </div>

      <div className={s.bottomGrid}>
        <div className={s.tableSection}>
          <h2 className={s.sectionTitle}>Mis clientes recientes</h2>
          <div className={s.tableWrapper}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombre</th>
                  <th>Ciudad</th>
                  <th>Pedidos</th>
                  <th>Última Compra</th>
                </tr>
              </thead>
              <tbody>
                {misClientes.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.5)' }}>
                      No hay clientes
                    </td>
                  </tr>
                ) : (
                  misClientes.map((cliente) => (
                    <tr key={cliente.id}>
                      <td className={s.tdMono}>{cliente.id}</td>
                      <td className={s.tdPrimary}>{cliente.nombre}</td>
                      <td>{cliente.ciudad}</td>
                      <td>{cliente.pedidos}</td>
                      <td>{ultimaCompraPorCliente[cliente.nombre] || 'Sin compras'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className={s.tableSection}>
          <h2 className={s.sectionTitle}>Actividad reciente</h2>
          <div className={s.activityList}>
            {actividad.map((a, i) => (
              <div key={i} className={s.activityItem}>
                <div className={`${s.activityDot} ${a.tipo === 'success' ? s.activityDotSuccess : a.tipo === 'info' ? s.activityDotInfo : s.activityDotWarning}`} />
                <span className={s.activityText}>{a.texto}</span>
                <span className={s.activityTime}>{a.tiempo}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};