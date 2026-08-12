// Shared confirmation gate for scripts.md write-capable scripts —
// docs/41-audit-backend-data.md/docs/45-audit-infra-security.md flagged that
// `prisma/seed.ts` and `scripts/backfill-mnemonics.ts` had no guard at all
// against being run by accident, which matters more than usual here because
// there's no separate dev/prod database (docs/05-architecture.md) — every
// run of either script writes straight to the one shared production
// database, from a laptop, with no staging copy to rehearse against first.
//
// This can't be a real environment check (there's no env var that
// distinguishes "someone's laptop" from "production" when both point at the
// same DATABASE_URL) — the actual risk is a human running the wrong npm
// script by habit or a bad tab-completion, so the fix is a human-facing
// speed bump: print exactly which database host is about to be written to,
// and require an explicit "yes" (interactively) or `--yes` flag
// (non-interactively, e.g. a deliberate one-off from a script or CI step)
// before continuing.
import { createInterface } from "node:readline/promises";

function hostFromDatabaseUrl(url: string | undefined): string {
  if (!url) return "(DATABASE_URL is not set)";
  try {
    return new URL(url).hostname;
  } catch {
    return "(could not parse DATABASE_URL)";
  }
}

export async function confirmWrite(scriptName: string): Promise<void> {
  const host = hostFromDatabaseUrl(process.env.DATABASE_URL);
  const skip = process.argv.includes("--yes") || process.env.CONFIRM_WRITE === "1";

  console.log(`\n${scriptName} is about to write to:\n  ${host}\n`);

  if (skip) {
    console.log("--yes / CONFIRM_WRITE=1 set, skipping confirmation.\n");
    return;
  }

  if (!process.stdin.isTTY) {
    console.error(
      "Not an interactive terminal and no --yes/CONFIRM_WRITE=1 given — refusing to run " +
        "unattended against a real database. Pass --yes (or set CONFIRM_WRITE=1) if this is " +
        "intentional (e.g. a deliberate CI/automation run)."
    );
    process.exit(1);
  }

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(`Type "yes" to continue, anything else to abort: `);
  rl.close();

  if (answer.trim().toLowerCase() !== "yes") {
    console.log("Aborted.");
    process.exit(1);
  }
  console.log("");
}
