import type { NextConfig } from "next";

// Baseline hardening headers. The session cookie itself already carries the main
// defenses (httpOnly, Secure in prod, SameSite=Lax) — these are cheap defense-in-depth
// on top of that, not a substitute for it.
const nextConfig: NextConfig = {
  serverExternalPackages: ["better-sqlite3", "@prisma/adapter-better-sqlite3"],
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
