import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Check if admin hash matches setup-admin-test hardcoded hash
  const admin = await prisma.user.findUnique({ where: { email: 'admin@surtitelas.com' } });
  if (admin) {
    const setupHash = '$2a$10$JMPFVfMw.YHzPtAdRHQ2kuQfFP1vG.aHXC.e/OOF8pMysTS.a8J4q';
    const currentHash = admin.passwordHash;
    const isSetupHash = currentHash === setupHash;
    console.log('=== ADMIN HASH COMPARISON ===');
    console.log('Current hash:', currentHash);
    console.log('Setup hash:', setupHash);
    console.log('Same as setup-admin-test.ts:', isSetupHash);
    console.log('bcrypt.compare(SurtiTelas2025*, current):', await bcrypt.compare('SurtiTelas2025*', currentHash));
    console.log('bcrypt.compare(SurtiTelas2025*, setup):', await bcrypt.compare('SurtiTelas2025*', setupHash));
    console.log('updatedAt:', admin.updatedAt);

    // Check testprueba user
    const testUser = await prisma.user.findUnique({ where: { email: 'testprueba@surtitelas.com' } });
    console.log('\n=== testprueba@surtitelas.com ===');
    console.log('Exists:', !!testUser);
    if (testUser) {
      console.log('id:', testUser.id);
      console.log('createdAt:', testUser.createdAt);
      console.log('updatedAt:', testUser.updatedAt);
    }

    // Check admintest user
    const adminTest = await prisma.user.findUnique({ where: { email: 'admintest@surtitelas.com' } });
    console.log('\n=== admintest@surtitelas.com ===');
    console.log('Exists:', !!adminTest);

    // Check clientetest user
    const clientTest = await prisma.user.findUnique({ where: { email: 'clientetest@surtitelas.com' } });
    console.log('\n=== clientetest@surtitelas.com ===');
    console.log('Exists:', !!clientTest);
  }

  // Check migration files
  const fs = require('fs');
  const path = require('path');
  const migrationsDir = path.join(__dirname, '..', 'prisma', 'migrations');
  if (fs.existsSync(migrationsDir)) {
    const migrations = fs.readdirSync(migrationsDir);
    console.log('\n=== MIGRATIONS ===');
    for (const m of migrations) {
      const migrationPath = path.join(migrationsDir, m, 'migration.sql');
      if (fs.existsSync(migrationPath)) {
        const content = fs.readFileSync(migrationPath, 'utf-8');
        if (content.includes('password_hash') || content.includes('passwordHash') || content.includes('users')) {
          console.log(`Migration ${m}: contains user/password references`);
          // Show first 500 chars
          console.log(content.substring(0, 500));
        }
      }
    }
  }

  process.exit(0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
