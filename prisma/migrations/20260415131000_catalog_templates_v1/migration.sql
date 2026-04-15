-- Catalog / Templates v1
-- Adds missing template catalog fields for databases created from older migrations.

ALTER TABLE "Quiz" ADD COLUMN "is_template" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Quiz" ADD COLUMN "is_paid" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Quiz" ADD COLUMN "category" TEXT;
ALTER TABLE "Quiz" ADD COLUMN "age_group" TEXT;
ALTER TABLE "Quiz" ADD COLUMN "format" TEXT;
