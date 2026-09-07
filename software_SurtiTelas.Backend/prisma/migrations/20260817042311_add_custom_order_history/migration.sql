-- CreateTable
CREATE TABLE "custom_order_history" (
    "id" TEXT NOT NULL,
    "custom_order_id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "accion" TEXT NOT NULL,
    "estado_anterior" TEXT NOT NULL,
    "estado_nuevo" TEXT NOT NULL,
    "razon" TEXT,
    "informacion" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "custom_order_history_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "custom_order_history_custom_order_id_idx" ON "custom_order_history"("custom_order_id");

-- CreateIndex
CREATE INDEX "custom_order_history_usuario_id_idx" ON "custom_order_history"("usuario_id");

-- CreateIndex
CREATE INDEX "custom_order_history_createdAt_idx" ON "custom_order_history"("createdAt");

-- CreateIndex
CREATE INDEX "custom_order_history_deleted_at_idx" ON "custom_order_history"("deleted_at");

-- AddForeignKey
ALTER TABLE "custom_order_history" ADD CONSTRAINT "custom_order_history_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "custom_order_history" ADD CONSTRAINT "custom_order_history_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
