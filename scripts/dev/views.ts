/**
 * Screenshots of the graph in each view (3D / 2D, curves / GPU-bundled), with frame rates and
 * console errors.   npx tsx scripts/dev/views.ts [baseUrl]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv.find((a) => a.startsWith('http')) ?? 'http://localhost:5273';
const out = new URL('../../docs/screens/views/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const FPS = `new Promise((resolve) => { let n = 0; const t0 = performance.now(); const tick = () => { n++; if (performance.now() - t0 < 2000) requestAnimationFrame(tick); else resolve(Math.round(n / 2)); }; requestAnimationFrame(tick); })`;

const browser = await chromium.launch({
	args: ['--enable-unsafe-webgpu', '--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist']
});
for (const [name, flat, bundle] of [
	['3d', false, false],
	['3d-bundled', false, true],
	['2d', true, false],
	['2d-bundled', true, true]
] as const) {
	const page = await browser.newPage({
		viewport: { width: 1600, height: 940 },
		deviceScaleFactor: 2
	});
	const errors: string[] = [];
	page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)));
	page.on('pageerror', (e) => errors.push(e.message.slice(0, 300)));
	await page.addInitScript(
		(v) =>
			localStorage.setItem('asterism.settings.v1', JSON.stringify({ ...v, autoRotate: false })),
		{ flat, bundle }
	);
	await page.goto(base);
	const t0 = Date.now();
	// Settled when the status line stops saying "laying out"; then let the bundles gather.
	await page
		.getByText(/^\s*WebGPU\s*$/)
		.first()
		.waitFor({ timeout: 120_000 });
	const settle = ((Date.now() - t0) / 1000).toFixed(0);
	await page.waitForTimeout(bundle ? 5000 : 1500);
	const fps = await page.evaluate(FPS);
	await page.screenshot({ path: `${out}${name}.jpg`, type: 'jpeg', quality: 86 });
	console.log(
		`${name.padEnd(11)} settled in ${settle}s, ${fps} fps${errors.length ? `  ERRORS: ${errors.join(' | ')}` : ''}`
	);
	await page.close();
}
await browser.close();
