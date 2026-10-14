import { expect, test } from '@playwright/test';

test('the constellation loads with topics and stats', async ({ page }) => {
	await page.goto('/');
	await expect(page).toHaveTitle('Asterism');
	await expect(page.getByText('Ask the research')).toBeVisible();
	await expect(page.getByText(/nodes$/).first()).toBeVisible({ timeout: 30_000 });
	await expect(page.locator('canvas')).toBeVisible();
	await expect(page.getByText(/WebGPU|WebGL|laying out/).first()).toBeVisible({ timeout: 30_000 });
});

test('search palette finds a node and opens its card', async ({ page }) => {
	await page.goto('/');
	await expect(page.getByText(/nodes$/).first()).toBeVisible({ timeout: 30_000 });
	await page.keyboard.press('Meta+k');
	const input = page.getByPlaceholder('Search facts, concepts, standards, sources…');
	await expect(input).toBeFocused();
	await input.fill('Volvo CE Collision Mitigation System');
	await expect(
		page.getByRole('dialog', { name: 'Search the graph' }).getByRole('button').first()
	).toBeVisible();
	await page.keyboard.press('Enter');
	await expect(page.getByRole('heading', { name: /Volvo CE/ })).toBeVisible();
	await expect(page.getByText('Light neighbors')).toBeVisible();
});

test('a fact card with restatements opens without errors', async ({ page }) => {
	const errors: string[] = [];
	page.on('pageerror', (e) => errors.push(e.message));
	await page.goto('/');
	await expect(page.getByText(/nodes$/).first()).toBeVisible({ timeout: 30_000 });
	await page.keyboard.press('Meta+k');
	await page
		.getByPlaceholder('Search facts, concepts, standards, sources…')
		.fill('299 independent trials miss rate');
	await expect(
		page.getByRole('dialog', { name: 'Search the graph' }).getByRole('button').first()
	).toBeVisible();
	await page.keyboard.press('Enter');
	await expect(page.getByText('Connected elsewhere')).toBeVisible();
	await expect(page.getByText(/Restated in/).first()).toBeVisible();
	expect(errors).toEqual([]);
});

test('settings open with model choices and memory', async ({ page }) => {
	await page.goto('/');
	await page.getByRole('button', { name: 'Settings' }).click();
	await expect(page.getByRole('dialog', { name: 'Settings' })).toBeVisible();
	await expect(page.getByText('gpt-6.1-sol', { exact: false }).first()).toBeVisible();
	await page.getByRole('button', { name: 'Memory & data' }).click();
	await expect(page.getByText('Agent memory')).toBeVisible();
	await page.keyboard.press('Escape');
	await expect(page.getByRole('dialog', { name: 'Settings' })).toBeHidden();
});

test('a question streams an answer with citations into the chat', async ({ page }) => {
	test.skip(!process.env.E2E_AGENT, 'set E2E_AGENT=1 to run the live agent test');
	await page.goto('/');
	await expect(page.getByText(/nodes$/).first()).toBeVisible({ timeout: 30_000 });
	const box = page.getByPlaceholder('Ask, plan, or explore the research…');
	await box.fill('In one sentence: from when does the EU Machinery Regulation apply?');
	await box.press('Enter');
	await expect(page.locator('.cite-chip').first()).toBeVisible({ timeout: 150_000 });
	await expect(page.locator('.prose-asterism').last()).toContainText('2027');
	await expect(page.getByText(/Answer constellation/)).toBeVisible({ timeout: 30_000 });
});
