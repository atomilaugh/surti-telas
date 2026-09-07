import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findFirst({
    where: { id: 'cmtqqf2gk0003igyovbubkouz', deletedAt: null },
    select: { id: true, numero: true, estado: true, tipoFlujo: true, clienteNombre: true, asesorNombre: true },
  });
  console.log(JSON.stringify(order, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
