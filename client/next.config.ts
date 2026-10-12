import type { NextConfig } from "next";

/** helmet() defaults, as the Express API sent them on every /api response. */
const apiSecurityHeaders = [
  {
    key: "Content-Security-Policy",
    value:
      "default-src 'self';base-uri 'self';font-src 'self' https: data:;form-action 'self';frame-ancestors 'self';img-src 'self' data:;object-src 'none';script-src 'self';script-src-attr 'none';style-src 'self' https: 'unsafe-inline';upgrade-insecure-requests",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "Origin-Agent-Cluster", value: "?1" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Download-Options", value: "noopen" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
  { key: "X-XSS-Protection", value: "0" },
];

/** A safe subset for pages (no CSP/referrer changes that could affect the storefront). */
const pageSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
];

const nextConfig: NextConfig = {
  // helmet removed X-Powered-By.
  poweredByHeader: false,
  // Loaded with Node's require instead of bundled (native-ish drivers; @prisma/client is already on Next's default list).
  serverExternalPackages: ["@prisma/adapter-mariadb", "mariadb"],
  async headers() {
    return [
      { source: "/((?!api/).*)", headers: pageSecurityHeaders },
      { source: "/api/:path*", headers: apiSecurityHeaders },
    ];
  },
};

export default nextConfig;
