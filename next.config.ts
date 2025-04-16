import type { NextConfig } from "next";
import withPWA from "next-pwa";

// PWAの設定
const pwaConfig = {
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
};

const nextConfig: NextConfig = {
  output: 'export',
  distDir: 'out',
};

export default withPWA(pwaConfig)(nextConfig);
