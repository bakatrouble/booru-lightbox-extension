import { defineConfig } from '@playwright/test';

export default defineConfig({
    testDir: 'tests/e2e/specs',
    timeout: 30_000,
    fullyParallel: false,
    reporter: 'list',
    use: {
        baseURL: 'http://127.0.0.1:5199',
        trace: 'retain-on-failure',
    },
    webServer: {
        command:
            'pnpm exec vite serve tests/e2e/harness --port 5199 --strictPort --host 127.0.0.1',
        url: 'http://127.0.0.1:5199',
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
    },
});
