-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "reference_id" TEXT,
ADD COLUMN     "reference_type" TEXT;

-- CreateTable
CREATE TABLE "conversation_orders" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_orders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "conversation_orders_conversation_id_idx" ON "conversation_orders"("conversation_id");

-- CreateIndex
CREATE INDEX "conversation_orders_order_id_idx" ON "conversation_orders"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_orders_conversation_id_order_id_key" ON "conversation_orders"("conversation_id", "order_id");

-- AddForeignKey
ALTER TABLE "conversation_orders" ADD CONSTRAINT "conversation_orders_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_orders" ADD CONSTRAINT "conversation_orders_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
