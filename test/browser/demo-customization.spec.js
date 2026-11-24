import { test, expect } from './fixtures.js';
import { expectNativeFocus } from './demo-fixture.js';

test.beforeEach(async ({ page }) => {
	await page.route(
		'https://cdn.jsdelivr.net/npm/microlighter@2.2.0/dist/**',
		(route) => route.abort(),
	);
});

test('default example keeps native typing and a static maximum description', async ({
	page,
}) => {
	await page.goto('/demo/index.html');
	const field = page.getByRole('textbox', { name: 'Message', exact: true });
	const host = page.locator('form-maxlength-progress[for="message"]');
	await expect(host).toHaveAttribute('data-ready', '');
	await expect(host).not.toHaveAttribute('description');
	await expect(host).toContainText('120 characters allowed');
	await expect(field).toHaveAccessibleDescription('120 characters allowed');
	await field.focus();
	await page.keyboard.type('Hello');
	await expect(field).toBeFocused();
	await expectNativeFocus(field);
	await expect(host).toContainText('115 characters remaining');
	await expect(field).toHaveAccessibleDescription('120 characters allowed');
	await field.fill('x'.repeat(130));
	await expect(field).toHaveValue('x'.repeat(120));
	await expect(host).toHaveAttribute('proximity', 'target');
});

test('every code/live example has a unique fragment destination, including nested alternatives', async ({
	page,
}) => {
	for (const path of ['index.html', 'esm.html', 'unpkg.html']) {
		await page.goto(`/demo/${path}`);
		const destinations = await page
			.locator('.code-demo-pair')
			.evaluateAll((pairs) =>
				pairs.map((pair) => {
					let block = pair.parentElement;
					while (
						block &&
						(!block.querySelector('h2, h3') ||
							block.querySelectorAll('.code-demo-pair').length !==
								1)
					) {
						block = block.parentElement;
					}
					return block?.id || '';
				}),
			);
		expect(destinations.length).toBeGreaterThan(0);
		for (const id of destinations) {
			expect(id).toMatch(/^[a-z][a-z0-9-]+$/);
			await expect(page.locator(`[id="${id}"]`)).toHaveCount(1);
			await page.evaluate((fragment) => {
				location.hash = fragment;
			}, id);
			await expect(page.locator(':target')).toHaveAttribute('id', id);
		}
		expect(new Set(destinations).size).toBe(destinations.length);
	}
});

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
	await page.locator('#event-message').focus();
	await page.keyboard.press('Tab');
	await expect(
		page.locator('.code-demo-pair').filter({ has: card }).locator('pre'),
	).toBeFocused();
	await page.keyboard.press('Tab');
	await expect(field).toBeFocused();
	await page.keyboard.type('A short introduction.');
	await expect(field).toBeFocused();
	await expect(card.locator('form-maxlength-progress')).toContainText(
		'139 characters remaining',
	);
	await expectNativeFocus(field);
	const ids = (await field.getAttribute('aria-describedby')).split(/\s+/);
	expect(ids).toHaveLength(1);
	await page.setViewportSize({ width: 320, height: 800 });
	expect(
		await page.evaluate(
			() => document.documentElement.scrollWidth <= window.innerWidth,
		),
	).toBe(true);
});

test('milestones show event details, preserve focus, and do not block form validation', async ({
	page,
}) => {
	await page.goto('/demo/index.html');
	const field = page.locator('#event-message');
	const output = page.locator('#event-output');
	await expect(page.locator('#event-progress')).toHaveAttribute(
		'data-ready',
		'',
	);
	await field.focus();
	for (const [length, state, priority] of [
		[10, 'near-limit', 'normal'],
		[20, 'limit-reached', 'high'],
		[21, 'limit-exceeded', 'high'],
	]) {
		await field.fill('x'.repeat(length));
		await expect(field).toBeFocused();
		await expect(output).toContainText(`"state": "${state}"`);
		expect(JSON.parse(await output.textContent())).toMatchObject({
			state,
			priority,
			remaining: 20 - length,
			maximum: 20,
			field: '#event-message',
		});
	}
	await expect(field).toHaveAttribute('aria-invalid', 'true');
	await expect(field).not.toHaveAttribute('maxlength');
	expect(
		await field.evaluate((node) => {
			const form = document.createElement('form');
			node.before(form);
			form.append(node);
			let submitted = false;
			form.addEventListener('submit', (event) => {
				event.preventDefault();
				submitted = true;
			});
			const valid = form.checkValidity();
			form.requestSubmit();
			return { valid, submitted };
		}),
	).toEqual({ valid: true, submitted: true });
	await field.fill('x'.repeat(19));
	await expect(field).not.toHaveAttribute('aria-invalid');
	await expect(page.locator('#event-progress')).toContainText(
		'1 character remaining',
	);
});

test('displayed event handler writes visible details rather than requiring the console', async ({
	page,
}) => {
	await page.goto('/demo/index.html');
	const code = await page
		.locator('#notification-events .code-panel code')
		.textContent();
	const script = code.match(
		/<script type="module">([\s\S]*?)<\/script>/,
	)?.[1];
	expect(script).toBeTruthy();
	await page.goto('about:blank');
	await page.evaluate(() => {
		for (const [tag, id] of [
			['textarea', 'event-message'],
			['form-maxlength-progress', 'event-progress'],
			['pre', 'event-output'],
		]) {
			const node = document.createElement(tag);
			node.id = id;
			document.body.append(node);
		}
	});
	await page.addScriptTag({ content: script, type: 'module' });
	await page.evaluate(() => {
		document.querySelector('#event-progress').dispatchEvent(
			new CustomEvent('form-maxlength-progress:notification', {
				detail: {
					state: 'limit-exceeded',
					message: 'Character limit exceeded',
					priority: 'high',
					remaining: -1,
					maximum: 20,
					field: document.querySelector('#event-message'),
				},
			}),
		);
	});
	await expect(page.locator('#event-output')).toBeVisible();
	expect(
		JSON.parse(await page.locator('#event-output').textContent()),
	).toEqual({
		state: 'limit-exceeded',
		message: 'Character limit exceeded',
		priority: 'high',
		remaining: -1,
		maximum: 20,
		field: '#event-message',
	});
});

test('French labels describe remaining and positive overrun amounts', async ({
	page,
}) => {
	await page.goto('/demo/index.html');
	const field = page.locator('#short-note');
	const host = page.locator('form-maxlength-progress[for="short-note"]');
	await expect(field).toHaveAccessibleDescription('40 caractères maximum');
	await field.fill('x'.repeat(39));
	await expect(host).toContainText('1 caractère restant');
	await field.fill('x'.repeat(41));
	await expect(host).toContainText('1 caractère en trop');
	await expect(field).toHaveAttribute('aria-invalid', 'true');
	await expect(field).toHaveAccessibleDescription('40 caractères maximum');
	await field.fill('');
	await expect(field).not.toHaveAttribute('aria-invalid');
	await expect(host).toContainText('40 caractères maximum');
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
			['message', 120],
			['paste-check', 40],
			['address-check', 40],
			['summary', 80],
			['short-note', 40],
			['arabic-note', 40],
			['event-message', 20],
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
