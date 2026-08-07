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
        ],
      },
    ];
  },
};

export default nextConfig;
