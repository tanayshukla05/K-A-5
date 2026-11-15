import type { NextConfig } from "next";

/**
 * Security headers applied to every response, including static files such
 * as the gift APK. script-src keeps 'unsafe-inline' because Next.js
 * hydration needs its inline bootstrap scripts; script-src-attr 'none'
 * closes the gap that would otherwise leave for injected inline event
 * handlers (an XSS defense-in-depth layer on top of the markdown
 * renderer's own escaping).
 */
/**
 * 'unsafe-eval' is granted in development only: React's dev build calls
 * eval() for its debugging features (owner stacks / dev overlay), which
 * the strict CSP otherwise reports as a console error. Production builds
 * never call eval — the message itself says so — so the shipped CSP stays
 * eval-free and the XSS hardening keeps its full value there.
 */
const DEV_EVAL = process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'wasm-unsafe-eval': the self-hosted EmulatorJS cores compile WebAssembly.
      // blob: : the core loader runs its extracted script and compression workers
      // from in-memory blob URLs (never a network origin).
      // + 'unsafe-eval' in dev only — see DEV_EVAL above.
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:" + DEV_EVAL,
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "media-src 'self' data:",
      "font-src 'self'",
      // blob: : EmulatorJS runs its core loader, compression workers and
      // save-state plumbing from in-memory blob URLs. Nothing leaves the device.
      "connect-src 'self' blob:",
      // compression workers (zip/7z) are created from blob URLs
      "worker-src 'self' blob:",
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

/**
 * Cabinet 03 (MultiHero) runs the game shell document in a same-origin
 * iframe on the Games page, so that one path must be allowed to be framed
 * by its own origin. Only the framing headers are relaxed here — every
 * other rule in securityHeaders still applies (Next merges headers across
 * matching rules; this later rule wins on the duplicate keys). Every other
 * path on the archive keeps frame-ancestors 'none' / X-Frame-Options DENY.
 */
const gameFrameHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob:" + DEV_EVAL,
      "script-src-attr 'none'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data:",
      "media-src 'self' data:",
      "font-src 'self'",
      "connect-src 'self' blob:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
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
      {
        source: "/multihero/multihero-web/:path*",
        headers: gameFrameHeaders,
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
