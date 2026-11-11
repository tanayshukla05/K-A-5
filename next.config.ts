import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
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
