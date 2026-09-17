import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst({
    where: { email: 'tomasllrrr12@gmail.com' },
    select: { id: true, email: true, nombre: true, apellidos: true, telefono: true, direccion: true, tipoDocumento: true, numeroDocumento: true, role: true, estado: true },
  });
  console.log('=== USER ===');
  console.log(JSON.stringify(user, null, 2));

  const customer = await prisma.customer.findFirst({
    where: { email: 'tomasllrrr12@gmail.com' },
    select: { id: true, nombre: true, apellidos: true, email: true, ciudad: true, telefono: true, direccion: true, nit: true, estado: true },
  });
  console.log('=== CUSTOMER ===');
  console.log(JSON.stringify(customer, null, 2));

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
