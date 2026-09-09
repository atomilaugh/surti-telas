import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import { StatCard } from './StatCard';
import { BarChart, LineChart, PieChart, TopProducts } from './Chart';
import s from './Dashboard.module.css';
import { StatusBadge } from '@/shared/ui/StatusBadge';
import { Button } from '@/shared/ui/Button';
import { Loader2, AlertCircle, RefreshCw, Home } from 'lucide-react';
import { ordersApi, type DashboardMetrics } from '@/infrastructure/api/ordersApi';
import { adminContent } from '@/shared/config/adminContent';
import { tokenStorage } from '@/infrastructure/api/tokenStorage';
import { useAuthStore } from '@/core/stores/authStore';
import { SYSTEM_MODULES } from '@/shared/config/systemModules';
import { hasModulePermission } from '@/presentation/routes/protectedRouteHelpers';

const formatoCOP = (valor: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor);

const formatoMes = (iso: string) => {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }).format(d);
};

export const AdminDashboard: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dashboardContent = adminContent.dashboard;

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);

    if (!tokenStorage.getAccessToken()) {
      setError('No hay sesión activa. Inicia sesión nuevamente.');
      setLoading(false);
      return;
    }

    try {
      const data = await ordersApi.getDashboard();
      const sorted = (data.recentOrders ?? [])
        .slice()
        .sort((a, b) => String(b.id).localeCompare(String(a.id)))
        .slice(0, 6)
        .map(p => ({
          id: p.id,
          numero: p.numero || p.id,
          clienteNombre: p.clienteNombre,
          asesorNombre: p.asesorNombre,
          total: Number(p.total) || 0,
          estado: p.estado,
          createdAt: p.createdAt,
        }));
      setMetrics({
        totalOrders: data.totalOrders,
        totalCustomers: data.totalCustomers,
        totalSales: Number(data.totalSales) || 0,
        ordersByStatus: data.ordersByStatus,
        recentOrders: sorted,
        lowStockProducts: (data.lowStockProducts ?? []).slice(0, 10).map(p => ({
          id: p.id,
          ref: p.ref ?? p.id,
          nombre: p.nombre,
          cantidadStock: p.cantidadStock ?? 0,
        })),
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'No se pudieron cargar las métricas del dashboard';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const availableModules = useMemo(() => {
    const perms = user?.permissions ?? [];
    return SYSTEM_MODULES.filter(m => hasModulePermission(perms, m.key));
  }, [user?.permissions]);

  const moduleCards = useMemo(() => {
    return availableModules.map(mod => ({
      label: mod.name,
      value: mod.route,
      Icon: mod.icon,
      color: 'accent' as const,
    }));
  }, [availableModules]);

  if (availableModules.length === 0) {
    return (
      <div className={s.page}>
        <h1 className={s.pageTitle}>Acceso limitado</h1>
        <p className={s.pageSubtitle}>Tu usuario no tiene módulos asignados. Contacta al administrador.</p>
      </div>
    );
  }

  return (
    <div className={s.page}>
      <h1 className={s.pageTitle}>{dashboardContent.title}</h1>
      <p className={s.pageSubtitle}>{dashboardContent.subtitle}</p>

      {loading && (
        <div className={s.loadingRow}>
          <Loader2 size={18} className={s.spin} />
          <span>{dashboardContent.loading}</span>
        </div>
      )}
      {error && !loading && (
        <div className={s.errorState}>
          <div className={s.errorCard}>
            <div className={s.errorIconWrap}>
              <AlertCircle size={28} className={s.errorIcon} />
            </div>
            <h2 className={s.errorTitle}>No pudimos cargar el dashboard</h2>
            <p className={s.errorText}>Ocurrió un problema al cargar la información. Puedes intentar nuevamente.</p>
            <div className={s.errorActions}>
              <Button onClick={() => void loadDashboard()} leftIcon={<RefreshCw size={16} />}>
                Reintentar
              </Button>
              <Button variant="secondary" onClick={() => { window.location.href = '/'; }} leftIcon={<Home size={16} />}>
                Volver al inicio
              </Button>
            </div>
          </div>
        </div>
      )}

      {metrics && !loading && (
        <>
          <div className={s.statsGrid}>
            {moduleCards.map((card, i) => (
              <StatCard key={i} {...card} />
            ))}
          </div>

          <div className={s.chartsGrid}>
            <div className={s.chartCard}>
              <BarChart data={(metrics.recentOrders ?? []).slice(0, 6).map((o, i) => ({ label: `#${i + 1}`, value: o.total ?? 0 }))} title={dashboardContent.charts.salesByOrder} />
            </div>
            <div className={s.chartCard}>
              <PieChart data={(metrics.ordersByStatus || []).map(o => ({ label: o.estado, value: o.cantidad ?? 0 }))} title={dashboardContent.charts.orderStatus} />
            </div>
            <div className={s.chartCard}>
              <LineChart data={(metrics.ordersByStatus || []).map(o => ({ label: o.estado.slice(0, 3), value: o.cantidad ?? 0 }))} title={dashboardContent.charts.trendOrders} />
            </div>
            <div className={s.chartCard}>
              <TopProducts data={(metrics.lowStockProducts || []).slice(0, 5).map((p, i) => ({ rank: i + 1, name: p.nombre, sales: `${p.cantidadStock ?? 0} uds` }))} title={dashboardContent.charts.lowStock} />
            </div>
          </div>

          <div className={s.bottomGrid}>
            <div className={s.tableSection}>
              <h2 className={s.sectionTitle}>{dashboardContent.tables.recentOrders}</h2>
              <div className={s.tableWrapper}>
                <table className={s.table}>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Cliente</th>
                      <th>Asesor</th>
                      <th>Total</th>
                      <th>Estado</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(metrics.recentOrders ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'rgba(255,255,255,0.5)' }}>
                          {dashboardContent.tables.empty}
                        </td>
                      </tr>
                    ) : (
                       (metrics.recentOrders ?? []).map((order) => (
                         <tr key={order.id}>
                           <td className={s.tdMono}>{order.numero}</td>
                           <td className={s.tdPrimary}>{order.clienteNombre}</td>
                           <td>{order.asesorNombre}</td>
                           <td>{formatoCOP(order.total)}</td>
                           <td>
                               <StatusBadge status={order.estado} />
                           </td>
                           <td>{formatoMes(order.createdAt)}</td>
                         </tr>
                       ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={s.activitySection}>
              <h2 className={s.sectionTitle}>{dashboardContent.tables.recentActivity}</h2>
              <div className={s.activityList}>
                {(metrics.recentOrders ?? []).length === 0 ? (
                  <div className={s.activityItem}>
                    <span className={s.activityText}>{dashboardContent.tables.noActivity}</span>
                  </div>
                ) : (
                     (metrics.recentOrders ?? []).slice(0, 4).map((order) => (
                       <div className={s.activityItem} key={order.id}>
                         <span className={s.activityTime}>{formatoMes(order.createdAt)}</span>
                         <span className={s.activityText}>Pedido {order.numero} · {order.clienteNombre}</span>
                       </div>
                     ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
