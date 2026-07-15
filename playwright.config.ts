import { defineConfig, devices } from '@playwright/test'
import path from 'node:path'

const dashboardPort = Number(process.env.E2E_DASHBOARD_PORT ?? 5173)
const apiPort = Number(process.env.E2E_API_PORT ?? 8000)
const dashboardURL = process.env.E2E_DASHBOARD_URL ?? `http://127.0.0.1:${dashboardPort}`
const apiURL = process.env.E2E_API_URL ?? `http://127.0.0.1:${apiPort}`
const backendRoot = process.env.E2E_BACKEND_ROOT
  ?? path.resolve(__dirname, '..', 'autonomous-career-scout')
const backendPython = process.env.E2E_BACKEND_PYTHON
  ?? path.join(backendRoot, '.venv', 'Scripts', 'python.exe')

export default defineConfig({
  testDir: './e2e',
  timeout: 45_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }]
  ],
  use: {
    baseURL: dashboardURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure'
  },
  globalSetup: './e2e/global-setup.ts',
  webServer: [
    {
      command: `"${backendPython}" -B -m uvicorn src.api.app:app --host 127.0.0.1 --port ${apiPort}`,
      cwd: backendRoot,
      url: `${apiURL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000
    },
    {
      command: `npm run dev -- --host 127.0.0.1 --port ${dashboardPort}`,
      cwd: __dirname,
      url: dashboardURL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: process.env
    }
  ],
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        channel: process.env.E2E_BROWSER_CHANNEL ?? 'chrome'
      }
    }
  ]
})
