import { defineConfig, devices } from '@playwright/test';

const isCI = process.env.CI === 'true';

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
                api: { token: process.env.QASE_TOKEN ?? '26b06f45f7c19dd065f121bde43cb5d62838e16c0abccf5bdd06d392d3ad9708' },
                project: 'EBF',
                run: { complete: true },
              },
            },
          ],
        ] as const)
      : []),
  ],
  use: {
    baseURL: 'http://localhost:3001',
    extraHTTPHeaders: { 'Content-Type': 'application/json' },
  },
  projects: [
    { name: 'api', testMatch: '**/api/**/*.spec.ts' },
    {
      name: 'ui',
      testMatch: '**/ui/**/*.spec.ts',
      use: { ...devices['Desktop Chrome'], baseURL: 'http://localhost:3001' },
    },
  ],
});
