-- Add new audit fields
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "actor_user_id" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "target_user_id" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "result" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entity_type" TEXT;
ALTER TABLE "audit_logs" ADD COLUMN IF NOT EXISTS "entity_id" TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS "audit_logs_actor_user_id_idx" ON "audit_logs"("actor_user_id");
CREATE INDEX IF NOT EXISTS "audit_logs_target_user_id_idx" ON "audit_logs"("target_user_id");
