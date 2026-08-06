-- Widen Word's unique constraint to include `source`, so the same word can
-- have both a "chapter" row (curated New Words) and a "dialog" row (docs/25
-- -chapter-all-words-plan.md) for the same chapterId.
DROP INDEX "Word_chapterId_chinese_key";

CREATE UNIQUE INDEX "Word_chapterId_chinese_source_key" ON "Word"("chapterId", "chinese", "source");
