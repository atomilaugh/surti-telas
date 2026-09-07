-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "descuento_especial" DECIMAL(5,2) DEFAULT 0,
ADD COLUMN     "dias_credito" INTEGER DEFAULT 0,
ADD COLUMN     "envio_gratis" BOOLEAN DEFAULT false,
ADD COLUMN     "prioridad_envio" TEXT DEFAULT 'Normal';

-- CreateTable
CREATE TABLE "domiciliarios" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "zona" TEXT,
    "vehiculo" TEXT,
    "capacidad" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domiciliarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "domiciliarios_userId_key" ON "domiciliarios"("userId");

-- CreateIndex
CREATE INDEX "domiciliarios_userId_idx" ON "domiciliarios"("userId");

-- AddForeignKey
ALTER TABLE "domiciliarios" ADD CONSTRAINT "domiciliarios_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
