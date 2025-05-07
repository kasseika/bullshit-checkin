import type { NextConfig } from "next";
import withPWA from "next-pwa";

// PWAの設定
const pwaConfig = {
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  sw: 'sw.js',
  // キャッシュ戦略の設定
  runtimeCaching: [
    {
      // アプリケーションのコアファイル
      urlPattern: /^https:\/\/[^\/]+\/(_next\/static|_next\/image|icons\/)/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'app-core-v1',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30日
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      // アプリケーションのルート
      urlPattern: /^https:\/\/[^\/]+\/(checkin|)/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'app-routes-v1',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 7 * 24 * 60 * 60, // 7日
        },
        networkTimeoutSeconds: 10,
        // オフラインフォールバックページの設定
        precacheFallback: {
          fallbackURL: '/offline.html',
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    {
      urlPattern: /\.(?:css|woff2|woff|ttf)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'assets-v1',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30日
        },
      },
    },
    {
      urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'images-v1',
        expiration: {
          maxEntries: 60,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30日
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
  // 画像最適化を無効化（静的エクスポートと互換性を持たせるため）
  images: {
    unoptimized: true,
  },
  // functionsディレクトリをビルドプロセスから除外
  typescript: {
    ignoreBuildErrors: true, // ビルド時の型エラーを無視
  },
  eslint: {
    ignoreDuringBuilds: true, // ビルド時のESLintエラーを無視
  },
  // リダイレクト設定
  // 注意: 静的エクスポート（output: 'export'）では、リダイレクトはクライアントサイドでのみ機能します
  // サーバーサイドリダイレクトが必要な場合は、ホスティングサービス（Firebase等）の設定で行う必要があります
  async redirects() {
    return [
      {
        source: '/',
        destination: '/checkin/welcome',
        permanent: true,
      },
    ];
  },
};

export default withPWA(pwaConfig)(nextConfig);
