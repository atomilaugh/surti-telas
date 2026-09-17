import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();
async function main() {
  await p.user.deleteMany({ where: { email: 'cliente.prueba.nuevo@ejemplo.com' } });
  await p.customer.deleteMany({ where: { email: 'cliente.prueba.nuevo@ejemplo.com' } });
  console.log('cleaned');
  await p.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
