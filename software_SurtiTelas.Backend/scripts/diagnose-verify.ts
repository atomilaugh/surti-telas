import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = 'http://localhost:3000/api/v1';

async function main() {
  // Verify chat-client with cliente123
  const client = await prisma.user.findUnique({ where: { email: 'chat-client@surtitelas.com' } });
  if (client) {
    const valid = await bcrypt.compare('cliente123', client.passwordHash);
    console.log('chat-client bcrypt.compare cliente123:', valid);
    console.log('hash prefix:', client.passwordHash.substring(0, 7));

    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'chat-client@surtitelas.com', password: 'cliente123' }),
    });
    const body = await res.json().catch(() => null);
    console.log('HTTP:', res.status, JSON.stringify(body));
  }

  // Verify danielmurilloruiz53
  const daniel = await prisma.user.findUnique({ where: { email: 'danielmurilloruiz53@gmail.com' } });
  if (daniel) {
    const valid = await bcrypt.compare('SurtiTelas2025*', daniel.passwordHash);
    console.log('\ndanielmurilloruiz53@gmail.com bcrypt.compare SurtiTelas2025*:', valid);
    console.log('hash prefix:', daniel.passwordHash.substring(0, 7));
    console.log('failedLoginAttempts:', daniel.failedLoginAttempts);
    console.log('lockedUntil:', daniel.lockedUntil);
    console.log('estado:', daniel.estado);
  }

  // Verify 53@gmdanielmurilloruizail.com
  const weird = await prisma.user.findUnique({ where: { email: '53@gmdanielmurilloruizail.com' } });
  if (weird) {
    const valid = await bcrypt.compare('SurtiTelas2025*', weird.passwordHash);
    console.log('\n53@gmdanielmurilloruizail.com bcrypt.compare SurtiTelas2025*:', valid);
    console.log('hash prefix:', weird.passwordHash.substring(0, 7));
    console.log('nombre:', weird.nombre);
    console.log('failedLoginAttempts:', weird.failedLoginAttempts);
  }

  // Verify castro
  const castro = await prisma.user.findUnique({ where: { email: 'castro@gmail.com' } });
  if (castro) {
    console.log('\ncastro@gmail.com:');
    console.log('role:', castro.role);
    console.log('nombre:', castro.nombre);
    console.log('hash prefix:', castro.passwordHash.substring(0, 7));
  }

  process.exit(0);
}

main().catch(async (e) => {
  console.error('ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
