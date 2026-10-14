/**
 * Frames while switching views live: 3D → 2D, then bundling on, then back to 3D.
 *   npx tsx scripts/dev/toggles.ts [baseUrl]
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv.find((a) => a.startsWith('http')) ?? 'http://localhost:5273';
const out = new URL('../../docs/screens/views/', import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
	args: ['--enable-unsafe-webgpu', '--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist']
});
const page = await browser.newPage({
	viewport: { width: 1600, height: 940 },
	deviceScaleFactor: 1
});
const errors: string[] = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text().slice(0, 300)));
page.on('pageerror', (e) => errors.push(e.message.slice(0, 300)));
await page.addInitScript(() =>
	localStorage.setItem(
		'asterism.settings.v1',
		JSON.stringify({ flat: false, bundle: false, autoRotate: false })
	)
);
await page.goto(base);
await page
	.getByText(/^\s*WebGPU\s*$/)
	.first()
	.waitFor({ timeout: 120_000 });
const shot = (name: string) =>
	page.screenshot({ path: `${out}t-${name}.jpg`, type: 'jpeg', quality: 80 });

await page.getByRole('button', { name: 'Switch to the flat 2D map' }).click();
for (const ms of [400, 1200, 3000]) {
	await page.waitForTimeout(ms === 400 ? 400 : ms - 400);
	await shot(`flat-${ms}`);
}
await page
	.getByText(/^\s*WebGPU\s*$/)
	.first()
	.waitFor({ timeout: 120_000 });
// After the warm-up (1.5 s after the layout settles), as a person would.
await page.waitForTimeout(2500);
await page.getByRole('button', { name: 'Bundle edges' }).click();
for (const ms of [150, 450, 1500]) {
	await page.waitForTimeout(ms === 150 ? 150 : ms - 150);
	await shot(`bundle-${ms}`);
}
await page.getByRole('button', { name: 'Switch to the 3D view' }).click();
await page.waitForTimeout(1500);
await shot('back-3d-1500');
await page
	.getByText(/^\s*WebGPU\s*$/)
	.first()
	.waitFor({ timeout: 120_000 });
await page.waitForTimeout(2500);
await shot('back-3d-settled');
console.log(errors.length ? `ERRORS: ${errors.join(' | ')}` : 'no errors');
await browser.close();
