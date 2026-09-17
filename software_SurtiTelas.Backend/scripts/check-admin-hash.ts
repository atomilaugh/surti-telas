import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check admin_test user
  const adminTest = await prisma.user.findUnique({ where: { email: 'admin_test@surtitelas.com' } });
  console.log('=== admin_test@surtitelas.com ===');
  console.log('Exists:', !!adminTest);
  if (adminTest) {
    console.log('id:', adminTest.id);
    console.log('email:', adminTest.email);
    console.log('role:', adminTest.role);
    console.log('estado:', adminTest.estado);
    console.log('passwordHash prefix:', adminTest.passwordHash.substring(0, 7));
    console.log('passwordHash length:', adminTest.passwordHash.length);
    console.log('createdAt:', adminTest.createdAt);
    console.log('updatedAt:', adminTest.updatedAt);
  }

  // Get exact admin hash
  const admin = await prisma.user.findUnique({ where: { email: 'admin@surtitelas.com' } });
  console.log('\n=== admin@surtitelas.com ===');
  console.log('passwordHash FULL:', admin?.passwordHash);
  console.log('passwordHash length:', admin?.passwordHash?.length);
  console.log('createdAt:', admin?.createdAt);
  console.log('updatedAt:', admin?.updatedAt);

  // Check all users with $2a$10$ prefix
  const users10 = await prisma.user.findMany({
    where: { passwordHash: { startsWith: '$2a$10$' } },
    select: { email: true, role: true, createdAt: true, updatedAt: true },
  });
  console.log('\n=== Users with $2a$10$ prefix ===');
  for (const u of users10) {
    console.log(JSON.stringify(u));
  }

  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
