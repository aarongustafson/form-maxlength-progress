import { test, expect } from '@playwright/test';

for (const colorScheme of ['light', 'dark']) {
	test(`${colorScheme}: authored progress follows the counter at each threshold`, async ({
		page,
	}) => {
		await page.emulateMedia({ colorScheme });
		await page.goto('/demo/index.html');
		const host = page.locator('form-maxlength-progress[for="summary"]');
		const progress = page.locator('#summary-meter');
		const colors = [];
		for (const [length, proximity] of [
			[1, 'safe'],
			[48, 'warning'],
			[80, 'target'],
		]) {
			await page.locator('#summary').fill('x'.repeat(length));
			await expect(host).toHaveAttribute('proximity', proximity);
			const color = await host.evaluate(
				(node) => getComputedStyle(node).color,
			);
			colors.push(color);
			await expect(progress).toHaveCSS('color', color);
			await expect(progress).toHaveCSS('accent-color', color);
			await expect(progress).toHaveJSProperty('value', length);
		}
		expect(new Set(colors).size).toBe(3);
	});
}

test('Arabic follows French with RTL layout and complete plural labels', async ({
	page,
}) => {
	await page.goto('/demo/index.html');
	const french = page.locator('section').filter({
		has: page.getByRole('heading', {
			name: 'French translation and overrun',
		}),
	});
	const arabic = french.locator('xpath=following-sibling::section[1]');
	await expect(arabic.getByRole('heading')).toHaveText(
		'Arabic translation and right-to-left layout',
	);
	const live = arabic.locator('.demo');
	await expect(live).toHaveAttribute('lang', 'ar');
	await expect(live).toHaveCSS('direction', 'rtl');
	const field = live.locator('textarea');
	const host = live.locator('form-maxlength-progress');
	await expect(host).toContainText('40');
	await field.fill('س'.repeat(38));
	await expect(host).toContainText('حرفان متبقيان');
	await field.fill('س'.repeat(41));
	await expect(field).toHaveAttribute('aria-invalid', 'true');
	await expect(host).toContainText('حرف واحد زائد');
	await field.fill('');
	await expect(field).not.toHaveAttribute('aria-invalid', 'true');
	await expect(host).toContainText('40');
});

test('custom CSS preserves field semantics, keyboard focus, and reflow', async ({
	page,
}) => {
	await page.goto('/demo/index.html');
	const card = page.locator('.editorial-field');
	const field = card.getByRole('textbox', { name: 'Profile introduction' });
	await expect(field).toHaveAttribute('maxlength', '160');
	await page.locator('#arabic-note').focus();
	await page.keyboard.press('Tab');
	await expect(field).toBeFocused();
	await page.keyboard.type('A short introduction.');
	await expect(field).toBeFocused();
	await expect(card.locator('form-maxlength-progress')).toContainText(
		'139 characters remaining',
	);
	await expect(field).toHaveCSS('outline-style', 'solid');
	const ids = (await field.getAttribute('aria-describedby')).split(/\s+/);
	expect(ids).toHaveLength(1);
	await page.setViewportSize({ width: 320, height: 800 });
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= window.innerWidth,
		),
	).toBe(true);
});

test('forced colors keep custom examples in native system colors', async ({
	page,
	browserName,
}) => {
	test.skip(browserName === 'webkit', 'WebKit cannot emulate forced colors.');
	await page.emulateMedia({ forcedColors: 'active' });
	await page.goto('/demo/index.html');
	await page.locator('#summary').fill('x'.repeat(80));
	await expect(
		page.locator('form-maxlength-progress[for="summary"]'),
	).toHaveCSS('text-decoration-line', 'underline');
	await expect(page.locator('#summary-meter')).toHaveCSS(
		'appearance',
		'auto',
	);
	await expect(page.locator('.editorial-field')).toHaveCSS(
		'forced-color-adjust',
		'auto',
	);
	await page.locator('#profile-intro').fill('x'.repeat(160));
	await expect(
		page.locator('form-maxlength-progress[for="profile-intro"]'),
	).toHaveCSS('text-decoration-line', 'underline');
	const systemText = await page
		.locator('form-maxlength-progress[for="summary"]')
		.evaluate((node) => getComputedStyle(node).color);
	await expect(
		page.locator('form-maxlength-progress[for="profile-intro"]'),
	).toHaveCSS('color', systemText);
});

test('new fields retain native limits when JavaScript is unavailable', async ({
	browser,
	baseURL,
}) => {
	const context = await browser.newContext({
		javaScriptEnabled: false,
		baseURL,
	});
	try {
		const page = await context.newPage();
		await page.goto('/demo/index.html');
		for (const [id, maximum] of [
			['arabic-note', 40],
			['profile-intro', 160],
		]) {
			const field = page.locator(`#${id}`);
			await expect(field).toBeVisible();
			await field.fill('x'.repeat(maximum + 10));
			await expect(field).toHaveValue('x'.repeat(maximum));
			await expect(
				page.locator(`form-maxlength-progress[for="${id}"]`),
			).toBeHidden();
		}
	} finally {
		await context.close();
	}
});
