import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'cliente.prueba.nuevo@ejemplo.com';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('User already exists, deleting...');
    await prisma.customer.deleteMany({ where: { email } });
    await prisma.user.delete({ where: { id: existing.id } });
  }

  console.log('=== CREATING USER VIA PRISMO (simulating register flow) ===');
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      nombre: 'Carlos',
      apellidos: 'Prueba Cliente',
      passwordHash: 'hashed',
      role: 'CLIENTE',
      telefono: '3001234567',
      direccion: 'Carrera 50 # 20-30',
      tipoDocumento: 'CC',
      numeroDocumento: '999999991',
    },
  });
  console.log('USER:', JSON.stringify({ id: user.id, nombre: user.nombre, apellidos: user.apellidos, email: user.email, telefono: user.telefono, direccion: user.direccion, tipoDocumento: user.tipoDocumento, numeroDocumento: user.numeroDocumento, role: user.role }, null, 2));

  const customer = await prisma.customer.create({
    data: {
      nombre: 'Carlos',
      apellidos: 'Prueba Cliente',
      email: email.toLowerCase(),
      ciudad: 'Medellin',
      telefono: '3001234567',
      nit: '999999991',
      direccion: 'Carrera 50 # 20-30',
      estado: 'ACTIVO',
    },
  });
  console.log('CUSTOMER:', JSON.stringify({ id: customer.id, nombre: customer.nombre, apellidos: customer.apellidos, email: customer.email, ciudad: customer.ciudad, telefono: customer.telefono, nit: customer.nit, direccion: customer.direccion, estado: customer.estado, cupoTotal: customer.cupoTotal, cupoUsado: customer.cupoUsado, isTrustedCustomer: customer.isTrustedCustomer }, null, 2));

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
