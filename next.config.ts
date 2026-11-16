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
 * Cabinet 01 (MultiHero) runs the game shell document in a same-origin
 * iframe on the Games page, so that one path must be allowed to be framed
 * by its own origin. The game's own networking (online multiplayer over
 * WebSocket, region checks, pings) connects to endpoints the WASM build
 * constructs at runtime — they cannot be enumerated statically — so
 * connect-src here allows secure https:/wss: schemes for that document
 * only. Everything else stays strict (script-src is unchanged), and every
 * other path on the archive keeps frame-ancestors 'none' / DENY.
 * Cache-Control: the build's data/wasm are immutable content, so repeat
 * visits (and mobile data) load from cache instead of re-downloading ~13 MB.
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
      "connect-src 'self' blob: https: wss:",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'self'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
];

/**
 * Cache rules for immutable static game content. Cartridges, the
 * EmulatorJS runtime and the menu sounds never change between deploys (a
 * content change ships with a deploy — swap the file name too, since
 * browsers keep immutable entries for a year), so they are cached
 * aggressively: repeat visits — and mobile data — load them from the
 * browser cache instead of re-downloading megabytes. This is the "no lag
 * on repeat visits" guarantee for the Games room and the menu sounds.
 */
const cacheHeaders = [
  { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
];

/**
 * STATIC_EXPORT=1 builds the archive as pure static files into out/ for
 * the Android APK shell (Capacitor). Export mode cannot ship custom
 * response headers, so the header layers above are skipped entirely —
 * the WebView shell needs none of them (no server, same-origin assets
 * only), and the deployed site keeps every header exactly as before.
 */
const STATIC_EXPORT = process.env.STATIC_EXPORT === "1";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(STATIC_EXPORT
    ? { output: "export" as const }
    : {
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
            {
              source: "/roms/:path*",
              headers: cacheHeaders,
            },
            {
              source: "/emulatorjs/:path*",
              headers: cacheHeaders,
            },
            {
              source: "/sounds/:path*",
              headers: cacheHeaders,
            },
          ];
        },
      }),
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
