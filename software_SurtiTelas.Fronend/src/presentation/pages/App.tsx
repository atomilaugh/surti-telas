import React, { Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import ProtectedRoute from '@/presentation/routes/ProtectedRoute';
import Layout from '@/presentation/pages/layouts/Layout';
import ScrollToTop from '@/presentation/components/ScrollToTop';
import { Spinner } from '@/shared/ui';
import ErrorBoundary from '@/shared/components/ErrorBoundary';
import { NotificationProvider } from '@/shared/context';

const ProtectedLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-[var(--bg-canvas)]">
    <Spinner size="lg" />
  </div>
);

const AdminLayout = React.lazy(() => import('@/presentation/pages/admin/AdminLayout').then(m => ({ default: m.AdminLayout })));
const AdminDashboard = React.lazy(() => import('@/presentation/pages/admin/Dashboard').then(m => ({ default: m.AdminDashboard })));
const AdminClientes = React.lazy(() => import('@/presentation/pages/admin/Clientes').then(m => ({ default: m.AdminClientes })));
const AdminCatalogo = React.lazy(() => import('@/presentation/pages/admin/AdminCatalogo').then(m => ({ default: m.AdminCatalogo })));
const AdminPedidos = React.lazy(() => import('@/presentation/pages/admin/Pedidos').then(m => ({ default: m.AdminPedidos })));
const AdminProduccion = React.lazy(() => import('@/presentation/pages/admin/Produccion').then(m => ({ default: m.AdminProduccion })));
const AdminInventario = React.lazy(() => import('@/presentation/pages/admin/Inventario').then(m => ({ default: m.AdminInventario })));
const GestionUsuariosAsesores = React.lazy(() => import('@/presentation/pages/admin/GestionUsuariosAsesores').then(m => ({ default: m.GestionUsuariosAsesores })));
const AdminReportes = React.lazy(() => import('@/presentation/pages/admin/AdminReportesLayout').then(m => ({ default: m.AdminReportesLayout })));
const AdminDashboardAnalitico = React.lazy(() => import('@/presentation/pages/admin/DashboardAnalitico').then(m => ({ default: m.AdminDashboardAnalitico })));
const PortalCliente = React.lazy(() => import('@/presentation/pages/admin/PortalCliente').then(m => ({ default: m.PortalCliente })));

const AdminConfiguracion = React.lazy(() => import('@/presentation/pages/admin/AdminConfiguracion').then(m => ({ default: m.AdminConfiguracion })));
const AdminDomiciliosLayout = React.lazy(() => import('@/presentation/pages/admin/AdminDomiciliosLayout').then(m => ({ default: m.AdminDomiciliosLayout })));
const AdminRutaDelDia = React.lazy(() => import('@/presentation/pages/admin/RutaDelDiaAdmin').then(m => ({ default: m.RutaDelDiaAdmin })));
const AdminGestionUsuarios = React.lazy(() => import('@/presentation/pages/admin/GestionUsuarios').then(m => ({ default: m.AdminGestionUsuarios })));
const AdminGestionEmpleados = React.lazy(() => import('@/presentation/pages/admin/GestionEmpleados').then(m => ({ default: m.GestionEmpleados })));
const AdminGestionVentas = React.lazy(() => import('@/presentation/pages/admin/GestionVentas').then(m => ({ default: m.AdminGestionVentas })));
const AdminGestionRolesPermisos = React.lazy(() => import('@/presentation/pages/admin/GestionRolesPermisos').then(m => ({ default: m.AdminGestionRolesPermisos })));
const AdminSeguridadUsuarios = React.lazy(() => import('@/presentation/pages/admin/SeguridadUsuarios').then(m => ({ default: m.AdminSeguridadUsuarios })));
const _AdminProductosTerminados = React.lazy(() => import('@/presentation/pages/admin/ProductosTerminados').then(m => ({ default: m.AdminProductosTerminados })));
const AdminInsumos = React.lazy(() => import('@/presentation/pages/admin/Insumos').then(m => ({ default: m.AdminInsumos })));
const AdminProveedores = React.lazy(() => import('@/presentation/pages/admin/Proveedores').then(m => ({ default: m.AdminProveedores })));
const AdminGestionAcceso = React.lazy(() => import('@/presentation/pages/admin/GestionAcceso').then(m => ({ default: m.AdminGestionAcceso })));
const AdminPerfil = React.lazy(() => import('@/presentation/pages/admin/AdminPerfil').then(m => ({ default: m.AdminPerfil })));
const AdminAlertasStock = React.lazy(() => import('@/presentation/pages/admin/AlertasStock').then(m => ({ default: m.AdminAlertasStock })));
const AdminCategorias = React.lazy(() => import('@/presentation/pages/admin/AdminCategorias').then(m => ({ default: m.AdminCategorias })));
const AdminStockDevuelto = React.lazy(() => import('@/presentation/pages/admin/StockDevuelto').then(m => ({ default: m.AdminStockDevuelto })));
const AdminRegistroTalleres = React.lazy(() => import('@/presentation/pages/admin/RegistroTalleres').then(m => ({ default: m.AdminRegistroTalleres })));
const AdminControlPrendas = React.lazy(() => import('@/presentation/pages/admin/ControlPrendas').then(m => ({ default: m.AdminControlPrendas })));
const AdminAsignacionProduccion = React.lazy(() => import('@/presentation/pages/admin/AsignacionProduccion').then(m => ({ default: m.AdminAsignacionProduccion })));
const AdminSeguimientoProduccion = React.lazy(() => import('@/presentation/pages/admin/SeguimientoProduccion').then(m => ({ default: m.AdminSeguimientoProduccion })));
const AdminRecibos = React.lazy(() => import('@/presentation/pages/admin/Recibos').then(m => ({ default: m.AdminRecibos })));
const AdminCompras = React.lazy(() => import('@/presentation/pages/admin/AdminCompras').then(m => ({ default: m.AdminCompras })));
const AdminCategoriasInsumos = React.lazy(() => import('@/presentation/pages/admin/AdminCategoriasInsumos').then(m => ({ default: m.AdminCategoriasInsumos })));
const AdminPagos = React.lazy(() => import('@/presentation/pages/admin/Pagos').then(m => ({ default: m.AdminPagos })));
const AdminAbonos = React.lazy(() => import('@/presentation/pages/admin/Abonos').then(m => ({ default: m.AdminAbonos })));
const AdminReportesVentas = React.lazy(() => import('@/presentation/pages/admin/ReportesVentas').then(m => ({ default: m.AdminReportesVentas })));
const AdminReportesUsuarios = React.lazy(() => import('@/presentation/pages/admin/ReportesUsuarios').then(m => ({ default: m.AdminReportesUsuarios })));
const AdminReportesProduccion = React.lazy(() => import('@/presentation/pages/admin/ReportesProduccion').then(m => ({ default: m.AdminReportesProduccion })));
const AdminReportesInventario = React.lazy(() => import('@/presentation/pages/admin/ReportesInventario').then(m => ({ default: m.AdminReportesInventario })));

const AdminNotificaciones = React.lazy(() => import('@/presentation/pages/admin/AdminNotificaciones').then(m => ({ default: m.AdminNotificaciones })));
const AdminPedidosPersonalizados = React.lazy(() => import('@/presentation/pages/admin/PedidosPersonalizados').then(m => ({ default: m.AdminPedidosPersonalizados })));
const _AdminDevoluciones = React.lazy(() => import('@/presentation/pages/admin/AdminDevoluciones').then(m => ({ default: m.AdminDevoluciones })));
const AsesorLayout = React.lazy(() => import('@/presentation/pages/asesor/AsesorLayout').then(m => ({ default: m.AsesorLayout })));
const AsesorDashboard = React.lazy(() => import('@/presentation/pages/asesor/Dashboard').then(m => ({ default: m.AsesorDashboard })));
const AsesorClientes = React.lazy(() => import('@/presentation/pages/asesor/MisClientes').then(m => ({ default: m.AsesorClientes })));
const AsesorPedidos = React.lazy(() => import('@/presentation/pages/asesor/Pedidos').then(m => ({ default: m.AsesorPedidos })));
const AsesorCatalogo = React.lazy(() => import('@/presentation/pages/asesor/Catalogo').then(m => ({ default: m.AsesorCatalogo })));
const AsesorComisiones = React.lazy(() => import('@/presentation/pages/asesor/Comisiones').then(m => ({ default: m.AsesorComisiones })));
const AsesorPerfil = React.lazy(() => import('@/presentation/pages/asesor/PerfilAsesor').then(m => ({ default: m.AsesorPerfil })));

const DomiciliarioLayout = React.lazy(() => import('@/presentation/pages/domiciliario/DomiciliarioLayout').then(m => ({ default: m.DomiciliarioLayout })));
const DomiciliarioDashboard = React.lazy(() => import('@/presentation/pages/domiciliario/Dashboard').then(m => ({ default: m.DomiciliarioDashboard })));
const DomiciliarioEntregas = React.lazy(() => import('@/presentation/pages/domiciliario/MisEntregas').then(m => ({ default: m.DomiciliarioEntregas })));
const RutaDelDia = React.lazy(() => import('@/presentation/pages/domiciliario/RutaDelDia').then(m => ({ default: m.RutaDelDia })));
const DomiciliarioHistorial = React.lazy(() => import('@/presentation/pages/domiciliario/Historial').then(m => ({ default: m.DomiciliarioHistorial })));
const DomiciliarioPerfil = React.lazy(() => import('@/presentation/pages/domiciliario/PerfilDomiciliario').then(m => ({ default: m.DomiciliarioPerfil })));
const ClienteLayout = React.lazy(() => import('@/presentation/pages/cliente/ClienteLayout').then(m => ({ default: m.ClienteLayout })));
const InicioCliente = React.lazy(() => import('@/presentation/pages/cliente/InicioCliente').then(m => ({ default: m.InicioCliente })));
const CrearPedido = React.lazy(() => import('@/presentation/pages/cliente/CrearPedido').then(m => ({ default: m.CrearPedido })));
const MisPedidos = React.lazy(() => import('@/presentation/pages/cliente/MisPedidos').then(m => ({ default: m.MisPedidos })));
const PerfilCliente = React.lazy(() => import('@/presentation/pages/cliente/PerfilCliente').then(m => ({ default: m.PerfilCliente })));
const OrderTracking = React.lazy(() => import('@/presentation/pages/cliente/OrderTracking').then(m => ({ default: m.OrderTracking })));
const Recibos = React.lazy(() => import('@/presentation/pages/cliente/Recibos').then(m => ({ default: m.Recibos })));
const Favoritos = React.lazy(() => import('@/presentation/pages/cliente/Favoritos').then(m => ({ default: m.Favoritos })));
const ReportarDevolucion = React.lazy(() => import('@/presentation/pages/cliente/ReportarDevolucion').then(m => ({ default: m.ReportarDevolucion })));
const MisPedidosPersonalizados = React.lazy(() => import('@/presentation/pages/cliente/MisPedidosPersonalizados').then(m => ({ default: m.MisPedidosPersonalizados })));
const HomePage = React.lazy(() => import('@/presentation/pages/public/HomePage'));
const CatalogPage = React.lazy(() => import('@/presentation/pages/features/CatalogPage'));
const CartPage = React.lazy(() => import('@/presentation/pages/features/CartPage'));
const ContactPage = React.lazy(() => import('@/presentation/pages/features/ContactPage'));
const AboutPage = React.lazy(() => import('@/presentation/pages/public/AboutPage'));
const TooltipsDemo = React.lazy(() => import('@/presentation/pages/public/TooltipsDemo'));
const LoginPage = React.lazy(() => import('@/presentation/pages/auth/LoginPage'));
const RegisterPage = React.lazy(() => import('@/presentation/pages/auth/RegisterPage'));
const ForgotPasswordPage = React.lazy(() => import('@/presentation/pages/auth/ForgotPasswordPage'));
const ResetPasswordPage = React.lazy(() => import('@/presentation/pages/auth/ResetPasswordPage'));

const App: React.FC = () => {
  return (
  <BrowserRouter>
    <ScrollToTop />
    <ErrorBoundary>
      <Suspense fallback={<ProtectedLoader />}>
        <NotificationProvider>
          <Routes>
{/* PUBLIC */}
          <Route path="/" element={<Layout><HomePage /></Layout>} />
          <Route path="/catalogo" element={<Layout><CatalogPage /></Layout>} />
          <Route path="/carrito" element={<Layout><CartPage /></Layout>} />
          <Route path="/contacto" element={<Layout><ContactPage /></Layout>} />
          <Route path="/nosotros" element={<Layout><AboutPage /></Layout>} />
          <Route path="/tooltips" element={<Layout><TooltipsDemo /></Layout>} />

          {/* AUTH */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/olvide-contrasena" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/unauthorized" element={<Layout><div className="min-h-screen flex items-center justify-center"><div className="text-center"><h1 className="text-2xl font-bold mb-2">No autorizado</h1><p className="text-[var(--color-text-secondary)]">No tienes permisos para acceder a esta pÃ¡gina.</p></div></div></Layout>} />

          {/* ADMIN - Protected routes by permissions */}
          <Route path="/admin" element={
            <ProtectedRoute allowedRoles={[]} requiredPermissions={[]}>
              <React.Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Spinner size="lg" /></div>}>
                <AdminLayout />
              </React.Suspense>
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="clientes" element={<AdminClientes />} />
            <Route path="catalogo" element={<AdminCatalogo />} />
            <Route path="pedidos" element={<AdminPedidos />} />
            <Route path="produccion" element={<AdminProduccion />} />
            <Route path="inventario" element={<AdminInventario />} />
            <Route path="categorias" element={<AdminCategorias />} />
            <Route path="ruta-del-dia" element={<AdminDomiciliosLayout />}>
              <Route index element={<AdminRutaDelDia />} />
            </Route>

            <Route path="asesores" element={<GestionUsuariosAsesores />} />
            <Route path="reportes" element={<AdminReportes />}>
              <Route index element={<Navigate to="ventas" replace />} />
              <Route path="ventas" element={<AdminReportesVentas />} />
              <Route path="usuarios" element={<AdminReportesUsuarios />} />
              <Route path="produccion" element={<AdminReportesProduccion />} />
              <Route path="inventario" element={<AdminReportesInventario />} />
            </Route>
            <Route path="configuracion" element={<AdminConfiguracion />} />
            <Route path="roles" element={<Navigate to="gestion-roles-permisos" replace />} />
            <Route path="permisos" element={<Navigate to="gestion-roles-permisos" replace />} />
            <Route path="gestion-usuarios" element={<AdminGestionUsuarios />} />
            <Route path="empleados" element={<AdminGestionEmpleados />} />
            <Route path="gestion-ventas" element={<AdminGestionVentas />} />
            <Route path="gestion-roles-permisos" element={<AdminGestionRolesPermisos />} />
            <Route path="seguridad" element={<AdminSeguridadUsuarios />} />
            <Route path="productos" element={<AdminCatalogo />} />
            <Route path="insumos" element={<AdminInsumos />} />
            <Route path="proveedores" element={<AdminProveedores />} />
            <Route path="compras" element={<AdminCompras />} />
            <Route path="categorias-insumos" element={<AdminCategoriasInsumos />} />
            <Route path="gestion-acceso" element={<AdminGestionAcceso />} />
            <Route path="perfil" element={<AdminPerfil />} />
            <Route path="alertas-stock" element={<AdminAlertasStock />} />
            <Route path="stock-devuelto" element={<AdminStockDevuelto />} />
            <Route path="talleres" element={<AdminRegistroTalleres />} />
            <Route path="prendas" element={<AdminControlPrendas />} />
            <Route path="asignacion" element={<AdminAsignacionProduccion />} />
            <Route path="seguimiento" element={<AdminSeguimientoProduccion />} />
            <Route path="facturacion" element={<AdminRecibos />} />
            <Route path="pagos" element={<AdminPagos />} />
            <Route path="abonos" element={<AdminAbonos />} />
            <Route path="ventas-pedidos" element={<AdminPedidos />} />
            <Route path="reportes-ventas" element={<Navigate to="/admin/reportes/ventas" replace />} />
            <Route path="dashboard-analitico" element={<AdminDashboardAnalitico />} />
            <Route path="portal-cliente" element={<PortalCliente />} />
            <Route path="reportes-usuarios" element={<Navigate to="/admin/reportes/usuarios" replace />} />
              <Route path="reportes-produccion" element={<Navigate to="/admin/reportes/produccion" replace />} />
              <Route path="reportes-inventario" element={<Navigate to="/admin/reportes/inventario" replace />} />
              <Route path="pedidos-personalizados" element={<AdminPedidosPersonalizados />} />
            <Route path="StockDevuelto" element={<AdminStockDevuelto />} />
            <Route path="notificaciones" element={<AdminNotificaciones />} />
          </Route>

          {/* ASESOR - Protected routes by permissions */}
          <Route path="/asesor" element={
            <ProtectedRoute allowedRoles={[]} requiredPermissions={['asesor:dashboard:read']}>
              <AsesorLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AsesorDashboard />} />
            <Route path="clientes" element={<AsesorClientes />} />
            <Route path="pedidos" element={<AsesorPedidos />} />
            <Route path="catalogo" element={<AsesorCatalogo />} />
            <Route path="comisiones" element={<AsesorComisiones />} />
            <Route path="perfil" element={<AsesorPerfil />} />
          </Route>

          {/* DOMICILIARIO - Protected routes by permissions */}
          <Route path="/domiciliario" element={
            <ProtectedRoute allowedRoles={[]} requiredPermissions={['domiciliario:dashboard:read']}>
              <DomiciliarioLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DomiciliarioDashboard />} />
            <Route path="entregas" element={<DomiciliarioEntregas />} />
            <Route path="ruta" element={<RutaDelDia />} />
            <Route path="historial" element={<DomiciliarioHistorial />} />
            <Route path="perfil" element={<DomiciliarioPerfil />} />
          </Route>

          {/* CLIENTE - Protected routes by permissions */}
          <Route path="/cliente" element={
            <ProtectedRoute allowedRoles={[]} requiredPermissions={['cliente:inicio:read']}>
              <ClienteLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="inicio" replace />} />
            <Route path="inicio" element={<InicioCliente />} />
            <Route path="pedidos" element={<MisPedidos />} />
            <Route path="pedidos/crear" element={<CrearPedido />} />
            <Route path="recibos" element={<Recibos />} />
            <Route path="favoritos" element={<Favoritos />} />
            <Route path="seguimiento" element={<OrderTracking />} />
            <Route path="seguimiento/:orderId" element={<OrderTracking />} />
            <Route path="perfil" element={<PerfilCliente />} />
            <Route path="reportar-devolucion" element={<ReportarDevolucion />} />
            <Route path="pedidos-personalizados" element={<MisPedidosPersonalizados />} />
            <Route path="cotizaciones/nueva" element={<MisPedidosPersonalizados />} />
          </Route>

          <Route path="/perfil" element={
            <ProtectedRoute allowedRoles={[]}>
              <AdminPerfil />
            </ProtectedRoute>
          } />

          {/* REDIRECT */}
          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </NotificationProvider>
      </Suspense>
    </ErrorBoundary>
    <Toaster position="top-right" richColors />
  </BrowserRouter>
  );
};

export default App;

