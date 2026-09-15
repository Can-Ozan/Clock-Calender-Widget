import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/DateUtils.ts', 'src/services/**/*.ts'],
      reporter: ['text', 'html', 'json-summary'],
    },
  },
});
