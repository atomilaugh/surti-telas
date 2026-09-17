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
      deletedAt: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  console.log('=== FULL USER TABLE ===');
  for (const u of users) {
    const hashPrefix = u.passwordHash ? u.passwordHash.substring(0, 7) : 'N/A';
    // Determine rounds from prefix
    let rounds = 'unknown';
    if (u.passwordHash) {
      const match = u.passwordHash.match(/\$2[aby]\$(\d+)/);
      rounds = match ? match[1] : 'unknown';
    }
    console.log(JSON.stringify({
      email: u.email,
      nombre: u.nombre,
      role: u.role,
      estado: u.estado,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      deletedAt: u.deletedAt,
      hashExists: !!u.passwordHash && u.passwordHash.length > 0,
      hashPrefix,
      rounds,
      failedLoginAttempts: u.failedLoginAttempts,
      lockedUntil: u.lockedUntil,
    }));
  }

  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
