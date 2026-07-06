import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@normy-validation/core': resolve(__dirname, '../core/src/index.ts'),
      '@normy-validation/shared': resolve(__dirname, '../shared/src/index.ts')
    }
  }
});
