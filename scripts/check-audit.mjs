#!/usr/bin/env node
// Runs `npm audit --json` and fails only on high/critical advisories NOT in
// the explicit allowlist below. Plain `npm audit --audit-level=high` can't
// express "ignore this one specific advisory, still fail on anything else
// new" — which is what's actually needed here (2026-08-18): a real
// advisory (GHSA-ggr8-5vv4-36mx, deepmerge-ts stack exhaustion) hit
// @prisma/config's dependency, with no fixed prisma release available yet
// (7.9.1 is still latest stable; the only "fix" npm offers is a forced
// downgrade to prisma@6.12.0, a real breaking change). It's reachable in
// npm's dependency graph only via @better-auth/prisma-adapter's *optional
// peerDependency* on the `prisma` CLI package — confirmed by inspecting
// node_modules/@better-auth/prisma-adapter/{package.json,dist/index.mjs}
// that its compiled code never actually imports `prisma`/@prisma/config at
// all, so this can never execute in the deployed app. A blanket
// `--omit=dev` doesn't filter this out (npm still counts it reachable via
// that peer-dependency slot even though nothing loads it), hence this
// script instead of a simpler audit flag.
//
// Every entry below needs a reason — this file exists to catch *new*
// advisories, not to become a silent blanket suppression.
import { execSync } from "node:child_process";

const ALLOWED_ADVISORY_IDS = new Set([
  // deepmerge-ts stack exhaustion (GHSA-ggr8-5vv4-36mx) — see the file
  // comment above. Revisit (remove this line) once `prisma` ships a stable
  // release past 7.9.1 that bumps its own deepmerge-ts dependency, or if
  // this ever becomes reachable through a real (non-peer, non-optional)
  // dependency path.
  "GHSA-ggr8-5vv4-36mx",
]);

let report;
try {
  const out = execSync("npm audit --audit-level=high --json", { encoding: "utf8" });
  report = JSON.parse(out);
} catch (err) {
  // npm audit exits non-zero whenever it finds anything at/above
  // --audit-level — stdout still carries the JSON report in that case.
  report = JSON.parse(err.stdout);
}

// Packages higher up an advisory's dependency chain (e.g. `prisma`,
// `@prisma/config` here) show up as their own entries in the report, but
// their `via` is just a string naming the next package down, not the
// advisory itself — only the package that directly depends on the
// vulnerable version carries the real advisory object (with `.url`,
// `.severity`, etc). So: collect every real advisory object found anywhere
// in the report (at any depth, on any entry), keep only the high/critical
// ones, and check that whole set against the allowlist — a chain is fully
// covered once its root advisory is.
const advisories = new Map();
for (const vuln of Object.values(report.vulnerabilities ?? {})) {
  for (const via of vuln.via ?? []) {
    if (typeof via === "object" && via.url) {
      const id = via.url.split("/").pop();
      if (via.severity === "high" || via.severity === "critical") advisories.set(id, via);
    }
  }
}

const unallowed = [...advisories.values()].filter((a) => !ALLOWED_ADVISORY_IDS.has(a.url.split("/").pop()));

if (unallowed.length > 0) {
  console.error(`${unallowed.length} high/critical advisory(ies) not on the allowlist:`);
  for (const a of unallowed) console.error(`  - ${a.url} (${a.title})`);
  process.exit(1);
}

console.log("npm audit: only allow-listed high/critical advisories present (or none at all).");
