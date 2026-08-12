import type { NextConfig } from "next";

// Baseline hardening headers. The session cookie itself already carries the main
// defenses (httpOnly, Secure in prod, SameSite=Lax) — these are cheap defense-in-depth
// on top of that, not a substitute for it.
const nextConfig: NextConfig = {
  // Playwright MCP's default output dir (.playwright-mcp/, snapshots +
  // console logs) lands inside the repo root if a tool call doesn't pass an
  // absolute out-of-repo path. Left un-ignored, it's a self-sustaining
  // feedback loop, not just clutter: webpack's watcher sees a new log line
  // -> Fast Refresh rebuild -> that rebuild's own log line gets appended to
  // the *same* watched file -> another rebuild, forever, at ~200ms/cycle,
  // continuously remounting client components and silently resetting their
  // local state (found this testing docs/28's Hard mode toggle, which never
  // stuck because of it). Excluded here as a backstop even though the
  // Playwright MCP config should point --output-dir outside the repo too.
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ["**/node_modules/**", "**/.git/**", "**/.playwright-mcp/**"],
    };
    return config;
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Added per docs/45-audit-infra-security.md §8 — there was no CSP
          // at all before this. Deliberately conservative (no nonce/
          // strict-dynamic plumbing, which would need touching every page
          // that renders a script) rather than skipped entirely: 'self'
          // everywhere real value exists — script-src and connect-src in
          // particular block loading/exfiltrating to an attacker-controlled
          // origin, the actual point of a CSP against injected content —
          // while 'unsafe-inline' stays on script/style because Next.js's
          // own hydration payload and this app's inline style={{width}}
          // progress bars (QuizRunner and friends) both need it; nothing
          // here loads from a third-party origin today (confirmed — no
          // external script/img/font src anywhere in src/app), so 'self' is
          // accurate, not aspirational. 'unsafe-eval' is dev-only — webpack's
          // Fast Refresh runtime genuinely needs eval() in dev mode (checked
          // live, `next dev` throws a CSP violation without it), but a
          // production build doesn't eval anything, so prod keeps the
          // stricter policy without it.
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "font-src 'self' data:",
              "connect-src 'self'",
              // docs/45-audit-infra-security.md's re-audit flagged this as
              // the one directive not explicitly set — falls back to
              // default-src 'self' regardless (not actually open), but
              // <object>/<embed>/<applet> have no legitimate use in this
              // app and are a known legacy plugin/clickjacking vector, so
              // 'none' here is strictly more correct than relying on the
              // fallback.
              "object-src 'none'",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
