-- AlterTable
ALTER TABLE "technical_sheets" ADD COLUMN     "canal" TEXT,
ADD COLUMN     "entregada_en" TIMESTAMP(3),
ADD COLUMN     "enviada_en" TIMESTAMP(3),
ADD COLUMN     "produccion_iniciada_en" TIMESTAMP(3),
ADD COLUMN     "tiempo_respuesta_horas" DECIMAL(10,2);
