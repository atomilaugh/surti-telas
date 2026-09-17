import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = 'http://localhost:3000/api/v1';

async function main() {
  // HTTP tests with detailed info
  console.log('=== HTTP LOGIN: cliente@surtitelas.com ===');
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'cliente@surtitelas.com', password: 'SurtiTelas2025*' }),
  });
  const body = await res.json().catch(() => null);
  console.log('HTTP status:', res.status);
  console.log('Response:', JSON.stringify(body));

  console.log('\n=== HTTP LOGIN: login-test-unique@example.com ===');
  const res2 = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'login-test-unique@example.com', password: 'Password123!' }),
  });
  const body2 = await res2.json().catch(() => null);
  console.log('HTTP status:', res2.status);
  console.log('Response:', JSON.stringify(body2));

  // Check if cliente is actually found correctly
  console.log('\n=== DB CHECK: cliente@surtitelas.com ===');
  const cliente = await prisma.user.findUnique({
    where: { email: 'cliente@surtitelas.com' },
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
    },
  });
  if (cliente) {
    console.log('Found:', !!cliente);
    console.log('email:', cliente.email);
    console.log('estado:', cliente.estado);
    console.log('deletedAt:', cliente.deletedAt);
    console.log('passwordHash length:', cliente.passwordHash.length);
    console.log('passwordHash prefix:', cliente.passwordHash.substring(0, 7));
    console.log('failedLoginAttempts:', cliente.failedLoginAttempts);
    console.log('lockedUntil:', cliente.lockedUntil);

    // Direct bcrypt check
    console.log('\nDirect bcrypt.compare:');
    const valid = await bcrypt.compare('SurtiTelas2025*', cliente.passwordHash);
    console.log('Result:', valid);

    // Check Prisma unique lookup works
    console.log('\nPrisma findUnique with lowercase email:');
    const found = await prisma.user.findUnique({ where: { email: 'cliente@surtitelas.com' } });
    console.log('Found:', !!found);
    console.log('Email match:', found?.email === 'cliente@surtitelas.com');
  }

  process.exit(0);
}

main().catch(async (e) => {
  console.error('ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
