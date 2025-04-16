import type { NextConfig } from "next";
import withPWA from "next-pwa";

// PWAの設定
const pwaConfig = {
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  // キャッシュ戦略の設定
  runtimeCaching: [
    {
      // アプリケーションのコアファイル
      urlPattern: /^https:\/\/[^\/]+\/(_next\/static|_next\/image|icons\/)/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'app-core',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30日
        },
      },
    },
    {
      // アプリケーションのルート
      urlPattern: /^https:\/\/[^\/]+\/(checkin|)/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'app-routes',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7日
        },
        networkTimeoutSeconds: 10,
        // オフラインフォールバックページの設定
        precacheFallback: {
          fallbackURL: '/offline.html',
        },
      },
    },
    {
      // APIリクエスト
      urlPattern: /^https:\/\/[^\/]+\/api\//,
      handler: 'NetworkOnly',
    },
  ],
};

const nextConfig: NextConfig = {
  output: 'export', // Firebase Functionsを使用するため、静的エクスポートを有効化
  distDir: 'out',
  // functionsディレクトリをビルドプロセスから除外
  typescript: {
    ignoreBuildErrors: true, // ビルド時の型エラーを無視
  },
  eslint: {
    ignoreDuringBuilds: true, // ビルド時のESLintエラーを無視
  },
};

export default withPWA(pwaConfig)(nextConfig);
