-- CreateEnum
CREATE TYPE "RecoveryRequestStatus" AS ENUM ('PENDIENTE', 'COMPLETADA', 'EXPIRADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "recovery_requests" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),
    "estado" "RecoveryRequestStatus" NOT NULL DEFAULT 'PENDIENTE',
    "ip" TEXT,
    "user_agent" TEXT,
    "resultado" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "recovery_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recovery_requests_user_id_idx" ON "recovery_requests"("user_id");

-- CreateIndex
CREATE INDEX "recovery_requests_email_idx" ON "recovery_requests"("email");

-- CreateIndex
CREATE INDEX "recovery_requests_token_hash_idx" ON "recovery_requests"("token_hash");

-- CreateIndex
CREATE INDEX "recovery_requests_estado_idx" ON "recovery_requests"("estado");

-- CreateIndex
CREATE INDEX "recovery_requests_expires_at_idx" ON "recovery_requests"("expires_at");

-- CreateIndex
CREATE INDEX "recovery_requests_created_at_idx" ON "recovery_requests"("created_at");

-- CreateIndex
CREATE INDEX "recovery_requests_deleted_at_idx" ON "recovery_requests"("deleted_at");

-- AddForeignKey
ALTER TABLE "recovery_requests" ADD CONSTRAINT "recovery_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
