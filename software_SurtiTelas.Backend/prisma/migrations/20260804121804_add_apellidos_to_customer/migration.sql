/*
  Warnings:

  - You are about to drop the column `created_at` on the `chat_satisfaction_surveys` table. All the data in the column will be lost.
  - You are about to drop the column `assigned_to` on the `chat_tickets` table. All the data in the column will be lost.
  - You are about to drop the column `created_at` on the `chat_tickets` table. All the data in the column will be lost.
  - You are about to drop the column `resolved_at` on the `chat_tickets` table. All the data in the column will be lost.
  - You are about to drop the column `updated_at` on the `chat_tickets` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `chat_tickets` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "chat_satisfaction_surveys" DROP COLUMN "created_at",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "chat_tickets" DROP COLUMN "assigned_to",
DROP COLUMN "created_at",
DROP COLUMN "resolved_at",
DROP COLUMN "updated_at",
ADD COLUMN     "assignedTo" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "resolvedAt" TIMESTAMP(3),
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "apellidos" TEXT;
