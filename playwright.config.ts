import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e', timeout: 120_000, workers: 1,
  use: { locale: 'ja-JP', baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000', headless: true, launchOptions: { executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe' } },
});
