import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin_test@surtitelas.com';
  const passwordHash = '$2a$10$JMPFVfMw.YHzPtAdRHQ2kuQfFP1vG.aHXC.e/OOF8pMysTS.a8J4q';

  const user = await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });

  console.log('Password updated for:', user.email);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
