import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit-test pass: exclude the integration test folder
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/__tests__/**',       // integration tests live here, run via test:integration
    ],
    passWithNoTests: true,
  },
});
