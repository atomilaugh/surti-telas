-- CreateTable
CREATE TABLE "quote_item_decisions" (
    "id" TEXT NOT NULL,
    "quote_item_id" TEXT NOT NULL,
    "quote_id" TEXT NOT NULL,
    "decision" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "reject_reason" TEXT,
    "reject_comment" TEXT,
    "decided_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_item_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quote_item_decisions_quote_item_id_key" ON "quote_item_decisions"("quote_item_id");

-- CreateIndex
CREATE INDEX "quote_item_decisions_quote_id_idx" ON "quote_item_decisions"("quote_id");

-- CreateIndex
CREATE INDEX "quote_item_decisions_decision_idx" ON "quote_item_decisions"("decision");

-- AddForeignKey
ALTER TABLE "quote_item_decisions" ADD CONSTRAINT "quote_item_decisions_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
