-- docs/57-saved-words-plan.md — per-word bookmarking. `savedWordsEnabled`
-- defaults false (opt-in, per-account); SavedWordList/SavedWord are new
-- tables, additive only, nothing existing changes shape.
ALTER TABLE "User" ADD COLUMN "savedWordsEnabled" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "SavedWordList" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedWordList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SavedWord" (
    "id" SERIAL NOT NULL,
    "listId" INTEGER NOT NULL,
    "chinese" TEXT NOT NULL,
    "pinyin" TEXT NOT NULL,
    "meaning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedWord_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SavedWordList_userId_name_key" ON "SavedWordList"("userId", "name");

CREATE UNIQUE INDEX "SavedWord_listId_chinese_key" ON "SavedWord"("listId", "chinese");

ALTER TABLE "SavedWordList" ADD CONSTRAINT "SavedWordList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavedWord" ADD CONSTRAINT "SavedWord_listId_fkey" FOREIGN KEY ("listId") REFERENCES "SavedWordList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
