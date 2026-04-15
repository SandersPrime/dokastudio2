-- Marketplace v1
-- String statuses are used for SQLite/PostgreSQL dev compatibility.

ALTER TABLE "Quiz" ADD COLUMN "marketplace_status" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Quiz" ADD COLUMN "license_type" TEXT;
ALTER TABLE "Quiz" ADD COLUMN "published_at" DATETIME;
ALTER TABLE "Quiz" ADD COLUMN "rejection_reason" TEXT;

ALTER TABLE "Purchase" ADD COLUMN "price_paid" REAL NOT NULL DEFAULT 0.0;
