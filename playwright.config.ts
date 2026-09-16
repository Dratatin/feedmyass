import fs from 'node:fs';
import { defineConfig, devices } from '@playwright/test';

// Les parcours de l'espace personnel créent leurs comptes de test via l'API
// d'administration Supabase: ils ont besoin des variables d'environnement.
if (fs.existsSync('.env.local')) process.loadEnvFile('.env.local');

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: { baseURL: 'http://localhost:3000', trace: 'on-first-retry' },
  projects: [
    {
      name: 'mobile-320',
      use: { ...devices['Desktop Chrome'], viewport: { width: 320, height: 640 } },
    },
    {
      name: 'desktop-1920',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
  },
});
