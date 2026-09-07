-- AlterTable
ALTER TABLE "conversations" ADD COLUMN     "last_message_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "message_type" TEXT NOT NULL DEFAULT 'text',
ADD COLUMN     "sender_role" TEXT NOT NULL DEFAULT 'CLIENTE',
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'sent';
