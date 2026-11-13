import { readFile } from 'node:fs/promises';
import { test, expect } from '@playwright/test';

const read = (path) =>
	readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
const source = await read('form-maxlength-progress.js');
const definition = await read('define.js');
const tokens = [
	'Canvas',
	'CanvasText',
	'ButtonFace',
	'ButtonText',
	'Field',
	'FieldText',
];
// The study's 62 observations contain 19 distinct palettes, not 19 OS repainting tests.
const palettes = [
	['#ffffff', '#000000', '#efefef', '#000000', '#ffffff', '#000000'],
	['#121212', '#ffffff', '#6b6b6b', '#ffffff', '#3b3b3b', '#ffffff'],
	['#ffffff', '#000000', '#e9e9ed', '#000000', '#ffffff', '#000000'],
	['#1c1b22', '#fbfbfe', '#2b2a33', '#fbfbfe', '#2b2a33', '#fbfbfe'],
	['#ffffff', '#000000', '#c0c0c0', '#000000d8', '#ffffff', '#000000d8'],
	['#1e1e1e', '#ffffff', '#ffffff3f', '#ffffffd8', '#ffffff3f', '#ffffffd8'],
	['#ffffff', '#000000', '#f0f0f0', '#000000', '#ffffff', '#000000'],
	['#202020', '#ffffff', '#202020', '#ffffff', '#202020', '#ffffff'],
	['#fffaef', '#3d3d3d', '#fffaef', '#202020', '#fffaef', '#3d3d3d'],
	['#2d3236', '#ffffff', '#2d3236', '#b6f6f0', '#2d3236', '#ffffff'],
	['#000000', '#ffffff', '#000000', '#ffee32', '#000000', '#ffffff'],
	['#000000', '#ffffff', '#000000', '#ffee32', '#000000', '#ffee32'],
	['#2d3236', '#ffffff', '#2d3236', '#b6f6f0', '#2d3236', '#b6f6f0'],
	['#fffaef', '#3d3d3d', '#fffaef', '#202020', '#fffaef', '#202020'],
	['#ffffff', '#000000', '#c0c0c0', '#000000', '#ffffff', '#000000'],
	['#000000', '#ffffff', '#c0c0c0', '#000000', '#ffffff', '#000000'],
	['#ffffff', '#000000', '#ffffff', '#000000d8', '#ffffff', '#000000d8'],
	['#282828', '#ffffff', '#202020', '#ffffff', '#202020', '#ffffff'],
	['#202020', '#ffffff', '#00000000', '#ffffff', '#00000000', '#ffffff'],
];

function substitute(css, palette) {
	const colors = Object.fromEntries(
		tokens.map((token, index) => [token.toLowerCase(), palette[index]]),
	);
	return css.replace(
		/\b(CanvasText|Canvas|ButtonFace|ButtonText|FieldText|Field)\b/gi,
		(token) => colors[token.toLowerCase()],
	);
}

async function measurements(locator) {
	return locator.evaluate((element) => {
		const canvas = document.createElement('canvas');
		canvas.width = canvas.height = 1;
		const context = canvas.getContext('2d', { willReadFrequently: true });
		const pixel = () => [...context.getImageData(0, 0, 1, 1).data];
		const paint = (color) => {
			context.fillStyle = color;
			context.fillRect(0, 0, 1, 1);
			return pixel();
		};
		const background = (node) => {
			context.clearRect(0, 0, 1, 1);
			const ancestors = [];
			for (; node; node = node.parentElement) ancestors.unshift(node);
			for (const ancestor of ancestors) {
				const style = getComputedStyle(ancestor);
				if (style.opacity !== '1')
					throw new Error('Opacity requires group compositing.');
				paint(style.backgroundColor);
				if (style.backgroundImage !== 'none') {
					const gradient = style.backgroundImage.match(
						/^linear-gradient\((.+), \1\)$/,
					);
					if (!gradient)
						throw new Error(
							`Unsupported background: ${style.backgroundImage}`,
						);
					paint(gradient[1]);
				}
			}
			if (pixel()[3] !== 255)
				throw new Error('Expected an opaque surface.');
			return pixel();
		};
		const luminance = (rgb) =>
			rgb.slice(0, 3).reduce((sum, channel, index) => {
				const value = channel / 255;
				return (
					sum +
					(value <= 0.04045
						? value / 12.92
						: ((value + 0.055) / 1.055) ** 2.4) *
						[0.2126, 0.7152, 0.0722][index]
				);
			}, 0);
		const ratio = (a, b) => {
			const values = [luminance(a), luminance(b)].sort((a, b) => b - a);
			return (values[0] + 0.05) / (values[1] + 0.05);
		};
		const style = getComputedStyle(element);
		const fill = background(element);
		const text = ratio(paint(style.color), fill);
		background(element);
		const boundary = ratio(paint(style.borderTopColor), fill);
		const surround = background(
			element === document.body ? element : element.parentElement,
		);
		const outline = ratio(paint(style.outlineColor), surround);
		return { text, boundary, outline };
	});
}

async function demo(page, name = 'index.html') {
	await page.route('https://esm.sh/**', (route) =>
		route.fulfill({ contentType: 'text/javascript', body: source }),
	);
	await page.route('https://unpkg.com/**', (route) =>
		route.fulfill({
			contentType: 'text/javascript',
			body: definition.replace(
				"'./form-maxlength-progress.js'",
				"'http://127.0.0.1:4188/form-maxlength-progress.js'",
			),
		}),
	);
	await page.goto(`/demo/${name}`);
	await expect(
		page
			.locator('[data-form-maxlength-progress-generated-counter]')
			.first(),
	).toBeVisible();
}

test('all pages use component descriptions without duplicate authored help', async ({
	page,
}) => {
	for (const name of ['index.html', 'esm.html', 'unpkg.html']) {
		await demo(page, name);
		await expect(page.locator('header h1')).toContainText(
			'form-maxlength-progress',
		);
		await expect(page.locator('footer')).toContainText('Aaron Gustafson');
		for (const field of await page
			.locator('textarea, input[maxlength]')
			.all()) {
			const help = await field.getAttribute('aria-describedby');
			expect(help).toBeTruthy();
			const ids = help.split(/\s+/);
			expect(ids).toHaveLength(1);
			await expect(page.locator(`[id="${ids[0]}"]`)).toHaveAttribute(
				'data-form-maxlength-progress-description',
				'',
			);
			await expect(page.locator(`[id="${ids[0]}"]`)).toBeHidden();
		}
		await expect(page.locator('.demo small')).toHaveCount(0);
		await expect(
			page.getByRole('button', { name: 'Submit address' }),
		).toHaveCount(0);
		for (const section of await page.locator('.demo-section').all()) {
			await expect(section.locator('.code-demo-pair > pre')).toHaveCount(
				1,
			);
			await expect(
				section.locator('.code-demo-pair > .demo'),
			).toHaveCount(1);
		}
	}
});

for (const colorScheme of ['light', 'dark']) {
	test(`${colorScheme}: counters retain contrasting warning and limit colors`, async ({
		page,
	}) => {
		await page.emulateMedia({ colorScheme });
		await demo(page);
		const field = page.locator('#message');
		const counter = page.locator('form-maxlength-progress[for="message"]');
		const colors = [];
		for (const length of [0, 100, 120]) {
			await field.fill('x'.repeat(length));
			colors.push(
				await counter.evaluate((node) => getComputedStyle(node).color),
			);
			expect((await measurements(counter)).text).toBeGreaterThanOrEqual(
				4.5,
			);
			await expect(counter).toHaveCSS('text-decoration-line', 'none');
		}
		expect(colors[1]).not.toBe(colors[0]);
		expect(colors[2]).not.toBe(colors[1]);
		await expect(field).toHaveCSS('border-top-width', '3px');
		await page.locator('#short-note').fill('x'.repeat(41));
		await expect(
			page.locator('form-maxlength-progress[for="short-note"]'),
		).toHaveCSS('color', colors[2]);
	});
}

test('forced colors use bold warning and bold underlined limit text with solid surfaces', async ({
	page,
	browserName,
}) => {
	test.skip(
		browserName === 'webkit',
		'WebKit does not emulate forced colors.',
	);
	await page.emulateMedia({ forcedColors: 'active' });
	await demo(page);
	const counter = page.locator('form-maxlength-progress[for="message"]');
	await page.locator('#message').fill('x'.repeat(100));
	await expect(counter).toHaveCSS('font-weight', '700');
	await expect(counter).toHaveCSS('text-decoration-line', 'none');
	await page.locator('#message').fill('x'.repeat(120));
	await expect(counter).toHaveCSS('font-weight', '700');
	await expect(counter).toHaveCSS('text-decoration-line', 'underline');
	const fieldColor = await page.locator('#message').evaluate(() => {
		const probe = document.createElement('span');
		probe.style.color = 'Field';
		document.body.append(probe);
		const color = getComputedStyle(probe).color;
		probe.remove();
		return color;
	});
	for (const selector of ['#message', 'pre', '.event-output']) {
		await expect(page.locator(selector).first()).toHaveCSS(
			'background-image',
			'none',
		);
		await expect(page.locator(selector).first()).toHaveCSS(
			'background-color',
			fieldColor,
		);
	}
});

for (const colorScheme of ['light', 'dark']) {
	test(`${colorScheme}: reading surfaces and limit feedback meet text contrast`, async ({
		page,
	}) => {
		await page.emulateMedia({ colorScheme });
		await demo(page);
		await page.locator('#message').fill('x'.repeat(100));
		for (const selector of [
			'body',
			'.demo-section',
			'.demo',
			'pre',
			'footer',
			'pre code mark',
			'#message',
			'form-maxlength-progress[for="message"]',
		]) {
			expect(
				(await measurements(page.locator(selector).first())).text,
				selector,
			).toBeGreaterThanOrEqual(4.5);
		}
	});
	test(`${colorScheme}: native inline-code pair is tested separately`, async ({
		page,
		browserName,
	}) => {
		test.fail(
			process.platform === 'linux' &&
				browserName === 'webkit' &&
				colorScheme === 'dark',
			'Known Ubuntu WebKit ButtonText/ButtonFace native-pair limitation.',
		);
		await demo(page);
		await page.emulateMedia({ colorScheme });
		expect(
			(await measurements(page.locator('header code'))).text,
		).toBeGreaterThanOrEqual(4.5);
	});
}

test('all 19 study palettes retain reading, feedback, boundary, and focus contrast', async ({
	page,
}) => {
	await demo(page);
	const css = await read('demo/styles.css');
	const style = await page.addStyleTag({ content: css });
	await page.locator('#short-note').fill('x'.repeat(41));
	for (const palette of palettes) {
		await page.emulateMedia({
			colorScheme: ['#ffffff', '#fffaef'].includes(palette[0])
				? 'light'
				: 'dark',
		});
		await style.evaluate(
			(style, css) => {
				style.textContent = css;
			},
			substitute(css, palette),
		);
		for (const value of [0, 100, 120]) {
			await page.locator('#message').fill('x'.repeat(value));
			for (const selector of [
				'body',
				'.demo-section',
				'.demo',
				'pre',
				'code',
				'footer',
				'pre code mark',
				'#message',
				'form-maxlength-progress[for="message"]',
				'form-maxlength-progress[for="short-note"]',
				'#short-note',
			]) {
				expect(
					(await measurements(page.locator(selector).first())).text,
					`${palette[0]} ${value} ${selector}`,
				).toBeGreaterThanOrEqual(4.5);
			}
		}
		for (const selector of ['#message', '#short-note']) {
			const field = page.locator(selector);
			await field.focus();
			const result = await measurements(field);
			expect(result.boundary).toBeGreaterThanOrEqual(3);
			expect(result.outline).toBeGreaterThanOrEqual(3);
		}
	}
});

test('native keyboard, descriptions, limits, and non-submitting autofill checks survive enhancement', async ({
	page,
}) => {
	await demo(page);
	const field = page.getByRole('textbox', { name: 'Message', exact: true });
	await expect(
		page.locator('form-maxlength-progress[for="message"]'),
	).toContainText('Write up to 120 characters');
	await field.focus();
	await page.keyboard.type('x'.repeat(125));
	await expect(field).toHaveValue('x'.repeat(120));
	await expect(field).toBeFocused();
	await expect(
		page.locator('form-maxlength-progress[for="message"]'),
	).toHaveAttribute('proximity', 'target');
	await expect(
		page.locator('form-maxlength-progress[for="message"]'),
	).toContainText('0 characters remaining');
	await expect(field).toHaveAccessibleDescription(
		'Write up to 120 characters',
	);
	await expect(field).toHaveCSS('outline-style', 'solid');
	expect((await measurements(field)).outline).toBeGreaterThanOrEqual(3);
	await page.keyboard.press('Tab');
	await expect(page.locator('#paste-check')).toBeFocused();
	const initialURL = page.url();
	const submissions = [];
	page.on('request', (request) => {
		if (
			request.isNavigationRequest() ||
			request.url().includes('street-address=')
		)
			submissions.push(request.url());
	});
	await page.locator('#address-check').fill('12 Example Road');
	await page.locator('#address-check').focus();
	await page.keyboard.press('Enter');
	await expect(page).toHaveURL(initialURL);
	await expect(page.locator('#address-check')).toHaveValue('12 Example Road');
	expect(submissions).toEqual([]);
});

test('localized overrun retains entered text, non-color cues, and recovery without moving focus', async ({
	page,
}) => {
	await demo(page);
	const field = page.locator('#short-note');
	const feedback = page.locator('form-maxlength-progress[for="short-note"]');
	await field.fill('x'.repeat(41));
	await expect(field).toHaveValue('x'.repeat(41));
	await expect(field).toHaveAttribute('aria-invalid', 'true');
	await expect(field).toHaveCSS('border-top-style', 'solid');
	await expect(feedback).toContainText('1 caractère en trop');
	await expect(feedback).toHaveCSS('font-weight', '700');
	await expect(field).toBeFocused();
	await field.fill('x'.repeat(30));
	await expect(field).not.toHaveAttribute('aria-invalid');
	await expect(feedback).toContainText('10 caractères restants');
	await expect(feedback).toHaveCSS('text-decoration-line', 'none');
	await expect(field).toBeFocused();
});

test('native progress supplements the authored localized count without duplicate semantics', async ({
	page,
}) => {
	await demo(page);
	const field = page.locator('#summary');
	const meter = page.locator('#summary-meter');
	await field.fill('x'.repeat(48));
	await expect(meter).toHaveJSProperty('value', 48);
	await expect(meter).toHaveJSProperty('max', 80);
	await expect(meter).toHaveAttribute('aria-hidden', 'true');
	await expect(page.locator('#summary-count')).toHaveText('32');
	await expect(page.locator('#summary-count')).toHaveAttribute(
		'aria-label',
		'32 characters remaining',
	);
	await expect(page.locator('.custom-progress')).toMatchAriaSnapshot(`
		- strong: "32"
		- text: left
	`);
	expect(
		await meter.evaluate((element) => getComputedStyle(element).appearance),
	).not.toBe('none');
	await field.fill('x'.repeat(80));
	await expect(meter).toHaveJSProperty('value', 80);
	await expect(page.locator('#summary-count')).toHaveText('0');
	await expect(field).toBeFocused();
});

for (const name of ['index.html', 'esm.html', 'unpkg.html']) {
	for (const failure of ['no JavaScript', 'module failure']) {
		test(`${name}: ${failure} keeps native maxlength without extra descriptions`, async ({
			browser,
		}) => {
			const context = await browser.newContext({
				javaScriptEnabled: failure !== 'no JavaScript',
			});
			const page = await context.newPage();
			if (failure === 'module failure') {
				await page.route('**/*.js', (route) => route.abort());
				await page.route('https://esm.sh/**', (route) => route.abort());
				await page.route('https://unpkg.com/**', (route) =>
					route.abort(),
				);
			}
			await page.goto(`http://127.0.0.1:4188/demo/${name}`);
			const field = page.locator('textarea').first();
			const maximum = Number(await field.getAttribute('maxlength'));
			await expect(field).toHaveAccessibleName('Message');
			await expect(field).toHaveAccessibleDescription('');
			await field.focus();
			await page.keyboard.type('x'.repeat(maximum + 3));
			await expect(field).toHaveValue('x'.repeat(maximum));
			await expect(
				page.locator('form-maxlength-progress').first(),
			).toBeHidden();
			if (name === 'index.html') {
				const initialURL = page.url();
				await page.locator('#address-check').fill('12 Example Road');
				await page.locator('#address-check').press('Enter');
				await expect(page).toHaveURL(initialURL);
				await expect(page.locator('#address-check')).toHaveValue(
					'12 Example Road',
				);
			}
			await context.close();
		});
	}
	test(`${name}: code stays left of live examples and reflows at 320px and enlarged text`, async ({
		page,
	}) => {
		await demo(page, name);
		const pair = page.locator('.code-demo-pair').first();
		const code = pair.locator(':scope > pre');
		const live = pair.locator(':scope > .demo');
		await page.setViewportSize({ width: 1280, height: 900 });
		expect((await code.boundingBox()).x).toBeLessThan(
			(await live.boundingBox()).x,
		);
		for (const fontSize of ['16px', '32px']) {
			await page.setViewportSize({ width: 320, height: 900 });
			await page.addStyleTag({
				content: `html { font-size: ${fontSize}; }`,
			});
			expect((await code.boundingBox()).y).toBeLessThan(
				(await live.boundingBox()).y,
			);
			expect(
				await page.evaluate(() => document.documentElement.scrollWidth),
			).toBeLessThanOrEqual(320);
			for (const field of await page.locator('textarea, input').all()) {
				const box = await field.boundingBox();
				expect(box.x + box.width).toBeLessThanOrEqual(320);
			}
		}
	});
}

for (const contrast of ['more', 'forced']) {
	test(`${contrast}: preferences preserve feedback, native progress, and focus`, async ({
		page,
		browserName,
	}) => {
		test.skip(
			contrast === 'forced' && browserName === 'webkit',
			'WebKit does not emulate forced colors.',
		);
		await page.emulateMedia(
			contrast === 'forced'
				? { forcedColors: 'active' }
				: { contrast: 'more' },
		);
		await demo(page);
		await page.locator('#short-note').fill('x'.repeat(41));
		await expect(page.locator('#short-note')).toBeFocused();
		await expect(page.locator('#short-note')).toHaveCSS(
			'border-top-style',
			'solid',
		);
		await expect(
			page.locator('form-maxlength-progress[for="short-note"]'),
		).toContainText('1 caractère en trop');
		await expect(page.locator('#summary-meter')).toBeVisible();
		expect(
			await page
				.locator('#summary-meter')
				.evaluate((element) => getComputedStyle(element).appearance),
		).not.toBe('none');
		for (const selector of ['.demo[lang="fr"]', '#short-note', 'footer']) {
			expect(
				(await measurements(page.locator(selector))).text,
			).toBeGreaterThanOrEqual(4.5);
		}
		expect(
			(await measurements(page.locator('#short-note'))).outline,
		).toBeGreaterThanOrEqual(3);
	});
}
