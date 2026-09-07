-- CreateTable
CREATE TABLE "chat_satisfaction_surveys" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_role" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_satisfaction_surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chat_tickets" (
    "id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_role" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'MEDIA',
    "status" TEXT NOT NULL DEFAULT 'ABIERTO',
    "assigned_to" TEXT,
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "chat_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chat_satisfaction_surveys_conversation_id_idx" ON "chat_satisfaction_surveys"("conversation_id");

-- CreateIndex
CREATE INDEX "chat_satisfaction_surveys_user_id_idx" ON "chat_satisfaction_surveys"("user_id");

-- CreateIndex
CREATE INDEX "chat_tickets_conversation_id_idx" ON "chat_tickets"("conversation_id");

-- CreateIndex
CREATE INDEX "chat_tickets_user_id_idx" ON "chat_tickets"("user_id");

-- CreateIndex
CREATE INDEX "chat_tickets_status_idx" ON "chat_tickets"("status");

-- AddForeignKey
ALTER TABLE "chat_satisfaction_surveys" ADD CONSTRAINT "chat_satisfaction_surveys_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_tickets" ADD CONSTRAINT "chat_tickets_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
