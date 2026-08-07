-- docs/25-chapter-all-words-plan.md's addendum: a chapter's actual dialog
-- transcript, distinct from Word's vocabulary entries.
CREATE TABLE "DialogLine" (
    "id" SERIAL NOT NULL,
    "chapterId" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "dialogNumber" INTEGER NOT NULL,
    "dialogLabel" TEXT,
    "speaker" TEXT NOT NULL,
    "chinese" TEXT NOT NULL,
    "pinyin" TEXT NOT NULL,
    "english" TEXT NOT NULL,

    CONSTRAINT "DialogLine_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DialogLine_chapterId_order_key" ON "DialogLine"("chapterId", "order");

ALTER TABLE "DialogLine" ADD CONSTRAINT "DialogLine_chapterId_fkey" FOREIGN KEY ("chapterId") REFERENCES "Chapter"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
