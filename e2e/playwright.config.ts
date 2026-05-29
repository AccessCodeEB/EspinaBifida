import { defineConfig, devices } from '@playwright/test';
import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Cargar .env.defaults y .env para que las variables E2E_* estén disponibles en los tests
loadEnv({ path: path.resolve(__dirname, '../.env.defaults') });
loadEnv({ path: path.resolve(__dirname, '../.env') }); // override: valores locales ganan

const isCI = process.env.CI === 'true';
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3000';

export default defineConfig({
  testDir: '.',
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: [
    ['list'],
    // QASE reporter activo cuando QASE_TOKEN está definido (local y CI).
    ...(process.env.QASE_TOKEN
      ? ([
          [
            'playwright-qase-reporter',
            {
              mode: 'testops',
              testops: {
                api: { token: process.env.QASE_TOKEN },
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
