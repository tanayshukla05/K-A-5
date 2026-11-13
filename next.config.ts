import type { NextConfig } from "next";

/**
 * Security headers applied to every response, including static files such
 * as the gift APK. script-src keeps 'unsafe-inline' because Next.js
 * hydration needs its inline bootstrap scripts; script-src-attr 'none'
 * closes the gap that would otherwise leave for injected inline event
 * handlers (an XSS defense-in-depth layer on top of the markdown
 * renderer's own escaping).
 */
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "media-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
];

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  // The archive reads /content/learning-paths/*.md with node:fs using a
  // dynamic readdir, which Next's file tracing cannot see. Explicitly
  // include them so any server execution of these routes (e.g. on-demand
  // revalidation on Vercel) always has the Markdown available.
  outputFileTracingIncludes: {
    "/": ["./content/learning-paths/**/*.md"],
    "/rss.xml": ["./content/learning-paths/**/*.md"],
    "/sitemap.xml": ["./content/learning-paths/**/*.md"],
    "/robots.txt": ["./content/learning-paths/**/*.md"],
  },
};

export default nextConfig;
