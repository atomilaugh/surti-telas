import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();

async function main() {
  const email = 'cliente.prueba.nuevo@ejemplo.com';
  const user = await p.user.findUnique({ where: { email }, select: { id: true, nombre: true, apellidos: true, email: true, telefono: true, direccion: true, tipoDocumento: true, numeroDocumento: true, role: true } });
  const customer = await p.customer.findFirst({ where: { email }, select: { id: true, nombre: true, apellidos: true, email: true, ciudad: true, telefono: true, direccion: true, nit: true, estado: true, cupoTotal: true, cupoUsado: true, isTrustedCustomer: true } });
  console.log('USER:', JSON.stringify(user, null, 2));
  console.log('CUSTOMER:', JSON.stringify(customer, null, 2));
  await p.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
