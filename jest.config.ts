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
  // CI環境の考慮
  verbose: false,
  // 環境に応じたレポーター設定
  reporters: process.env.CI 
    ? ['default']  // CI環境では標準レポーター
    : ['<rootDir>/jest-custom-reporter.js'],  // ローカルではカスタムレポーター
  // CI環境では詳細なログを出力
  silent: !process.env.CI,
  logHeapUsage: false,
  errorOnDeprecated: true,
  notify: false,
  bail: 0,
  // 正しいexit code設定
  testFailureExitCode: 1,
  snapshotSerializers: [],
  noStackTrace: false,
};

export default createJestConfig(config);
