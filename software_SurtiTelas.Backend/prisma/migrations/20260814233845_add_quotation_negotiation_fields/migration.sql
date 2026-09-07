-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "QuoteStatus" ADD VALUE 'PENDIENTE';
ALTER TYPE "QuoteStatus" ADD VALUE 'CANCELADA';

-- AlterTable
ALTER TABLE "quotes" ADD COLUMN     "negotiation_count" INTEGER DEFAULT 0,
ADD COLUMN     "negotiation_history" JSONB DEFAULT '[]',
ADD COLUMN     "version" INTEGER DEFAULT 1;
