import { defineConfig, devices } from '@playwright/test';

const isCI = process.env.CI === 'true';
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    // QASE reporter skipped in CI — QASE_MODE=off causes qase() to return undefined
    // in v2.x, breaking every test(qase(...), fn) call at definition time.
    ...(!isCI
      ? ([
          [
            'playwright-qase-reporter',
            {
              mode: 'testops',
              testops: {
                api: { token: process.env.QASE_TOKEN ?? '' },
                project: 'EBF',
                run: { complete: true },
              },
            },
          ],
        ] as const)
      : []),
  ],
  use: {
    baseURL: BASE_URL,
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  },
  projects: [
    { name: 'api', testMatch: '**/api/**/*.spec.ts' },
    {
      name: 'ui',
      testMatch: '**/ui/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: process.env.E2E_FRONTEND_URL || 'http://localhost:3001' },
    },
  ],
});
