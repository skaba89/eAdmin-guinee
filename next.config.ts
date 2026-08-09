import type { NextConfig } from "next";

const localImageRewrites = [
  ["/guinea-hero-conakry.png", "/guinea-hero-conakry.jpg"],
  ["/guinea-mosque-conakry.png", "/guinea-mosque-conakry.jpg"],
  ["/guinea-fouta-djallon.png", "/guinea-fouta-djallon.jpg"],
  ["/guinea-nimba-mountains.png", "/guinea-nimba-mountains.jpg"],
  ["/guinea-niger-river.png", "/guinea-niger-river.jpg"],
  ["/guinea-culture-dance.png", "/guinea-culture-dance.jpg"],
] as const;

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: false,
  },
  reactStrictMode: true,
  output: "standalone",

  // eAdmin must remain fully usable on constrained/offline-capable networks.
  // Runtime presentation assets are therefore served from /public only.
  images: {
    unoptimized: true,
    remotePatterns: [],
  },

  async rewrites() {
    return {
      // These historical URLs are still referenced by the landing page. The
      // original files were JPEG bytes stored with a .png suffix. Rewriting
      // before filesystem resolution gives browsers/proxies the correct JPEG
      // resource without any external request or visual re-encoding.
      beforeFiles: localImageRewrites.map(([source, destination]) => ({
        source,
        destination,
      })),
      afterFiles: [],
      fallback: [],
    };
  },

  async headers() {
    return [
      {
        source: "/:asset*.jpg",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/:asset*.png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
      {
        source: "/:asset*.svg",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
