import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE = 'http://localhost:3000/api/v1';

async function testLogin(label: string, email: string, password: string) {
  console.log(`\n=== LOGIN TEST: ${label} ===`);
  console.log('email:', email);
  console.log('passwordLength:', password.length);

  try {
    const res = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const body = await res.json().catch(() => null);
    console.log('HTTP status:', res.status);
    console.log('Response body:', JSON.stringify(body));

    if (body && typeof body === 'object' && 'message' in body) {
      console.log('Error message:', body.message);
    }
    if (body && typeof body === 'object' && 'error' in body) {
      console.log('Error code:', body.error);
    }
  } catch (e) {
    console.log('FETCH ERROR:', (e as Error).message);
  }
}

async function main() {
  // Clean up test user if exists
  const email = 'login-test-unique@example.com';
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
    console.log('Cleaned up existing test user');
  }

  // Test 1: Non-existent user login (should fail gracefully)
  await testLogin('NON-EXISTENT USER', 'login-test-unique@example.com', 'Password123!');

  // Test 2: Register test user via API
  console.log('\n=== REGISTERING TEST USER ===');
  const regRes = await fetch(`${BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nombre: 'Test',
      apellidos: 'User',
      email: 'login-test-unique@example.com',
      password: 'Password123!',
      role: 'cliente',
    }),
  });
  const regBody = await regRes.json().catch(() => null);
  console.log('Register status:', regRes.status);
  console.log('Register response:', JSON.stringify(regBody));

  // Verify the user in DB
  const dbUser = await prisma.user.findUnique({ where: { email } });
  console.log('\nDB VERIFICATION after register:');
  console.log('user exists:', !!dbUser);
  console.log('user.estado:', dbUser?.estado);
  console.log('passwordHash length:', dbUser?.passwordHash.length ?? 0);
  console.log('passwordHash prefix:', dbUser?.passwordHash.substring(0, 7));
  console.log('failedLoginAttempts:', dbUser?.failedLoginAttempts);
  console.log('lockedUntil:', dbUser?.lockedUntil);

  // Test 3: Verify bcrypt.compare with the EXACT stored hash
  if (dbUser?.passwordHash) {
    console.log('\n=== BCRYPT DIRECT COMPARE ===');
    const valid = await bcrypt.compare('Password123!', dbUser.passwordHash);
    console.log('compareResult with exact password:', valid);
  }

  // Test 4: Login with newly registered user
  await testLogin('NEWLY REGISTERED USER', 'login-test-unique@example.com', 'Password123!');

  // Test 5: Admin login
  await testLogin('ADMIN USER', 'admin@surtitelas.com', 'SurtiTelas2025*');

  // Test 6: Wrong password for admin (should increment attempts but not lock yet)
  await testLogin('ADMIN WRONG PASSWORD', 'admin@surtitelas.com', 'wrongpassword123!');

  process.exit(0);
}

main().catch(async (e) => {
  console.error('ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
