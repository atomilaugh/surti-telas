-- CreateEnum
CREATE TYPE "SurveyStatus" AS ENUM ('BORRADOR', 'ACTIVA', 'CERRADA');

-- CreateEnum
CREATE TYPE "SurveyQuestionType" AS ENUM ('RADIO', 'CHECKBOX', 'TEXT', 'RATING');

-- DropForeignKey
ALTER TABLE "production_orders" DROP CONSTRAINT "production_orders_custom_order_id_fkey";

-- AlterTable
ALTER TABLE "production_orders" ALTER COLUMN "custom_order_id" SET DATA TYPE TEXT;

-- CreateTable
CREATE TABLE "surveys" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "SurveyStatus" NOT NULL DEFAULT 'BORRADOR',
    "tipo" TEXT NOT NULL,
    "preguntas" JSONB,
    "custom_order_id" TEXT,
    "created_by_id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "surveys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "survey_responses" (
    "id" TEXT NOT NULL,
    "survey_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "respuestas" JSONB,
    "calificacion" INTEGER,
    "comentarios" TEXT,
    "completada" BOOLEAN NOT NULL DEFAULT false,
    "completada_at" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "survey_responses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "surveys_codigo_key" ON "surveys"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "surveys_custom_order_id_key" ON "surveys"("custom_order_id");

-- CreateIndex
CREATE INDEX "surveys_estado_idx" ON "surveys"("estado");

-- CreateIndex
CREATE INDEX "surveys_deleted_at_idx" ON "surveys"("deleted_at");

-- CreateIndex
CREATE INDEX "survey_responses_survey_id_idx" ON "survey_responses"("survey_id");

-- CreateIndex
CREATE INDEX "survey_responses_customer_id_idx" ON "survey_responses"("customer_id");

-- AddForeignKey
ALTER TABLE "production_orders" ADD CONSTRAINT "production_orders_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_custom_order_id_fkey" FOREIGN KEY ("custom_order_id") REFERENCES "custom_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "surveys" ADD CONSTRAINT "surveys_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_survey_id_fkey" FOREIGN KEY ("survey_id") REFERENCES "surveys"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "survey_responses" ADD CONSTRAINT "survey_responses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
