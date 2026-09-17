import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = 'http://localhost:3000/api/v1';

async function main() {
  // Check chat-advisor with documented password asesor123
  console.log('=== chat-advisor@surtitelas.com / asesor123 ===');
  const advisor = await prisma.user.findUnique({ where: { email: 'chat-advisor@surtitelas.com' } });
  if (advisor) {
    const valid = await bcrypt.compare('asesor123', advisor.passwordHash);
    console.log('bcrypt.compare:', valid);
    console.log('hash prefix:', advisor.passwordHash.substring(0, 7));

    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'chat-advisor@surtitelas.com', password: 'asesor123' }),
    });
    const body = await res.json().catch(() => null);
    console.log('HTTP status:', res.status);
    console.log('Response:', JSON.stringify(body));
  }

  // Check chat-client
  console.log('\n=== chat-client@surtitelas.com ===');
  const client = await prisma.user.findUnique({ where: { email: 'chat-client@surtitelas.com' } });
  if (client) {
    console.log('nombre:', client.nombre);
    console.log('hash prefix:', client.passwordHash.substring(0, 7));
  }

  // Check if domiciliario@surtitelas.com exists
  console.log('\n=== domiciliario@surtitelas.com ===');
  const dom = await prisma.user.findUnique({ where: { email: 'domiciliario@surtitelas.com' } });
  console.log('Exists:', !!dom);

  // Check admin details
  console.log('\n=== admin@surtitelas.com DETAILED ===');
  const admin = await prisma.user.findUnique({ where: { email: 'admin@surtitelas.com' } });
  if (admin) {
    const valid = await bcrypt.compare('SurtiTelas2025*', admin.passwordHash);
    console.log('bcrypt.compare SurtiTelas2025*:', valid);
    console.log('createdAt:', admin.createdAt);
    console.log('updatedAt:', admin.updatedAt);
    console.log('deletedAt:', admin.deletedAt);
    console.log('estado:', admin.estado);
    console.log('role:', admin.role);
    console.log('failedLoginAttempts:', admin.failedLoginAttempts);
    console.log('lockedUntil:', admin.lockedUntil);
    console.log('hashPrefix:', admin.passwordHash.substring(0, 7));
    console.log('hashLength:', admin.passwordHash.length);
  }

  // Check cliente details
  console.log('\n=== cliente@surtitelas.com DETAILED ===');
  const cliente = await prisma.user.findUnique({ where: { email: 'cliente@surtitelas.com' } });
  if (cliente) {
    const valid = await bcrypt.compare('SurtiTelas2025*', cliente.passwordHash);
    console.log('bcrypt.compare SurtiTelas2025*:', valid);
    console.log('deletedAt:', cliente.deletedAt);
    console.log('estado:', cliente.estado);
    console.log('createdAt:', cliente.createdAt);
    console.log('updatedAt:', cliente.updatedAt);
  }

  process.exit(0);
}

main().catch(async (e) => {
  console.error('ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
