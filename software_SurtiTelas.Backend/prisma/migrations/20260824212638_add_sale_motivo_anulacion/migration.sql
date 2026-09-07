-- Migration: Add motivo_anulacion to sales table
-- This column was previously added via `prisma db push` in some environments.
-- Using IF NOT EXISTS to be safe on databases that already have the column.

ALTER TABLE "sales" ADD COLUMN IF NOT EXISTS "motivo_anulacion" TEXT;
