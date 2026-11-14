import { test, expect } from '@playwright/test';

for (const forcedColors of ['none', 'active']) {
	for (const customStops of [false, true]) {
		test(`generated counter: forced colors ${forcedColors}, custom stops ${customStops}`, async ({
			page,
			browserName,
		}) => {
			test.skip(
				forcedColors === 'active' && browserName === 'webkit',
				'WebKit does not support forced-colors emulation.',
			);
			await page.emulateMedia({ forcedColors });
			await page.goto('/demo/index.html');
			await page.evaluate(() =>
				customElements.whenDefined('form-maxlength-progress'),
			);
			await page.setContent(`
				<label for="isolated-message">Message</label>
				<textarea id="isolated-message" maxlength="20"></textarea>
				<form-maxlength-progress
					for="isolated-message"
					overrun="true"
					description="Write up to {maxlength} characters"
					${customStops ? 'proximity-values="target 0%, warning 75%, full 100%, beyond"' : ''}
				></form-maxlength-progress>
			`);
			expect(await page.evaluate(() => document.styleSheets.length)).toBe(
				0,
			);
			const field = page.getByRole('textbox', { name: 'Message' });
			const counter = page.locator(
				'[data-form-maxlength-progress-generated-counter]',
			);
			await expect(counter).toHaveText('Write up to 20 characters');
			for (const length of [0, 15, 19, 20, 21, 19, 0]) {
				await field.fill('x'.repeat(length));
				const atLimit = length >= 20;
				await expect(counter).toHaveCSS(
					'text-decoration-line',
					forcedColors === 'active' && atLimit ? 'underline' : 'none',
				);
				if (forcedColors === 'active' && atLimit) {
					await expect(counter).toHaveCSS('font-weight', '700');
				}
				await expect(counter).toHaveText(
					length === 0
						? 'Write up to 20 characters'
						: length === 19
							? '1 character remaining'
							: length === 21
								? '1 character over the max length.'
								: `${20 - length} characters remaining`,
				);
			}
		});
	}
}
