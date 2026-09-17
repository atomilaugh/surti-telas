import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient({ log: ['query'] });

  console.log('=== TEST: Via PrismaCustomerRepository ===');
  const { PrismaCustomerRepository } = await import('../src/modules/customers/infrastructure/repositories/PrismaCustomerRepository.ts');
  const repo = new PrismaCustomerRepository(prisma);
  const created = await repo.create({
    nombre: 'TestRepo',
    email: 'testrepo2@example.com',
    tel: '5559999999',
    direccion: 'Repo Dir',
    nit: '87654321',
    estado: 'Activo',
  });
  console.log('Created via Repo:', JSON.stringify({ id: created.id, telefono: created.telefono, direccion: created.direccion, nit: created.nit }));

  console.log('\n=== CLEANUP ===');
  await prisma.customer.deleteMany({ where: { email: 'testrepo2@example.com' } });
  console.log('Cleaned up');
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
