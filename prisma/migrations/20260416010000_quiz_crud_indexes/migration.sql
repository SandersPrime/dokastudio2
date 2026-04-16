CREATE INDEX "Quiz_author_id_idx" ON "Quiz"("author_id");
CREATE INDEX "Quiz_author_id_updated_at_idx" ON "Quiz"("author_id", "updated_at");
CREATE INDEX "Quiz_is_published_idx" ON "Quiz"("is_published");
