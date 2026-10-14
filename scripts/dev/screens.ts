/**
 * High-resolution screenshots of key states for docs/screens/.
 *   npx tsx scripts/dev/screens.ts [baseUrl] [--ask] [--flat] [--bundle]
 * Without flags the app's default view is used; with --flat / --bundle the shots go to
 * docs/screens/<view>/ (e.g. 2d-bundled/).
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const base = process.argv.find((a) => a.startsWith('http')) ?? 'http://localhost:5273';
const ask = process.argv.includes('--ask');
const flat = process.argv.includes('--flat');
const bundle = process.argv.includes('--bundle');
const view = flat || bundle ? `${flat ? '2d' : '3d'}${bundle ? '-bundled' : ''}/` : '';
const out = new URL(`../../docs/screens/${view}`, import.meta.url).pathname;
mkdirSync(out, { recursive: true });

const browser = await chromium.launch({
	args: ['--enable-unsafe-webgpu', '--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist']
});
const page = await browser.newPage({
	viewport: { width: 1600, height: 940 },
	deviceScaleFactor: 2
});
const shot = (name: string) =>
	page.screenshot({ path: `${out}${name}.jpg`, type: 'jpeg', quality: 86 });
if (view) {
	await page.addInitScript((v) => localStorage.setItem('asterism.settings.v1', JSON.stringify(v)), {
		flat,
		bundle
	});
}
await page.goto(base);
await page
	.getByText(/^\s*WebGPU\s*$|^\s*WebGL\s*$/)
	.first()
	.waitFor({ timeout: 90_000 })
	.catch(() => {});
await page.waitForTimeout(4000);
await shot('01-constellation');
console.log('01 constellation');

await page.getByRole('button', { name: /Take the one-minute tour/ }).click();
await page.waitForTimeout(3500);
await shot('02-tour');
await page.keyboard.press('ArrowRight');
await page.keyboard.press('ArrowRight');
await page.waitForTimeout(3500);
await shot('03-tour-sensors');
await page.keyboard.press('Escape');
console.log('02–03 tour');

await page.keyboard.press('Meta+k');
await page
	.getByPlaceholder('Search facts, concepts, standards, sources…')
	.fill('Volvo CE Collision Mitigation System');
await page.waitForTimeout(1200);
await shot('04-search');
await page.keyboard.press('Enter');
await page.waitForTimeout(2500);
await shot('05-node-card');
await page.keyboard.press('Escape');
console.log('04–05 search and card');

if (ask) {
	const box = page.getByPlaceholder('Ask, plan, or explore the research…');
	await box.fill(
		'Which rules and deadlines constrain an automatic braking system that uses machine learning, and what evidence do they demand? Include a timeline.'
	);
	await box.press('Enter');
	await page.waitForTimeout(12_000);
	await shot('06-working');
	await page.getByText(/Answer constellation/).waitFor({ timeout: 420_000 });
	await page.waitForTimeout(2500);
	await shot('07-answer');
	console.log('06–07 answer');
}
await browser.close();
