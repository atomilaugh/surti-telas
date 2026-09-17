import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = 'http://localhost:3000/api/v1';

async function main() {
  // Test cliente@surtitelas.com (the one that matches in bcrypt check)
  const cliente = await prisma.user.findUnique({ where: { email: 'cliente@surtitelas.com' } });
  if (!cliente) {
    console.log('cliente@surtitelas.com NOT FOUND');
    process.exit(1);
  }

  console.log('=== CLIENTE USER ===');
  console.log('email:', cliente.email);
  console.log('role:', cliente.role);
  console.log('estado:', cliente.estado);
  console.log('failedLoginAttempts:', cliente.failedLoginAttempts);
  console.log('lockedUntil:', cliente.lockedUntil);

  // Verify password
  const valid = await bcrypt.compare('SurtiTelas2025*', cliente.passwordHash);
  console.log('bcrypt.compare with SurtiTelas2025*:', valid);

  // Test via HTTP
  console.log('\n=== HTTP LOGIN: cliente@surtitelas.com ===');
  try {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'cliente@surtitelas.com', password: 'SurtiTelas2025*' }),
    });
    const body = await res.json().catch(() => null);
    console.log('HTTP status:', res.status);
    console.log('Response:', JSON.stringify(body));
  } catch (e) {
    console.log('ERROR:', (e as Error).message);
  }

  // Now test admin via fix-password.js approach
  console.log('\n=== FIX-ADMIN PASSWORD ===');
  const admin = await prisma.user.findUnique({ where: { email: 'admin@surtitelas.com' } });
  if (admin) {
    const newHash = await bcrypt.hash('SurtiTelas2025*', 12);
    console.log('Current admin hash prefix:', admin.passwordHash.substring(0, 7));
    console.log('New hash prefix:', newHash.substring(0, 7));
    console.log('Would new hash match SurtiTelas2025*?', await bcrypt.compare('SurtiTelas2025*', newHash));

    // But per instructions, DON'T actually change it
    console.log('NOT APPLYING CHANGE - diagnosis only');
  }

  process.exit(0);
}

main().catch(async (e) => {
  console.error('ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
