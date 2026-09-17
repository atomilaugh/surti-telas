import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      estado: true,
      passwordHash: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      deletedAt: true,
      createdAt: true,
    },
  });

  console.log('=== CURRENT DB STATE ===');
  console.log('Total users:', users.length);
  let activeCount = 0;
  let deletedCount = 0;
  let lockedCount = 0;
  let attemptsGt0 = 0;
  let hasHash = 0;

  for (const u of users) {
    if (u.estado === 'ACTIVO') activeCount++;
    if (u.deletedAt !== null) deletedCount++;
    if (u.lockedUntil !== null) lockedCount++;
    if ((u.failedLoginAttempts ?? 0) > 0) attemptsGt0++;
    if (u.passwordHash && u.passwordHash.length > 0) hasHash++;

    console.log(JSON.stringify({
      email: u.email,
      role: u.role,
      estado: u.estado,
      hasHash: !!(u.passwordHash && u.passwordHash.length > 0),
      hashPrefix: u.passwordHash ? u.passwordHash.substring(0, 7) : null,
      failedAttempts: u.failedLoginAttempts,
      locked: u.lockedUntil !== null,
      deleted: u.deletedAt !== null,
      deletedAt: u.deletedAt,
    }));
  }

  console.log('\n=== SUMMARY ===');
  console.log('Active:', activeCount);
  console.log('Soft-deleted (deletedAt != null):', deletedCount);
  console.log('Locked:', lockedCount);
  console.log('Failed attempts > 0:', attemptsGt0);
  console.log('Has passwordHash:', hasHash);

  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
