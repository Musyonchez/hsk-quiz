// Merges the three per-level mnemonic dictionaries into one lookup, keyed by
// `chinese` text (docs/39). Each file only has words new to that level — see
// each file's own comment — so this merge is a plain union, no precedence
// concerns between levels. Used only by scripts/backfill-mnemonics.ts; the
// popup itself reads `Word.mnemonic` off the DB row like every other field
// (docs/38), not this map at request time.
import { hsk1Mnemonics } from "./hsk1";
import { hsk2Mnemonics } from "./hsk2";
import { hsk3Mnemonics } from "./hsk3";

export const allMnemonics: Record<string, string> = {
  ...hsk1Mnemonics,
  ...hsk2Mnemonics,
  ...hsk3Mnemonics,
};
