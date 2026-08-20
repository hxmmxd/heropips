import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
    include: ['src/**/*.test.ts', 'tests/**/*.test.ts'],
    exclude: ['apps/**', 'node_modules/**', '.next/**', '.agents/**'],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
});
