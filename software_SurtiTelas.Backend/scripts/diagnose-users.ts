import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      nombre: true,
      role: true,
      estado: true,
      passwordHash: true,
      failedLoginAttempts: true,
      lockedUntil: true,
      twoFactorEnabled: true,
      deletedAt: true,
      createdAt: true,
    },
  });

  console.log('=== ALL USERS ===');
  console.log('Total:', users.length);
  let activeCount = 0;
  let lockedCount = 0;
  let attemptsCount = 0;
  let hashCount = 0;
  for (const u of users) {
    if (u.estado === 'ACTIVO') activeCount++;
    if (u.lockedUntil !== null) lockedCount++;
    if ((u.failedLoginAttempts ?? 0) > 0) attemptsCount++;
    if (u.passwordHash && u.passwordHash.length > 0) hashCount++;
    console.log(JSON.stringify({
      id: u.id,
      email: u.email,
      role: u.role,
      estado: u.estado,
      failedLoginAttempts: u.failedLoginAttempts,
      lockedUntil: u.lockedUntil,
      hasHash: !!(u.passwordHash && u.passwordHash.length > 0),
      hashPrefix: u.passwordHash ? u.passwordHash.substring(0, 7) : null,
      twoFactor: u.twoFactorEnabled,
      deletedAt: u.deletedAt,
      createdAt: u.createdAt,
    }));
  }
  console.log('=== SUMMARY ===');
  console.log('Active:', activeCount);
  console.log('Locked (lockedUntil != null):', lockedCount);
  console.log('With failed attempts > 0:', attemptsCount);
  console.log('With passwordHash:', hashCount);

  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
