import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = 'http://localhost:3000/api/v1';

async function main() {
  // Final admin check
  const admin = await prisma.user.findUnique({ where: { email: 'admin@surtitelas.com' } });
  if (admin) {
    const valid = await bcrypt.compare('SurtiTelas2025*', admin.passwordHash);
    console.log('admin bcrypt.compare:', valid);
    console.log('hash prefix:', admin.passwordHash.substring(0, 7));

    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@surtitelas.com', password: 'SurtiTelas2025*' }),
    });
    const body = await res.json().catch(() => null);
    console.log('HTTP:', res.status, JSON.stringify(body).substring(0, 200));
  }

  // Check LoginUser for admin
  const { LoginUser } = await import('./src/modules/auth/application/use-cases/LoginUser');
  const { PrismaAuthRepository } = await import('./src/modules/auth/infrastructure/repositories/PrismaAuthRepository');
  const { BcryptPasswordHasher } = await import('./src/modules/auth/infrastructure/services/BcryptPasswordHasher');
  const { JwtTokenService } = await import('./src/modules/auth/infrastructure/services/JwtTokenService');

  const hasher = new BcryptPasswordHasher();
  const repo = new PrismaAuthRepository(prisma, hasher);
  const tokens = new JwtTokenService();
  const lc = new LoginUser(repo as any, tokens as any, hasher);

  try {
    const r = await lc.execute({ email: 'admin@surtitelas.com', password: 'SurtiTelas2025*', ip: '127.0.0.1', userAgent: 'test' });
    console.log('LoginUser.execute: SUCCESS');
    console.log('accessToken:', (r as any).accessToken ? 'present' : 'missing');
  } catch (e) {
    console.log('LoginUser.execute ERROR:', (e as Error).message);
  }

  process.exit(0);
}

main().catch(async (e) => {
  console.error('ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
