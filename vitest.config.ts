import { defineConfig } from 'vitest/config';

// Live suites (npm run test:integration) talk to real Swiss APIs from CI
// runners that are sometimes slow. Give each test room for the HTTP client's
// 30 s timeout plus its one retry, and retry a failed test twice before
// calling it broken. Unit and protocol tests keep the strict defaults.
const live = Boolean(process.env.VITEST_ALLOW_NETWORK);

export default defineConfig({
  test: {
    globals: true,
    // Fails any unit or protocol test that reaches the network. tests/integration
    // opts out via VITEST_ALLOW_NETWORK, set by npm run test:integration.
    setupFiles: ['./tests/no-network.setup.ts'],
    environment: 'node',
    testTimeout: live ? 70000 : 15000,
    hookTimeout: live ? 70000 : 10000,
    retry: live ? 2 : 0,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
    },
    include: ['tests/**/*.test.ts'],
  },
});
