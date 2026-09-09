import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const PERMISSIONS: { code: string; description: string; module: string }[] = [
  { code: 'catalog:read', description: 'Ver catálogo', module: 'catalog' },
  { code: 'catalog:create', description: 'Crear productos', module: 'catalog' },
  { code: 'catalog:update', description: 'Editar productos', module: 'catalog' },
  { code: 'catalog:delete', description: 'Eliminar productos', module: 'catalog' },
  { code: 'catalog:publish', description: 'Publicar/despublicar', module: 'catalog' },
  { code: 'customers:read', description: 'Ver clientes', module: 'customers' },
  { code: 'customers:create', description: 'Crear clientes', module: 'customers' },
  { code: 'customers:update', description: 'Editar clientes', module: 'customers' },
  { code: 'customers:delete', description: 'Eliminar clientes', module: 'customers' },
  { code: 'orders:read', description: 'Ver pedidos', module: 'orders' },
  { code: 'orders:create', description: 'Crear pedidos', module: 'orders' },
  { code: 'orders:update', description: 'Cambiar estado de pedidos', module: 'orders' },
  { code: 'orders:delete', description: 'Eliminar pedidos', module: 'orders' },
  { code: 'stock:read', description: 'Ver inventario', module: 'stock' },
  { code: 'stock:create', description: 'Crear insumos/proveedores', module: 'stock' },
  { code: 'stock:update', description: 'Editar insumos/proveedores', module: 'stock' },
  { code: 'stock:delete', description: 'Eliminar insumos/proveedores', module: 'stock' },
  { code: 'stock:move', description: 'Registrar movimientos', module: 'stock' },
  { code: 'stock:manage', description: 'Gestionar alertas de stock', module: 'stock' },
  { code: 'production:read', description: 'Ver producción', module: 'production' },
  { code: 'production:create', description: 'Crear órdenes de producción', module: 'production' },
  { code: 'production:update', description: 'Actualizar avance', module: 'production' },
  { code: 'production:delete', description: 'Eliminar órdenes de producción', module: 'production' },
  { code: 'auth:manage', description: 'Gestionar usuarios y roles', module: 'auth' },
  { code: 'payments:read', description: 'Ver pagos', module: 'payments' },
  { code: 'payments:create', description: 'Registrar pagos', module: 'payments' },
  { code: 'payments:update', description: 'Actualizar estado de pagos', module: 'payments' },
  { code: 'payments:delete', description: 'Eliminar pagos', module: 'payments' },
  { code: 'receipts:read', description: 'Ver recibos', module: 'receipts' },
  { code: 'receipts:create', description: 'Emitir recibos', module: 'receipts' },
  { code: 'receipts:update', description: 'Editar recibos', module: 'receipts' },
  { code: 'receipts:delete', description: 'Eliminar recibos', module: 'receipts' },
  { code: 'commissions:read', description: 'Ver comisiones', module: 'commissions' },
  { code: 'commissions:create', description: 'Registrar comisiones', module: 'commissions' },
  { code: 'company:update', description: 'Editar configuración de empresa', module: 'company' },
  { code: 'cms:read', description: 'Ver páginas institucionales', module: 'cms' },
  { code: 'cms:update', description: 'Editar páginas institucionales', module: 'cms' },
  { code: 'contact:read', description: 'Ver mensajes de contacto', module: 'contact' },
  { code: 'contact:update', description: 'Gestionar mensajes de contacto', module: 'contact' },
  { code: 'returns:read', description: 'Ver devoluciones', module: 'returns' },
  { code: 'returns:create', description: 'Registrar devoluciones', module: 'returns' },
  { code: 'returns:update', description: 'Gestionar devoluciones', module: 'returns' },
  { code: 'deliveries:read', description: 'Ver entregas/domicilios', module: 'deliveries' },
  { code: 'deliveries:create', description: 'Crear entregas/domicilios', module: 'deliveries' },
  { code: 'deliveries:update', description: 'Gestionar entregas/domicilios', module: 'deliveries' },
  { code: 'notifications:read', description: 'Ver notificaciones', module: 'notifications' },
  { code: 'notifications:update', description: 'Gestionar notificaciones', module: 'notifications' },
  { code: 'alerts:read', description: 'Ver alertas', module: 'alerts' },
  { code: 'alerts:create', description: 'Crear alertas', module: 'alerts' },
  { code: 'alerts:update', description: 'Actualizar alertas', module: 'alerts' },
  { code: 'employees:read', description: 'Ver empleados', module: 'employees' },
  { code: 'employees:create', description: 'Crear empleados', module: 'employees' },
  { code: 'employees:update', description: 'Editar empleados', module: 'employees' },
  { code: 'employees:delete', description: 'Eliminar empleados', module: 'employees' },
  { code: 'domiciliarios:read', description: 'Ver domiciliarios', module: 'domiciliarios' },
  { code: 'domiciliarios:create', description: 'Crear domiciliarios', module: 'domiciliarios' },
  { code: 'domiciliarios:update', description: 'Editar domiciliarios', module: 'domiciliarios' },
  { code: 'purchases:read', description: 'Ver compras', module: 'purchases' },
  { code: 'purchases:create', description: 'Crear compras', module: 'purchases' },
  { code: 'purchases:update', description: 'Editar compras', module: 'purchases' },
  { code: 'purchases:delete', description: 'Eliminar compras', module: 'purchases' },
  { code: 'sales:read', description: 'Ver ventas', module: 'sales' },
  { code: 'sales:create', description: 'Crear ventas', module: 'sales' },
  { code: 'sales:update', description: 'Editar ventas', module: 'sales' },
  { code: 'customOrders:read', description: 'Ver pedidos personalizados', module: 'customOrders' },
  { code: 'customOrders:update', description: 'Actualizar pedidos personalizados', module: 'customOrders' },
  { code: 'customOrders:delete', description: 'Eliminar pedidos personalizados', module: 'customOrders' },
  { code: 'reports:read', description: 'Ver reportes y analíticas', module: 'reports' },
  { code: 'users:read', description: 'Ver usuarios', module: 'users' },
  { code: 'users:create', description: 'Crear usuarios', module: 'users' },
  { code: 'users:update', description: 'Editar usuarios', module: 'users' },
  { code: 'users:delete', description: 'Eliminar usuarios', module: 'users' },
  { code: 'permissions:read', description: 'Ver permisos', module: 'permissions' },
  { code: 'permissions:create', description: 'Crear permisos', module: 'permissions' },
  { code: 'permissions:update', description: 'Editar permisos', module: 'permissions' },
  { code: 'permissions:delete', description: 'Eliminar permisos', module: 'permissions' },
  { code: 'audit:read', description: 'Ver auditoría', module: 'audit' },
  { code: 'webhooks:read', description: 'Ver webhooks', module: 'webhooks' },
  { code: 'webhooks:update', description: 'Gestionar webhooks', module: 'webhooks' },
  { code: 'chat:read', description: 'Ver chat', module: 'chat' },
  { code: 'analytics:read', description: 'Ver analíticas', module: 'analytics' },
  { code: 'export:read', description: 'Exportar datos', module: 'export' },
  { code: 'favorites:read', description: 'Ver favoritos', module: 'favorites' },
  { code: 'admin:dashboard:read', description: 'Ver dashboard admin', module: 'admin' },
  { code: 'admin:dashboard:analitico:read', description: 'Ver dashboard analítico', module: 'admin' },
  { code: 'asesor:dashboard:read', description: 'Ver dashboard asesor', module: 'asesor' },
  { code: 'asesor:clientes:read', description: 'Ver clientes del asesor', module: 'asesor' },
  { code: 'asesor:clientes:create', description: 'Crear clientes del asesor', module: 'asesor' },
  { code: 'asesor:clientes:update', description: 'Editar clientes del asesor', module: 'asesor' },
  { code: 'asesor:pedidos:read', description: 'Ver pedidos del asesor', module: 'asesor' },
  { code: 'asesor:pedidos:create', description: 'Crear pedidos del asesor', module: 'asesor' },
  { code: 'asesor:pedidos:update', description: 'Editar pedidos del asesor', module: 'asesor' },
  { code: 'asesor:catalogo:read', description: 'Ver catálogo del asesor', module: 'asesor' },
  { code: 'asesor:comisiones:read', description: 'Ver comisiones del asesor', module: 'asesor' },
  { code: 'asesor:perfil:read', description: 'Ver perfil del asesor', module: 'asesor' },
  { code: 'asesor:perfil:update', description: 'Editar perfil del asesor', module: 'asesor' },
  { code: 'domiciliario:dashboard:read', description: 'Ver dashboard domiciliario', module: 'domiciliario' },
  { code: 'domiciliario:entregas:read', description: 'Ver entregas del domiciliario', module: 'domiciliario' },
  { code: 'domiciliario:entregas:update', description: 'Gestionar entregas del domiciliario', module: 'domiciliario' },
  { code: 'domiciliario:ruta:read', description: 'Ver ruta del día', module: 'domiciliario' },
  { code: 'domiciliario:historial:read', description: 'Ver historial de entregas', module: 'domiciliario' },
  { code: 'domiciliario:perfil:read', description: 'Ver perfil del domiciliario', module: 'domiciliario' },
  { code: 'domiciliario:perfil:update', description: 'Editar perfil del domiciliario', module: 'domiciliario' },
  { code: 'cliente:inicio:read', description: 'Ver inicio del cliente', module: 'cliente' },
  { code: 'cliente:pedidos:read', description: 'Ver pedidos del cliente', module: 'cliente' },
  { code: 'cliente:pedidos:create', description: 'Crear pedidos del cliente', module: 'cliente' },
  { code: 'cliente:pedidos:personalizados:read', description: 'Ver pedidos personalizados del cliente', module: 'cliente' },
  { code: 'cliente:pedidos:personalizados:create', description: 'Crear pedidos personalizados del cliente', module: 'cliente' },
  { code: 'cliente:recibos:read', description: 'Ver recibos del cliente', module: 'cliente' },
  { code: 'cliente:favoritos:read', description: 'Ver favoritos del cliente', module: 'cliente' },
  { code: 'cliente:favoritos:update', description: 'Gestionar favoritos del cliente', module: 'cliente' },
  { code: 'cliente:seguimiento:read', description: 'Ver seguimiento de pedidos', module: 'cliente' },
  { code: 'cliente:perfil:read', description: 'Ver perfil del cliente', module: 'cliente' },
  { code: 'cliente:perfil:update', description: 'Editar perfil del cliente', module: 'cliente' },
  { code: 'cliente:devoluciones:read', description: 'Ver devoluciones del cliente', module: 'cliente' },
  { code: 'cliente:devoluciones:create', description: 'Reportar devoluciones del cliente', module: 'cliente' },
];

const ALL_PERMISSION_CODES = PERMISSIONS.map((p) => p.code);

const ROLE_PERMISSIONS: Record<string, string[]> = {
  ADMIN: ALL_PERMISSION_CODES,
  ASESOR: [
    'catalog:read', 'catalog:create', 'catalog:update', 'catalog:publish',
    'customers:read', 'customers:create', 'customers:update',
    'orders:read', 'orders:create', 'orders:update',
    'stock:read', 'production:read',
    'payments:read', 'payments:create',
    'receipts:read',
    'commissions:read', 'commissions:create',
    'contact:read', 'contact:update',
    'returns:read', 'returns:create', 'returns:update',
    'deliveries:read', 'deliveries:create', 'deliveries:update',
    'notifications:read',
    'customOrders:read', 'customOrders:update',
    'asesor:dashboard:read',
    'asesor:clientes:read', 'asesor:clientes:create', 'asesor:clientes:update',
    'asesor:pedidos:read', 'asesor:pedidos:create', 'asesor:pedidos:update',
    'asesor:catalogo:read',
    'asesor:comisiones:read',
    'asesor:perfil:read', 'asesor:perfil:update',
  ],
  DOMICILIARIO: [
    'orders:read', 'orders:update',
    'deliveries:read', 'deliveries:update',
    'notifications:read',
    'customers:read',
    'domiciliario:dashboard:read',
    'domiciliario:entregas:read', 'domiciliario:entregas:update',
    'domiciliario:ruta:read',
    'domiciliario:historial:read',
    'domiciliario:perfil:read', 'domiciliario:perfil:update',
  ],
  CLIENTE: [
    'catalog:read', 'orders:read', 'orders:create', 'customers:read', 'notifications:read',
    'cliente:inicio:read',
    'cliente:pedidos:read', 'cliente:pedidos:create',
    'cliente:pedidos:personalizados:read', 'cliente:pedidos:personalizados:create',
    'cliente:recibos:read',
    'cliente:favoritos:read', 'cliente:favoritos:update',
    'cliente:seguimiento:read',
    'cliente:perfil:read', 'cliente:perfil:update',
    'cliente:devoluciones:read', 'cliente:devoluciones:create',
  ],
  ALMACEN: [
    'stock:read', 'stock:create', 'stock:update', 'stock:delete', 'stock:move', 'stock:manage',
    'purchases:read', 'purchases:create', 'purchases:update', 'purchases:delete',
    'returns:read', 'returns:create', 'returns:update',
    'catalog:read',
    'customers:read',
    'orders:read',
    'deliveries:read', 'deliveries:create', 'deliveries:update',
    'notifications:read',
  ],
  PRODUCCION: [
    'production:read', 'production:create', 'production:update', 'production:delete',
    'stock:read',
    'catalog:read',
    'orders:read', 'orders:update',
    'customers:read',
    'notifications:read',
    'returns:read',
  ],
  REPORTES: [
    'reports:read',
    'orders:read',
    'stock:read',
    'production:read',
    'notifications:read',
    'commissions:read',
    'customers:read',
    'payments:read',
    'receipts:read',
    'purchases:read',
    'sales:read',
  ],
};

function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%';
  let password = '';
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  for (let i = 0; i < array.length; i++) {
    password += chars[array[i] % chars.length];
  }
  return password;
}

async function main() {
  console.log('🌱 Sembrando base de datos SurtiTelas…');

  const adminPassword = process.env.ADMIN_PASSWORD || generatePassword();
  const domiciliarioPassword = process.env.DOMICILIARIO_PASSWORD || generatePassword();
  const clientePassword = process.env.CLIENTE_PASSWORD || generatePassword();

  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: p.code },
      update: { description: p.description, module: p.module },
      create: p,
    });
  }

  for (const role of Object.keys(ROLE_PERMISSIONS)) {
    const codes = ROLE_PERMISSIONS[role];
    for (const code of codes) {
      const permission = await prisma.permission.findUnique({ where: { code } });
      if (permission) {
        await prisma.rolePermission.upsert({
          where: { role_permissionId: { role, permissionId: permission.id } },
          update: {},
          create: { role, permissionId: permission.id },
        });
      }
    }
  }

  const defaultDescriptions: Record<string, string> = {
    ADMIN: 'Administrador del sistema',
    ASESOR: 'Asesor de ventas',
    DOMICILIARIO: 'Domiciliario',
    CLIENTE: 'Cliente',
    ALMACEN: 'Almacén',
    PRODUCCION: 'Producción',
    REPORTES: 'Reportes',
  };

  for (const role of Object.keys(defaultDescriptions)) {
    await prisma.roleConfig.upsert({
      where: { role },
      update: {},
      create: { role, estado: 'ACTIVO', descripcion: defaultDescriptions[role] ?? role },
    });
  }

  console.log('✓ Roles y permisos creados');

  const adminEmail = 'admin@surtitelas.com';
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.user.create({
      data: {
        email: adminEmail,
        nombre: 'Administrador SurtiTelas',
        passwordHash,
        role: 'ADMIN',
      },
    });
    console.log(`✓ Usuario admin creado (${adminEmail} / ${adminPassword})`);
  }

  const categories = [
    { nombre: 'Camisetas', slug: 'camisetas' },
    { nombre: 'Blusas', slug: 'blusas' },
    { nombre: 'Vestidos', slug: 'vestidos' },
    { nombre: 'Pantalones', slug: 'pantalones' },
    { nombre: 'Faldas', slug: 'faldas' },
    { nombre: 'Chaquetas', slug: 'chaquetas' },
    { nombre: 'Accesorios', slug: 'accesorios' },
  ];
  for (const c of categories) {
    await prisma.category.upsert({
      where: { slug: c.slug },
      update: { nombre: c.nombre },
      create: c,
    });
  }
  console.log('✓ Categorías creadas');

  const camisetas = await prisma.category.findUnique({ where: { slug: 'camisetas' } });
  if (camisetas) {
    await prisma.product.upsert({
      where: { ref: 'REF-001' },
      update: {
        nombre: 'Camiseta básica de algodón',
        descripcion: 'Camiseta de algodón 100%',
        categoriaId: camisetas.id,
        precio: 25000,
        cantidadStock: 120,
        stockStatus: 'OK',
        estado: 'ACTIVO',
        tela: 'Algodón',
        colores: ['Blanco', 'Negro'],
        tallas: ['S', 'M', 'L', 'XL'],
        publicado: true,
        destacado: true,
        nuevo: true,
      },
      create: {
        ref: 'REF-001',
        codigo: 'PROD-001',
        nombre: 'Camiseta básica de algodón',
        descripcion: 'Camiseta de algodón 100%',
        categoriaId: camisetas.id,
        precio: 25000,
        cantidadStock: 120,
        stockStatus: 'OK',
        estado: 'ACTIVO',
        tela: 'Algodón',
        colores: ['Blanco', 'Negro'],
        tallas: ['S', 'M', 'L', 'XL'],
        imagenes: [],
        publicado: true,
        destacado: true,
        nuevo: true,
      },
    });
  }
  console.log('✓ Producto de ejemplo asegurado (REF-001)');

  const adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (adminUser) {
    const existingCustomer = await prisma.customer.findFirst({ where: { nit: '900123456-7' } });
    if (existingCustomer) {
      await prisma.customer.update({
        where: { id: existingCustomer.id },
        data: {
          nombre: 'Juan Pérez',
          ciudad: 'Bogotá',
          telefono: '3001234567',
          asesorId: adminUser.id,
          cupoTotal: 1000000,
          cupoUsado: 0,
          deudaVencida: 0,
          isTrustedCustomer: true,
          estado: 'ACTIVO',
        },
      });
    } else {
      await prisma.customer.create({
        data: {
          nombre: 'Juan Pérez',
          ciudad: 'Bogotá',
          telefono: '3001234567',
          nit: '900123456-7',
          asesorId: adminUser.id,
          cupoTotal: 1000000,
          cupoUsado: 0,
          deudaVencida: 0,
          isTrustedCustomer: true,
          estado: 'ACTIVO',
        },
      });
    }
    console.log('✓ Cliente demo asegurado (Juan Pérez)');

  const clienteEmail = 'cliente@surtitelas.com';
  const existingCliente = await prisma.user.findUnique({ where: { email: clienteEmail } });
  if (!existingCliente) {
    const passwordHash = await bcrypt.hash(clientePassword, 12);
    await prisma.user.create({
      data: {
        email: clienteEmail,
        nombre: 'Andres Daniel Ruiz Murillo',
        passwordHash,
        role: 'CLIENTE',
      },
    });
    console.log(`✓ Usuario cliente creado (${clienteEmail} / ${clientePassword})`);
  }
  }

  const demoProduct = await prisma.product.findUnique({ where: { ref: 'REF-001' } });
  const demoCustomer = await prisma.customer.findFirst({ where: { nit: '900123456-7' } });
  const demoAsesor = await prisma.user.findFirst({ where: { role: 'ASESOR' } });

  if (demoProduct && demoCustomer && demoAsesor) {
    const orderNumber = 'PED-000001';
    const existingOrder = await prisma.order.findFirst({ where: { numero: orderNumber } });
    if (!existingOrder) {
      const _order = await prisma.order.create({
        data: {
          numero: orderNumber,
          clienteId: demoCustomer.id,
          clienteNombre: demoCustomer.nombre,
          asesorId: demoAsesor.id,
          asesorNombre: demoAsesor.nombre,
          total: 50000,
          itemsCount: 2,
          estado: 'EN_PRODUCCION',
          prioridad: 'PRIORITARIO',
          observaciones: 'Pedido demo para validar contratos',
          items: {
            create: [
              { productId: demoProduct.id, nombre: demoProduct.nombre, precio: 25000, cantidad: 2 },
            ],
          },
        },
      });
      console.log('✓ Order demo asegurada (PED-000001)');
    }
  }

  const demoOrder = await prisma.order.findFirst({ where: { numero: 'PED-000001' } });

  if (demoOrder && demoAsesor) {
    const domiciliarioEmail = 'domiciliario@surtitelas.com';
    let domiciliario = await prisma.user.findUnique({ where: { email: domiciliarioEmail } });
    if (!domiciliario) {
      domiciliario = await prisma.user.create({
        data: {
          email: domiciliarioEmail,
          nombre: 'Domiciliario Demo',
          passwordHash: await bcrypt.hash(domiciliarioPassword, 12),
          role: 'DOMICILIARIO',
        },
      });
      console.log(`✓ Domiciliario demo asegurado (${domiciliarioEmail} / ${domiciliarioPassword})`);
    }

    // Tablas deliveries/returns no existen en la BD actual; se habilitan cuando se agreguen las migraciones correspondientes.
    console.log('✓ Seed demo entregas/devoluciones omitidas (tablas no migradas)');

    const users = await prisma.user.findMany({ where: { deletedAt: null } });
    const auditActions = [
      { accion: 'Login exitoso', modulo: 'auth', usuarioId: users[0]?.id },
      { accion: 'Intento fallido de login', modulo: 'auth', usuarioId: users[1]?.id },
      { accion: 'Actualización de perfil', modulo: 'usuarios', usuarioId: users[0]?.id },
      { accion: 'Cambio de estado de pedido', modulo: 'pedidos', usuarioId: users[0]?.id },
      { accion: 'Exportación de reporte', modulo: 'reportes', usuarioId: users[0]?.id },
    ];
    for (const audit of auditActions) {
      await prisma.auditLog.create({
        data: {
          accion: audit.accion,
          modulo: audit.modulo,
          usuarioId: audit.usuarioId,
          ip: '127.0.0.1',
          userAgent: 'seed',
        },
      });
    }
    console.log('✓ Registros de auditoría creados');
  }

  console.log('🎉 Seed completado');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
