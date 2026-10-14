import { defineConfig } from '@playwright/test';

export default defineConfig({
	webServer: { command: 'npm run build && npm run preview -- --port 4173', port: 4173, timeout: 180_000, reuseExistingServer: true },
	testMatch: '**/*.e2e.{ts,js}',
	timeout: 180_000,
	use: {
		baseURL: 'http://localhost:4173',
		viewport: { width: 1600, height: 940 },
		launchOptions: { args: ['--enable-unsafe-webgpu', '--enable-gpu', '--use-angle=metal'] }
	}
});
