import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'login-test-unique@example.com';
  const password = 'Password123!';

  // Clean up if exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.delete({ where: { id: existing.id } });
  }

  console.log('=== REGISTRATION TEST ===');
  console.log('email:', email);
  console.log('passwordLength:', password.length);

  // Hash using bcrypt directly (same as BcryptPasswordHasher)
  const hash = await bcrypt.hash(password, 12);
  console.log('hashPrefix:', hash.substring(0, 7));
  console.log('hashLength:', hash.length);

  // Store in DB
  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase(),
      nombre: 'Test',
      apellidos: 'User',
      passwordHash: hash,
      role: 'cliente',
      estado: 'ACTIVO',
    },
  });

  console.log('Stored user id:', user.id);
  console.log('Stored email:', user.email);
  console.log('Stored passwordHash exists:', !!user.passwordHash);
  console.log('Stored passwordHash prefix:', user.passwordHash.substring(0, 7));
  console.log('Stored failedLoginAttempts:', user.failedLoginAttempts);
  console.log('Stored lockedUntil:', user.lockedUntil);

  // Now simulate LoginUser: findByEmail then compare
  console.log('\n=== LOGIN FLOW SIMULATION ===');

  // Step 1: findByEmail (as LoginUser does)
  const dbUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  console.log('findByEmail result exists:', !!dbUser);
  console.log('findByEmail email:', dbUser?.email);
  console.log('findByEmail estado:', dbUser?.estado);

  // Step 2: Check lockout (as LoginUser does)
  if (dbUser && dbUser.lockedUntil && dbUser.lockedUntil > new Date()) {
    console.log('USER IS LOCKED');
    process.exit(1);
  }
  console.log('Lockout check: NOT LOCKED (passed)');

  // Step 3: bcrypt.compare (as LoginUser does)
  const valid = await bcrypt.compare(password, dbUser!.passwordHash);
  console.log('bcrypt.compare result:', valid);

  if (valid) {
    console.log('SUCCESS: Login would proceed normally');
  } else {
    console.log('FAILURE: bcrypt.compare returned false - BUG IN HASHING!');
  }

  // Also test with the actual BcryptPasswordHasher class
  console.log('\n=== BcryptPasswordHasher CLASS TEST ===');
  const { BcryptPasswordHasher } = await import('./src/modules/auth/infrastructure/services/BcryptPasswordHasher');
  const hasher = new BcryptPasswordHasher();

  // Test 1: Hash then compare with same hasher instance
  const testHash = await hasher.hash(password);
  const testCompare = await hasher.compare(password, testHash);
  console.log('Same hasher - hash then compare:', testCompare);

  // Test 2: Compare stored hash with new hasher instance
  const storedCompare = await hasher.compare(password, dbUser!.passwordHash);
  console.log('Stored hash - compare with fresh hasher:', storedCompare);

  // Test 3: Try common issue - password mismatch scenarios
  console.log('\n=== EDGE CASE TESTS ===');
  // What if frontend sends extra whitespace?
  const trimCompare = await hasher.compare(password.trim(), dbUser!.passwordHash);
  console.log('trimmed password compare:', trimCompare);

  // What if password is slightly different?
  const wrongCompare = await hasher.compare('WrongPassword1!', dbUser!.passwordHash);
  console.log('wrong password compare (should be false):', wrongCompare);

  process.exit(0);
}

main().catch(async (e) => {
  console.error('ERROR:', e);
  await prisma.$disconnect();
  process.exit(1);
});
