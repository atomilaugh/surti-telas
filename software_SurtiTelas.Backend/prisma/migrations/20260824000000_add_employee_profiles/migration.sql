-- CreateEnum
CREATE TYPE "TipoEmpleado" AS ENUM ('ASESOR', 'DOMICILIARIO');

-- CreateTable
CREATE TABLE "employee_profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "cargo" TEXT,
    "fecha_contratacion" TIMESTAMP(3),
    "salario" DECIMAL(12,2),
    "tipo_empleado" "TipoEmpleado",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "employee_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "employee_profiles_user_id_key" ON "employee_profiles"("user_id");

-- CreateIndex
CREATE INDEX "employee_profiles_user_id_idx" ON "employee_profiles"("user_id");

-- CreateIndex
CREATE INDEX "employee_profiles_tipo_empleado_idx" ON "employee_profiles"("tipo_empleado");

-- CreateIndex
CREATE INDEX "employee_profiles_deleted_at_idx" ON "employee_profiles"("deleted_at");

-- AddForeignKey
ALTER TABLE "employee_profiles" ADD CONSTRAINT "employee_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
