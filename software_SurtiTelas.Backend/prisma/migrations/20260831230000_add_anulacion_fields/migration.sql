-- Add motivoAnulacion and fechaAnulacion to orders
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "motivo_anulacion" TEXT;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "fecha_anulacion" TIMESTAMP;

-- Add ANULADO to PaymentStatus enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
    CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'REFUNDED', 'ANULADO');
  ELSE
    ALTER TYPE "PaymentStatus" ADD VALUE IF NOT EXISTS 'ANULADO';
  END IF;
END $$;

-- Add motivoAnulacion and fechaAnulacion to payments
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "motivo_anulacion" TEXT;
ALTER TABLE "payments" ADD COLUMN IF NOT EXISTS "fecha_anulacion" TIMESTAMP;
