# Documentación Completa - Dashboards ERP SurtiTelas

## ðŸŽ¯ Stack Tecnológico Base

- React 18+
- TypeScript
- Vite
- Tailwind CSS v4
- Recharts
- Lucide React
- Radix UI
- Class Variance Authority
- Sonner

---

## ðŸ” Acceso desde Login

El acceso a todos los dashboards y módulos se realiza únicamente desde la página de login.
El usuario debe iniciar sesión en `/login` con las credenciales correspondientes antes de poder entrar a cualquier dashboard.

---

## 1ï¸âƒ£ Dashboard Administrador

### ðŸ” Credenciales
- Email: `admin@surticamisetas.com`
- Password: `admin123`

### ðŸ“ Estructura de Archivos

```
src/
â”œâ”€â”€ app/
â”‚   â”œâ”€â”€ components/
â”‚   â”‚   â”œâ”€â”€ AdminDashboard.tsx          # Componente principal
â”‚   â”‚   â”œâ”€â”€ admin/
â”‚   â”‚   â”‚   â”œâ”€â”€ DashboardGeneral.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ ConfiguracionModule.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ UsuariosModule.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ InventarioModule.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ ProduccionModule.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ VentasModule.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ HistorialPagosModule.tsx
â”‚   â”‚   â”‚   â”œâ”€â”€ ReportesModule.tsx
â”‚   â”‚   â”‚   â””â”€â”€ NotificationsDropdown.tsx
â”‚   â”‚   â””â”€â”€ ui/
â”‚   â”‚       â”œâ”€â”€ card.tsx
â”‚   â”‚       â”œâ”€â”€ button.tsx
â”‚   â”‚       â”œâ”€â”€ badge.tsx
â”‚   â”‚       â”œâ”€â”€ input.tsx
â”‚   â”‚       â”œâ”€â”€ label.tsx
â”‚   â”‚       â”œâ”€â”€ select.tsx
â”‚   â”‚       â”œâ”€â”€ dialog.tsx
â”‚   â”‚       â”œâ”€â”€ textarea.tsx
â”‚   â”‚       â”œâ”€â”€ scroll-area.tsx
â”‚   â”‚       â”œâ”€â”€ table.tsx
â”‚   â”‚       â””â”€â”€ tabs.tsx
â”‚   â””â”€â”€ config/
â”‚       â””â”€â”€ menuConfig.ts
â””â”€â”€ styles/
    â”œâ”€â”€ index.css
    â”œâ”€â”€ default_theme.css
    â””â”€â”€ globals.css
```

### ðŸŽ¨ Diseño del Layout

#### `AdminDashboard.tsx`

```tsx
interface AdminDashboardProps {
  onLogout: () => void;
  orders?: any[];
  onUpdateOrderStatus?: (orderId: string, status: string) => void;
  userRole?: 'admin' | 'asesor' | 'domiciliario';
  userName?: string;
}
```

```tsx
<div className="flex h-screen overflow-hidden bg-[#F5F6FA]">
  {/* Sidebar */}
  {/* Main Content */}
</div>
```

---

### ðŸ§­ Sidebar

#### Clases CSS principales

```tsx
className={`bg-[#0D0D0D] text-white transition-all duration-300 ease-in-out flex flex-col fixed lg:relative inset-y-0 left-0 z-50 ${
  isMobile 
    ? `w-72 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`
    : sidebarCollapsed ? 'w-20' : 'w-72'
}`}
```

#### Header del sidebar

```tsx
<div className="flex items-center justify-between p-4 border-b border-gray-800 relative">
  <img src={logoBlanco} alt="Surti Camisetas" className="h-6 w-auto object-contain" />
  {/* Botón toggle collapse */}
</div>
```

#### Item de menú

```tsx
<button className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
  activeModule === item.id || activeModule.startsWith(item.id)
    ? 'bg-white/10 text-white'
    : 'text-gray-400 hover:bg-white/5 hover:text-white'
}`}>
  <item.icon className="h-5 w-5" />
  <span>{item.label}</span>
  {/* ChevronDown si tiene submenú */}
</button>
```

#### Submenú

```tsx
<div className="ml-8 mt-1 space-y-1">
  <button className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
    activeModule === subItem.id
      ? 'bg-white/10 text-white'
      : 'text-gray-400 hover:bg-white/5 hover:text-white'
  }`}>
    <span>{subItem.label}</span>
  </button>
</div>
```

#### Botón â€œCerrar Sesiónâ€

```tsx
<button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-gray-400 hover:bg-red-500/10 hover:text-red-500">
  <LogOut className="h-5 w-5" />
  <span>Cerrar Sesión</span>
</button>
```

---

### ðŸ Header

#### Estructura exacta

```tsx
<div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between">
  {/* Lado izquierdo */}
  <div className="flex items-center gap-2 sm:gap-4">
    {/* Hamburger menu (móvil) */}
    <button className="text-gray-600 hover:text-gray-900 p-2 -ml-2">
      <Menu className="h-6 w-6" />
    </button>
    
    {/* Búsqueda */}
    <div className="relative hidden sm:block">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
      <Input
        type="text"
        placeholder="Buscar..."
        className="pl-10 w-48 lg:w-64 bg-gray-50"
      />
    </div>
  </div>

  {/* Lado derecho */}
  <div className="flex items-center gap-2 sm:gap-3">
    {/* Notificaciones */}
    <NotificationsDropdown />
    
    {/* Botón exportar */}
    <Button variant="outline" size="sm" className="hidden sm:flex">
      <Download className="h-4 w-4 mr-2" />
      Exportar
    </Button>
    
    {/* Avatar y perfil */}
    <div className="flex items-center gap-2 sm:gap-3">
      <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-900 flex items-center justify-center text-white text-sm">
        {userName.charAt(0).toUpperCase()}
      </div>
      <div className="text-sm hidden md:block">
        <p className="font-medium">{userName}</p>
        <p className="text-gray-500 text-xs">{userEmail}</p>
      </div>
    </div>
  </div>
</div>
```

---

## ðŸ“Š Dashboard General â€” `DashboardGeneral.tsx`

### KPIs superiores

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
```

#### Cards

- Total usuarios
- Empleados / asesores
- Total insumos
- Productos terminados
- Ventas del mes
- Pedidos procesados

Cada card:

```tsx
<Card className="p-6 bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow">
  <div className="flex items-center gap-4">
    <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
      <Users className="h-6 w-6 text-blue-600" />
    </div>
    <div>
      <p className="text-2xl font-bold text-gray-900">248</p>
      <p className="text-sm text-gray-600">Total usuarios</p>
    </div>
  </div>
</Card>
```

---

### ðŸš€ Accesos Rápidos a Módulos

```ts
const modules = [
  {
    id: 'configuracion',
    icon: Settings,
    title: 'Configuración',
    description: 'Roles, permisos y configuración del sistema',
    color: 'from-blue-500 to-blue-600',
  },
  {
    id: 'usuarios',
    icon: Users,
    title: 'Usuarios',
    description: 'Gestión de usuarios, acceso y seguridad',
    color: 'from-purple-500 to-purple-600',
  },
  {
    id: 'inventario',
    icon: Package,
    title: 'Inventario',
    description: 'Insumos, productos y proveedores',
    color: 'from-green-500 to-green-600',
  },
  {
    id: 'produccion',
    icon: Factory,
    title: 'Producción en Talleres',
    description: 'Gestión de talleres externos y producción',
    color: 'from-orange-500 to-orange-600',
  },
  {
    id: 'ventas',
    icon: ShoppingCart,
    title: 'Ventas y Pedidos',
    description: 'Clientes, pedidos, facturación y pagos',
    color: 'from-pink-500 to-pink-600',
  },
  {
    id: 'devoluciones',
    icon: RotateCcw,
    title: 'Devoluciones',
    description: 'Control de stock devuelto e inspección',
    color: 'from-red-500 to-red-600',
  },
  {
    id: 'reportes',
    icon: BarChart3,
    title: 'Dashboard Analítico',
    description: 'Reportes de inventario, producción y ventas',
    color: 'from-indigo-500 to-indigo-600',
  },
];
```

#### Renderizado

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
  {modules.map((module) => (
    <Card
      key={module.id}
      className="p-6 bg-white rounded-xl shadow-sm hover:shadow-lg transition-all cursor-pointer group"
      onClick={() => onNavigate(module.id)}
    >
      <div className={`h-14 w-14 rounded-lg bg-gradient-to-br ${module.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
        <module.icon className="h-7 w-7 text-white" />
      </div>
      <h3 className="font-semibold text-gray-900 mb-2">{module.title}</h3>
      <p className="text-sm text-gray-600 mb-4">{module.description}</p>
      <Button variant="outline" size="sm" className="w-full group-hover:bg-gray-900 group-hover:text-white transition-colors">
        Ir al módulo
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </Card>
  ))}
</div>
```

---

### ðŸ“ˆ Gráficos con Recharts

#### Datos

```ts
const ventasMesData = [
  { name: 'Ene', ventas: 45000, meta: 50000 },
  { name: 'Feb', ventas: 52000, meta: 50000 },
  { name: 'Mar', ventas: 48000, meta: 50000 },
  { name: 'Abr', ventas: 61000, meta: 55000 },
  { name: 'May', ventas: 55000, meta: 55000 },
  { name: 'Jun', ventas: 67000, meta: 60000 },
];
```

#### Line chart

```tsx
<Card className="p-6 bg-white rounded-xl shadow-sm">
  <div className="flex items-center justify-between mb-6">
    <div>
      <h3 className="font-semibold text-gray-900">Ventas del Mes</h3>
      <p className="text-sm text-gray-600 mt-1">Evolución mensual de ventas</p>
    </div>
    <TrendingUp className="h-5 w-5 text-green-600" />
  </div>
  <ResponsiveContainer width="100%" height={250}>
    <LineChart data={ventasMesData}>
      <CartesianGrid key="grid-ventas" strokeDasharray="3 3" stroke="#f0f0f0" />
      <XAxis key="xaxis-ventas" dataKey="name" stroke="#888" />
      <YAxis key="yaxis-ventas" stroke="#888" />
      <Tooltip key="tooltip-ventas" />
      <Line key="line-ventas" type="monotone" dataKey="ventas" stroke="#0D0D0D" strokeWidth={2} />
      <Line key="line-meta" type="monotone" dataKey="meta" stroke="#FF0000" strokeWidth={2} />
    </LineChart>
  </ResponsiveContainer>
</Card>
```

> Todos los componentes Recharts deben tener `key` único.

---

### ðŸš¨ Alertas del Sistema

```ts
const alertas = [
  { tipo: 'stock', mensaje: 'Tela de algodón blanca - Stock bajo (15 unidades)', prioridad: 'alta' },
  { tipo: 'devolucion', mensaje: '3 devoluciones pendientes de revisión', prioridad: 'media' },
  { tipo: 'produccion', mensaje: 'Taller "Confecciones El Roble" - Retraso en entrega', prioridad: 'alta' },
  { tipo: 'pago', mensaje: '5 pagos pendientes por confirmar', prioridad: 'media' },
];
```

```tsx
<Card className="p-6 bg-white rounded-xl shadow-sm">
  <div className="flex items-center justify-between mb-6">
    <div>
      <h3 className="font-semibold text-gray-900">Alertas del Sistema</h3>
      <p className="text-sm text-gray-600 mt-1">Notificaciones importantes</p>
    </div>
    <AlertTriangle className="h-5 w-5 text-orange-600" />
  </div>
  <div className="space-y-3">
    {alertas.map((alerta, index) => (
      <div key={index} className={`p-4 rounded-lg ${getPrioridadColor(alerta.prioridad)}`}>
        <p className="text-sm font-medium text-gray-900">{alerta.mensaje}</p>
      </div>
    ))}
  </div>
</Card>
```

---

### ðŸ“‹ Tabla de Últimos Pedidos

```ts
const ultimosPedidos = [
  { id: 'PED-001', cliente: 'Juan Pérez', monto: 15000, estado: 'En proceso', fecha: '2024-12-10' },
  { id: 'PED-002', cliente: 'María González', monto: 23000, estado: 'Completado', fecha: '2024-12-10' },
  { id: 'PED-003', cliente: 'Carlos López', monto: 18500, estado: 'Pendiente', fecha: '2024-12-09' },
  { id: 'PED-004', cliente: 'Ana Martínez', monto: 31000, estado: 'En proceso', fecha: '2024-12-09' },
  { id: 'PED-005', cliente: 'Pedro Rodríguez', monto: 12000, estado: 'Completado', fecha: '2024-12-08' },
];
```

```tsx
<Card className="lg:col-span-2 p-6 bg-white rounded-xl shadow-sm">
  <div className="flex items-center justify-between mb-6">
    <div>
      <h3 className="font-semibold text-gray-900">Últimos Pedidos</h3>
      <p className="text-sm text-gray-600 mt-1">Pedidos recientes del sistema</p>
    </div>
    <Button variant="outline" size="sm" onClick={() => onNavigate('gestion-pedidos')}>
      Ver todos
    </Button>
  </div>
  <div className="overflow-x-auto">
    <table className="w-full"> ... </table>
  </div>
</Card>
```

---

### ðŸ‘¥ Empleados Activos

```ts
const empleadosActivos = [
  { nombre: 'Luis García', rol: 'Asesor de Ventas', ventas: 15 },
  { nombre: 'Carmen Silva', rol: 'Asesor de Ventas', ventas: 12 },
  { nombre: 'Roberto Díaz', rol: 'Supervisor', ventas: 8 },
  { nombre: 'Lucía Morales', rol: 'Asesor de Ventas', ventas: 18 },
];
```

```tsx
<Card className="p-6 bg-white rounded-xl shadow-sm">
  <div className="flex items-center justify-between mb-6">
    <div>
      <h3 className="font-semibold text-gray-900">Empleados Activos</h3>
      <p className="text-sm text-gray-600 mt-1">Top asesores del mes</p>
    </div>
  </div>
  <div className="space-y-4">
    {empleadosActivos.map((empleado, index) => (
      <div key={index} className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
        <div className="h-10 w-10 rounded-full bg-gray-900 flex items-center justify-center text-white font-medium">
          {empleado.nombre.charAt(0)}
        </div>
        <div className="flex-1">
          <p className="font-medium text-gray-900 text-sm">{empleado.nombre}</p>
          <p className="text-xs text-gray-600">{empleado.rol}</p>
        </div>
        <div className="text-right">
          <p className="font-semibold text-gray-900">{empleado.ventas}</p>
          <p className="text-xs text-gray-600">ventas</p>
        </div>
      </div>
    ))}
  </div>
</Card>
```

---

### ðŸ“‹ Menú de Configuración â€” `menuConfig.ts`

```ts
export const adminMenuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard General', icon: LayoutDashboard },
  {
    id: 'configuracion',
    label: 'Configuración',
    icon: Settings,
    subItems: [
      { id: 'roles', label: 'Roles' },
      { id: 'permisos', label: 'Permisos' },
    ]
  },
  {
    id: 'usuarios',
    label: 'Usuarios',
    icon: Users,
    subItems: [
      { id: 'gestion-usuarios', label: 'Gestión de usuarios' },
      { id: 'gestion-acceso', label: 'Gestión de acceso' },
      { id: 'seguridad-usuarios', label: 'Seguridad de usuarios' },
    ]
  },
  {
    id: 'inventario',
    label: 'Inventario',
    icon: Package,
    subItems: [
      { id: 'gestion-insumos', label: 'Gestión de insumos' },
      { id: 'productos-terminados', label: 'Gestión de productos terminados' },
      { id: 'proveedores', label: 'Gestión de proveedores' },
      { id: 'alertas-stock', label: 'Alertas de stock' },
    ]
  },
  {
    id: 'produccion',
    label: 'Producción en Talleres Externos',
    icon: Factory,
    subItems: [
      { id: 'registro-talleres', label: 'Registro de talleres' },
      { id: 'asignacion-produccion', label: 'Asignación de producción' },
      { id: 'seguimiento-produccion', label: 'Seguimiento de producción' },
      { id: 'control-prendas', label: 'Control de prendas entregadas y recibidas' },
    ]
  },
  {
    id: 'ventas',
    label: 'Ventas y Pedidos',
    icon: ShoppingCart,
    subItems: [
      { id: 'gestion-clientes', label: 'Gestión de clientes' },
      { id: 'catalogo-digital', label: 'Gestión de Productos' },
      { id: 'gestion-pedidos', label: 'Gestión de pedidos' },
      { id: 'facturacion', label: 'Facturación / ventas' },
      { id: 'pagos-abonos', label: 'Pagos, abonos, financiación' },
      { id: 'contacto-empresa', label: 'Contacto con empresa' },
      { id: 'control-stock-devuelto', label: 'Control de stock devuelto (inspección y destino)' },
    ]
  },
  {
    id: 'historial-pagos',
    label: 'Historial de Pagos',
    icon: CreditCard
  },
  {
    id: 'reportes',
    label: 'Dashboard de Reportes (Analítica)',
    icon: BarChart3,
    subItems: [
      { id: 'reportes-inventario', label: 'Reportes de inventario' },
      { id: 'reportes-produccion', label: 'Reportes de producción' },
      { id: 'reportes-ventas', label: 'Reportes de ventas' },
      { id: 'reportes-usuarios', label: 'Reportes de usuarios' },
    ]
  },
];
```

---

## 2ï¸âƒ£ Dashboard Asesor

### ðŸ” Credenciales
- Email: `asesor@surticamisetas.com`
- Password: `asesor123`

### ðŸ“Š Módulo: Mis Clientes

```ts
const clientes = [
  {
    id: '1',
    nombre: 'Juan Pérez',
    email: 'juan@example.com',
    telefono: '3001234567',
    ciudad: 'Bogotá',
    pedidos: 12,
    ultimaCompra: '2026-05-05',
    estado: 'Activo',
  },
  // ... más clientes
];
```

```tsx
<Card key={cliente.id} className="p-6 hover:shadow-lg transition-shadow">
  <div className="flex items-start justify-between">
    <div className="flex gap-4">
      <div className="h-12 w-12 rounded-full bg-gray-900 text-white flex items-center justify-center text-lg font-semibold">
        {cliente.nombre.charAt(0)}
      </div>
      <div className="space-y-2">
        <div>
          <h3 className="font-semibold text-lg">{cliente.nombre}</h3>
          <Badge className="mt-1">{cliente.estado}</Badge>
        </div>
        <div className="flex gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-1">
            <Mail className="h-4 w-4" />
            {cliente.email}
          </div>
          <div className="flex items-center gap-1">
            <Phone className="h-4 w-4" />
            {cliente.telefono}
          </div>
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            {cliente.ciudad}
          </div>
        </div>
        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-gray-600">Total pedidos:</span>
            <span className="font-semibold ml-1">{cliente.pedidos}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4 text-gray-400" />
            <span className="text-gray-600">Última compra:</span>
            <span className="font-semibold ml-1">{cliente.ultimaCompra}</span>
          </div>
        </div>
      </div>
    </div>
    <div className="flex gap-2">
      <Button variant="outline" size="sm">Ver Detalles</Button>
      <Button variant="outline" size="sm">Contactar</Button>
    </div>
  </div>
</Card>
```

---

### ðŸ’° Módulo: Mis Comisiones

```ts
const comisionesData = [
  { mes: 'Ene', comision: 450000 },
  { mes: 'Feb', comision: 520000 },
  { mes: 'Mar', comision: 480000 },
  { mes: 'Abr', comision: 650000 },
  { mes: 'May', comision: 580000 },
];
```

#### KPI

```tsx
<Card className="p-6">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-gray-600">Comisión de Mayo</p>
      <p className="text-2xl font-bold mt-1">$580,000</p>
    </div>
    <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
      <DollarSign className="h-6 w-6 text-green-600" />
    </div>
  </div>
  <div className="mt-2 flex items-center text-sm">
    <TrendingUp className="h-4 w-4 text-green-600 mr-1" />
    <span className="text-green-600">+12.5%</span>
    <span className="text-gray-500 ml-1">vs mes anterior</span>
  </div>
</Card>
```

#### Gráfico

```tsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={comisionesData}>
    <CartesianGrid key="grid-comisiones" strokeDasharray="3 3" />
    <XAxis key="xaxis-comisiones" dataKey="mes" />
    <YAxis key="yaxis-comisiones" />
    <Tooltip key="tooltip-comisiones" />
    <Line key="line-comision" type="monotone" dataKey="comision" stroke="#000" strokeWidth={2} />
  </LineChart>
</ResponsiveContainer>
```

---

### ðŸ“‹ Menú Asesor

```ts
export const asesorMenuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard General', icon: LayoutDashboard },
  {
    id: 'ventas',
    label: 'Ventas y Pedidos',
    icon: ShoppingCart,
    subItems: [
      { id: 'gestion-clientes', label: 'Gestión de clientes' },
      { id: 'catalogo-digital', label: 'Gestión de Productos' },
      { id: 'gestion-pedidos', label: 'Gestión de pedidos' },
      { id: 'facturacion', label: 'Facturación / ventas' },
      { id: 'pagos-abonos', label: 'Pagos, abonos, financiación' },
      { id: 'contacto-empresa', label: 'Contacto con empresa' },
    ]
  },
  {
    id: 'clientes',
    label: 'Mis Clientes',
    icon: UserCheck,
    subItems: [
      { id: 'lista-clientes', label: 'Lista de clientes' },
      { id: 'nuevo-cliente', label: 'Registrar cliente' },
      { id: 'seguimiento', label: 'Seguimiento' },
    ]
  },
  {
    id: 'pedidos',
    label: 'Mis Pedidos',
    icon: ClipboardList,
    subItems: [
      { id: 'crear-pedido', label: 'Crear pedido' },
      { id: 'pedidos-activos', label: 'Pedidos activos' },
      { id: 'historial-pedidos', label: 'Historial de pedidos' },
    ]
  },
  { id: 'historial-pagos', label: 'Historial de Pagos', icon: CreditCard },
  {
    id: 'comisiones',
    label: 'Mis Comisiones',
    icon: BarChart3,
    subItems: [
      { id: 'comisiones-mes', label: 'Comisiones del mes' },
      { id: 'historico-comisiones', label: 'Histórico de comisiones' },
    ]
  },
  { id: 'calificaciones', label: 'Calificaciones', icon: Star },
  { id: 'mensajes', label: 'Mensajes', icon: MessageSquare },
];
```

---

## 3ï¸âƒ£ Dashboard Domiciliario

### ðŸ” Credenciales
- Email: `domiciliario@surticamisetas.com`
- Password: `domi123`

### ðŸ“¦ Módulo: Mis Entregas

```ts
const entregas = {
  pendientes: [
    {
      id: 'E001',
      cliente: 'Juan Pérez',
      direccion: 'Calle 123 #45-67, Bogotá',
      telefono: '3001234567',
      productos: 3,
      valor: 150000,
      horario: '9:00 AM - 12:00 PM',
      prioridad: 'Alta',
    },
    // ... más entregas
  ],
  enProceso: [...],
  completadas: [...],
};
```

#### KPI

```tsx
<Card className="p-6 bg-orange-50 border-orange-200">
  <div className="flex items-center justify-between">
    <div>
      <p className="text-sm text-orange-700">Pendientes</p>
      <p className="text-3xl font-bold mt-1 text-orange-900">{entregas.pendientes.length}</p>
    </div>
    <div className="h-12 w-12 rounded-full bg-orange-200 flex items-center justify-center">
      <Clock className="h-6 w-6 text-orange-700" />
    </div>
  </div>
</Card>
```

#### Tabs

```tsx
<Tabs defaultValue="pendientes">
  <TabsList className="grid w-full grid-cols-3">
    <TabsTrigger value="pendientes">Pendientes</TabsTrigger>
    <TabsTrigger value="en-proceso">En Proceso</TabsTrigger>
    <TabsTrigger value="completadas">Completadas</TabsTrigger>
  </TabsList>

  <TabsContent value="pendientes" className="space-y-4 mt-6">
    {entregas.pendientes.map((entrega) => (
      <Card key={entrega.id} className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex gap-4">
            <div className="h-12 w-12 rounded-full bg-gray-900 text-white flex items-center justify-center font-semibold">
              {entrega.cliente.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-lg">{entrega.cliente}</h3>
                <Badge variant={entrega.prioridad === 'Alta' ? 'destructive' : 'secondary'}>
                  {entrega.prioridad}
                </Badge>
              </div>
              {/* Más información... */}
            </div>
          </div>
        </div>
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" className="flex-1">
            <Navigation className="h-4 w-4 mr-2" />
            Ver Ruta
          </Button>
          <Button className="flex-1 bg-black hover:bg-gray-800">
            Iniciar Entrega
          </Button>
        </div>
      </Card>
    ))}
  </TabsContent>
</Tabs>
```

---

### ðŸ—ºï¸ Módulo: Rutas Asignadas

```ts
const rutaHoy = {
  fecha: '11 de Mayo, 2026',
  totalParadas: 8,
  completadas: 3,
  distanciaTotal: '24.5 km',
  tiempoEstimado: '4h 30min',
  paradas: [ ... ],
};
```

#### Barra de progreso

```tsx
<Card className="p-6">
  <div className="flex items-center justify-between mb-2">
    <p className="text-sm font-medium">Progreso de la ruta</p>
    <p className="text-sm text-gray-600">{rutaHoy.completadas} de {rutaHoy.totalParadas} completadas</p>
  </div>
  <div className="w-full bg-gray-200 rounded-full h-3">
    <div
      className="bg-green-600 h-3 rounded-full transition-all"
      style={{ width: `${(rutaHoy.completadas / rutaHoy.totalParadas) * 100}%` }}
    ></div>
  </div>
</Card>
```

#### Paradas

```tsx
<Card className={`p-6 ${
  parada.estado === 'completado'
    ? 'bg-green-50 border-green-200'
    : parada.estado === 'en-proceso'
    ? 'bg-blue-50 border-blue-300'
    : ''
}`}>
  <div className="flex items-start justify-between">
    <div className="flex gap-4 flex-1">
      <div className={`h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg ${
        parada.estado === 'completado'
          ? 'bg-green-600 text-white'
          : parada.estado === 'en-proceso'
          ? 'bg-blue-600 text-white'
          : 'bg-gray-200 text-gray-600'
      }`}>
        {parada.orden}
      </div>
      {/* Información de la parada */}
    </div>
  </div>
</Card>
```

---

### ðŸ“‹ Menú Domiciliario

```ts
export const domiciliarioMenuItems: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard General', icon: LayoutDashboard },
  {
    id: 'entregas',
    label: 'Mis Entregas',
    icon: Truck,
    subItems: [
      { id: 'entregas-pendientes', label: 'Entregas pendientes' },
      { id: 'entregas-en-proceso', label: 'En proceso' },
      { id: 'entregas-completadas', label: 'Completadas' },
    ]
  },
  {
    id: 'rutas',
    label: 'Rutas Asignadas',
    icon: ClipboardList,
    subItems: [
      { id: 'ruta-hoy', label: 'Ruta de hoy' },
      { id: 'proximas-rutas', label: 'Próximas rutas' },
      { id: 'historial-rutas', label: 'Historial de rutas' },
    ]
  },
  { id: 'escaner', label: 'Escanear QR', icon: Package },
  {
    id: 'historial',
    label: 'Mi Historial',
    icon: BarChart3,
    subItems: [
      { id: 'entregas-historico', label: 'Entregas realizadas' },
      { id: 'estadisticas', label: 'Mis estadísticas' },
    ]
  },
  { id: 'calificaciones', label: 'Calificaciones', icon: Star },
];
```

---

## 4ï¸âƒ£ Componentes UI â€” Especificaciones Exactas

### ðŸŽ´ Card Component

```tsx
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border",
        className,
      )}
      {...props}
    />
  );
}
```

### ðŸ”˜ Button Component

```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border bg-background text-foreground hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md gap-1.5 px-3",
        lg: "h-10 rounded-md px-6",
        icon: "size-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);
```

### ðŸ·ï¸ Badge Component

```tsx
const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-white",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);
```

---

## âœ… Checklist de Implementación Completa

### Paso 1: Configuración inicial

```bash
npm create vite@latest mi-proyecto -- --template react-ts
cd mi-proyecto
pnpm install
pnpm add tailwindcss@next
pnpm add recharts lucide-react
pnpm add @radix-ui/react-slot@1.1.2 class-variance-authority@0.7.1
pnpm add sonner@2.0.3
```

### Paso 2: Configurar Tailwind CSS v4

```css
/* src/styles/index.css */
@import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&family=Quicksand:wght@300;400;500;600;700&display=swap');

@import 'tailwindcss' source(none);
@source '../../**/*.{js,ts,jsx,tsx}';
@import './default_theme.css';
@import './globals.css';
```

### Paso 3: Crear estructura de carpetas

```
src/app/components/
â”œâ”€â”€ ui/
â”œâ”€â”€ admin/
â”œâ”€â”€ asesor/
â””â”€â”€ domiciliario/
```

### Paso 4: Implementar componentes en orden

- âœ… Componentes UI (card, button, badge, input, etc.)
- âœ… `menuConfig.ts`
- âœ… `AdminDashboard.tsx`
- âœ… `DashboardGeneral.tsx`
- âœ… Módulos específicos de cada rol

### Paso 5: Validación

- âœ… Todos los gráficos Recharts tienen keys únicas
- âœ… `@import` de fuentes está primero en `index.css`
- âœ… Sidebar colapsa correctamente
- âœ… Responsive funciona en móvil/tablet/desktop
- âœ… Los 4 roles tienen sus menús configurados


