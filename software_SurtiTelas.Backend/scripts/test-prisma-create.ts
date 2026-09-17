import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({ log: ['query'] });

async function main() {
  const testId = 'diag-test-' + Date.now();

  console.log('=== TEST 1: Direct Prisma create with telefono ===');
  const created = await prisma.customer.create({
    data: {
      nombre: 'TestDirect',
      email: 'testdirect@example.com',
      telefono: '5551234567',
      direccion: 'Test Dir',
      nit: '12345678',
      ciudad: 'TestCity',
      estado: 'ACTIVO',
    },
  });
  console.log('Created Customer:', JSON.stringify({ id: created.id, telefono: created.telefono, direccion: created.direccion, nit: created.nit, ciudad: created.ciudad }));

  console.log('\n=== TEST 2: Create via PrismaCustomerRepository ===');
  const { PrismaCustomerRepository } = await import('./src/modules/customers/infrastructure/repositories/PrismaCustomerRepository');
  const repo = new PrismaCustomerRepository(prisma);
  const created2 = await repo.create({
    nombre: 'TestRepo',
    email: 'testrepo@example.com',
    tel: '5559999999',
    direccion: 'Repo Dir',
    nit: '87654321',
    estado: 'Activo',
  });
  console.log('Created via Repo:', JSON.stringify({ id: created2.id, telefono: created2.telefono, direccion: created2.direccion, nit: created2.nit }));

  console.log('\n=== CLEANUP ===');
  await prisma.customer.deleteMany({ where: { email: { in: ['testdirect@example.com', 'testrepo@example.com'] } } });
  console.log('Cleaned up test customers');

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
