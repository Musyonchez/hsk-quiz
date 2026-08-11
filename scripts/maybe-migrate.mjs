#!/usr/bin/env node
// Runs `prisma migrate deploy` only on a real Production deploy
// (docs/35-ci-cd-plan.md). `VERCEL_ENV` is set automatically by Vercel to
// "production" | "preview" | "development" — no project-config change
// needed to read it.
//
// Before this existed, every Preview deployment (one per PR, and per push
// to an open PR's branch) ran this same migrate command against the one
// shared database every environment uses (per docs/05-architecture.md).
// That meant: (1) every preview build raced Production's own deploys and
// every other in-flight preview build for the same Postgres advisory lock,
// which is exactly the P1002 timeouts this repo hit repeatedly, and worse,
// (2) an unreviewed branch's schema migration touched production before
// its PR was even approved. Gating this to Production only fixes both —
// Preview builds just build against the schema that already exists.
import { execSync } from "node:child_process";

if (process.env.VERCEL_ENV === "production") {
  // `npx` rather than bare `prisma` — this script can be invoked directly
  // (e.g. testing the production branch locally) as well as via `npm run
  // build`, and only the latter puts node_modules/.bin on PATH for you.
  execSync("npx prisma migrate deploy", { stdio: "inherit" });
} else {
  console.log(
    `Skipping prisma migrate deploy (VERCEL_ENV=${process.env.VERCEL_ENV ?? "unset"}, not production).`
  );
}
