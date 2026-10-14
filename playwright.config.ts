import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: {
		// ASTERISM_EVAL keeps tests away from the user's agent memory.
		command: 'npm run build && ASTERISM_EVAL=1 npm run preview -- --port 4173',
		port: 4173,
		timeout: 180_000,
		reuseExistingServer: true
	},
	testMatch: '**/*.e2e.{ts,js}',
	timeout: 180_000,
	use: {
		baseURL: 'http://localhost:4173',
		viewport: { width: 1600, height: 940 },
		launchOptions: { args: ['--enable-unsafe-webgpu', '--enable-gpu', '--use-angle=metal'] }
	}
});
