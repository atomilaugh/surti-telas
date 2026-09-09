import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const role = 'VENDEDOR_PERSONALIZADO';
  await prisma.roleConfig.upsert({
    where: { role },
    update: { estado: 'ACTIVO', descripcion: 'Rol vendedor personalizado para pruebas RBAC' },
    create: { role, estado: 'ACTIVO', descripcion: 'Rol vendedor personalizado para pruebas RBAC' },
  });

  const perms = ['customers:read', 'customers:create', 'catalog:read', 'orders:read', 'orders:create'];
  for (const code of perms) {
    const perm = await prisma.permission.findUnique({ where: { code } });
    if (!perm) continue;
    await prisma.rolePermission.upsert({
      where: { role_permissionId: { role, permissionId: perm.id } },
      update: {},
      create: { role, permissionId: perm.id },
    });
  }

  console.log('OK');
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
