import type { Config } from 'jest';
import nextJest from 'next/jest';

const createJestConfig = nextJest({
  dir: './',
});

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  modulePathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
  ],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: './tsconfig.json' }]
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
  // ログ出力を最小限にする設定
  verbose: false,
  // カスタムレポーターを使用してテスト出力をシンプルにする
  reporters: [
    '<rootDir>/jest-custom-reporter.js'
  ],
  // コンソール出力の制御
  silent: true,
  logHeapUsage: false,
  // テスト失敗時のエラー出力を簡略化
  errorOnDeprecated: true,
  // テスト実行中の進行状況表示を最小限に
  notify: false,
  bail: 0,
  // エラー表示の簡略化
  testFailureExitCode: 0,
  // DOMのスナップショット出力を制限
  snapshotSerializers: [],
  // テスト実行中の進行状況表示を最小限に
  noStackTrace: false,
};

export default createJestConfig(config);
