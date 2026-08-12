-- Character mode's popup mnemonic (docs/38, docs/39) — nullable, additive,
-- no backfill in this migration itself (that's a separate data-only script,
-- not schema DDL — see docs/39).
ALTER TABLE "Word" ADD COLUMN "mnemonic" TEXT;
