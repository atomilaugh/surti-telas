-- AlterTable
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "action" TEXT,
ADD COLUMN IF NOT EXISTS "actor_id" TEXT,
ADD COLUMN IF NOT EXISTS "entity_id" TEXT,
ADD COLUMN IF NOT EXISTS "entity_type" TEXT,
ADD COLUMN IF NOT EXISTS "metadata" JSONB,
ADD COLUMN IF NOT EXISTS "read_at" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "target_user_id" TEXT;

-- CreateIndex
CREATE INDEX "notifications_entity_type_entity_id_idx" ON "notifications"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "notifications_actor_id_idx" ON "notifications"("actor_id");

-- CreateIndex
CREATE INDEX "notifications_target_user_id_idx" ON "notifications"("target_user_id");

-- CreateIndex
CREATE INDEX "notifications_createdAt_idx" ON "notifications"("createdAt");
