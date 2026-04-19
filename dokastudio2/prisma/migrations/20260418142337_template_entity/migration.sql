-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "format" TEXT,
    "duration_minutes" INTEGER,
    "audience" TEXT,
    "difficulty" TEXT,
    "cover_image" TEXT,
    "tags" TEXT NOT NULL DEFAULT '[]',
    "structure_json" TEXT NOT NULL DEFAULT '{}',
    "style_preset_json" TEXT NOT NULL DEFAULT '{}',
    "logic_preset_json" TEXT NOT NULL DEFAULT '{}',
    "is_published" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Template_slug_key" ON "Template"("slug");

-- CreateIndex
CREATE INDEX "Template_category_idx" ON "Template"("category");

-- CreateIndex
CREATE INDEX "Template_is_published_idx" ON "Template"("is_published");
