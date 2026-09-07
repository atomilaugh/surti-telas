-- CreateTable
CREATE TABLE IF NOT EXISTS "quote_negotiations" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "quote_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "author_role" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "proposal_data" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "quote_negotiations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "quote_negotiations_quote_id_idx" ON "quote_negotiations"("quote_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "quote_negotiations_author_id_idx" ON "quote_negotiations"("author_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "quote_negotiations_created_at_idx" ON "quote_negotiations"("created_at");

-- AddForeignKey
ALTER TABLE "quote_negotiations" ADD CONSTRAINT "quote_negotiations_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "quotes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
