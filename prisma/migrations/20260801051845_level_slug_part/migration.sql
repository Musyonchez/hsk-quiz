/*
  Warnings:

  - Added the required column `slug` to the `Level` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Level" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "slug" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "part" TEXT,
    "name" TEXT NOT NULL
);
INSERT INTO "new_Level" ("id", "name", "number") SELECT "id", "name", "number" FROM "Level";
DROP TABLE "Level";
ALTER TABLE "new_Level" RENAME TO "Level";
CREATE UNIQUE INDEX "Level_slug_key" ON "Level"("slug");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
