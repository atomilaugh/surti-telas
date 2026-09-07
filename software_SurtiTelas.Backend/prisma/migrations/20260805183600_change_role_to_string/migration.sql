-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'CUSTOM';

-- AlterTable
ALTER TABLE "users" ALTER COLUMN "role" TYPE VARCHAR(255) USING ("role"::text);
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'CLIENTE';

-- AlterTable
ALTER TABLE "role_permissions" ALTER COLUMN "role" TYPE VARCHAR(255) USING ("role"::text);

-- AlterTable
ALTER TABLE "role_configs" ALTER COLUMN "role" TYPE VARCHAR(255) USING ("role"::text);

-- DropEnum
DROP TYPE "Role";
