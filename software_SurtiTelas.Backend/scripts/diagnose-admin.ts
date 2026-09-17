import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Check admin user's password
  const admin = await prisma.user.findUnique({ where: { email: 'admin@surtitelas.com' } });
  if (!admin) {
    console.log('Admin not found');
    process.exit(1);
  }

  console.log('=== ADMIN USER ===');
  console.log('id:', admin.id);
  console.log('email:', admin.email);
  console.log('role:', admin.role);
  console.log('estado:', admin.estado);
  console.log('passwordHash exists:', !!admin.passwordHash);
  console.log('passwordHash length:', admin.passwordHash.length);
  console.log('passwordHash prefix:', admin.passwordHash.substring(0, 7));
  console.log('failedLoginAttempts:', admin.failedLoginAttempts);
  console.log('lockedUntil:', admin.lockedUntil);
  console.log('createdAt:', admin.createdAt);

  // Test various passwords against admin's hash
  console.log('\n=== ADMIN PASSWORD TESTS ===');
  const passwords = [
    'SurtiTelas2025*',
    'SurtiTelas2025',
    'Surtitelas2025*',
    'surtitelas2025*',
    'Admin123!',
    'password',
    'Password123!',
  ];

  for (const pw of passwords) {
    const valid = await bcrypt.compare(pw, admin.passwordHash);
    console.log(`"${pw}": ${valid ? 'MATCH' : 'no match'}`);
  }

  // Check danielmurilloruiz53@gmail.com user (locked)
  const daniel = await prisma.user.findUnique({ where: { email: 'danielmurilloruiz53@gmail.com' } });
  if (daniel) {
    console.log('\n=== DANIEL USER (LOCKED) ===');
    console.log('id:', daniel.id);
    console.log('email:', daniel.email);
    console.log('role:', daniel.role);
    console.log('estado:', daniel.estado);
    console.log('passwordHash prefix:', daniel.passwordHash.substring(0, 7));
    console.log('failedLoginAttempts:', daniel.failedLoginAttempts);
    console.log('lockedUntil:', daniel.lockedUntil);
    console.log('createdAt:', daniel.createdAt);

    // Test if daniel's password would work (if not locked)
    const testPw = 'SurtiTelas2025*';
    const valid = await bcrypt.compare(testPw, daniel.passwordHash);
    console.log(`"${testPw}" compare result:`, valid);
  }

  // Check all users and test their password hashes with their role passwords
  console.log('\n=== ALL USERS PASSWORD VERIFICATION ===');
  const allUsers = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      estado: true,
      passwordHash: true,
      failedLoginAttempts: true,
      lockedUntil: true,
    },
  });

  const rolePasswords: Record<string, string> = {
    ADMIN: 'SurtiTelas2025*',
    ASESOR: 'SurtiTelas2025*',
    DOMICILIARIO: 'SurtiTelas2025*',
    CLIENTE: 'SurtiTelas2025*',
  };

  for (const u of allUsers) {
    const expectedPw = rolePasswords[u.role] || 'SurtiTelas2025*';
    const valid = await bcrypt.compare(expectedPw, u.passwordHash);
    console.log(`${u.email} (${u.role}): ${valid ? 'MATCH' : 'NO MATCH'} | attempts=${u.failedLoginAttempts} | locked=${u.lockedUntil !== null} | estado=${u.estado}`);
  }

  process.exit(0);
}

main().catch(async (e) => {
  console.error('ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
