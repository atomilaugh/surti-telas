-- AlterTable
ALTER TABLE "raw_materials" ALTER COLUMN "precio_unitario" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "numeroDocumento" TEXT,
ADD COLUMN     "tipoPersona" TEXT;
