import { defineConfig } from 'vitest/config';

// Integration test config: run only __tests__ folder, requires live DB + Redis
export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
