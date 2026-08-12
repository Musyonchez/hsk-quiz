// One-pass backfill for docs/39's mnemonic dictionaries: for every
// [chinese, mnemonic] pair, update every Word row sharing that `chinese`
// text (every level/chapter/source it appears under — see docs/39's "Data
// shape" for why that's correct, not just the row a word was authored
// against). Idempotent — safe to re-run after editing a mnemonic in any of
// the three per-level files.
import "dotenv/config";
import { prisma } from "@/lib/db";
import { allMnemonics } from "@/quiz/mnemonics";
import { confirmWrite } from "./confirm-write";

async function main() {
  await confirmWrite("scripts/backfill-mnemonics.ts");
  const entries = Object.entries(allMnemonics);
  let updatedRows = 0;
  let touchedWords = 0;

  for (const [chinese, mnemonic] of entries) {
    const result = await prisma.word.updateMany({ where: { chinese }, data: { mnemonic } });
    if (result.count > 0) touchedWords += 1;
    updatedRows += result.count;
  }

  console.log(`Backfilled ${touchedWords}/${entries.length} distinct words, ${updatedRows} rows total.`);
  if (touchedWords !== entries.length) {
    const missing = [];
    for (const chinese of Object.keys(allMnemonics)) {
      const exists = await prisma.word.findFirst({ where: { chinese }, select: { id: true } });
      if (!exists) missing.push(chinese);
    }
    console.warn("No matching Word row for:", missing);
  }

  await prisma.$disconnect();
}

main();
