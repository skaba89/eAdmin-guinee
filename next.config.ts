import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  devIndicator: {
    appIsrStatus: false,
    buildActivity: false,
  },
};

export default nextConfig;
