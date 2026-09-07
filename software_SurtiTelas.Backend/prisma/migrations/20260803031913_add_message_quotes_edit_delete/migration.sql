-- AlterTable
ALTER TABLE "messages" ADD COLUMN     "edited_at" TIMESTAMP(3),
ADD COLUMN     "quoted_message_id" TEXT;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_quoted_message_id_fkey" FOREIGN KEY ("quoted_message_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;
