-- DokaLab Equipment / Rental v1
-- String statuses and request types are used for SQLite/PostgreSQL dev compatibility.

CREATE TABLE "EquipmentProduct" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "short_description" TEXT,
    "image_url" TEXT,
    "gallery_json" TEXT NOT NULL DEFAULT '[]',
    "category" TEXT,
    "scenario_type" TEXT,
    "price" REAL NOT NULL DEFAULT 0.0,
    "rental_price_day" REAL NOT NULL DEFAULT 0.0,
    "deposit_amount" REAL NOT NULL DEFAULT 0.0,
    "stock_qty" INTEGER NOT NULL DEFAULT 0,
    "available_for_sale" BOOLEAN NOT NULL DEFAULT true,
    "available_for_rent" BOOLEAN NOT NULL DEFAULT true,
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

CREATE TABLE "EquipmentRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "product_id" TEXT,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT NOT NULL,
    "customer_phone" TEXT,
    "company_name" TEXT,
    "event_date" DATETIME,
    "rental_days" INTEGER,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "message" TEXT,
    "admin_note" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "EquipmentRequest_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "EquipmentProduct" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "EquipmentProduct_slug_key" ON "EquipmentProduct"("slug");
CREATE INDEX "EquipmentRequest_status_idx" ON "EquipmentRequest"("status");
CREATE INDEX "EquipmentRequest_product_id_idx" ON "EquipmentRequest"("product_id");
