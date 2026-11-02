import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // Fails any unit or protocol test that reaches the network. tests/integration
    // opts out via VITEST_ALLOW_NETWORK, set by npm run test:integration.
    setupFiles: ['./tests/no-network.setup.ts'],
    environment: 'node',
    testTimeout: 15000,
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
    },
    include: ['tests/**/*.test.ts'],
  },
});
