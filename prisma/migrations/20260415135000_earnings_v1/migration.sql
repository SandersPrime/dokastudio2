-- Creator Economy / Earnings v1
-- String statuses are used for SQLite/PostgreSQL dev compatibility.

ALTER TABLE "Purchase" ADD COLUMN "author_id" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Purchase" ADD COLUMN "author_revenue" REAL NOT NULL DEFAULT 0.0;

CREATE TABLE "PayoutRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "author_id" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "payout_method" TEXT NOT NULL,
    "payout_details" TEXT NOT NULL,
    "admin_note" TEXT,
    "requested_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "PayoutRequest_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "PayoutRequest_author_id_status_idx" ON "PayoutRequest"("author_id", "status");
