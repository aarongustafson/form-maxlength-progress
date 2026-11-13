import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const read = (file) => readFile(resolve(process.cwd(), file), 'utf8');

describe('demo and publishing contracts', () => {
	it('highlights every displayed component tag and its registration code', async () => {
		for (const name of ['index.html', 'esm.html', 'unpkg.html']) {
			const template = document.createElement('template');
			template.innerHTML = await read(`demo/${name}`);
			for (const code of template.content.querySelectorAll('pre code')) {
				const marks = [...code.querySelectorAll('mark')];
				const snippets = [
					...code.textContent.matchAll(
						/<\/?form-maxlength-progress\b[^>]*>/g,
					),
				];
				for (const [snippet] of snippets) {
					expect(
						marks.some((mark) =>
							mark.textContent.includes(snippet),
						),
					).toBe(true);
				}
				expect(code.querySelector('mark mark')).toBeNull();
				if (
					code.textContent.includes(
						'form-maxlength-progress:notification',
					)
				) {
					expect(
						marks.some((mark) =>
							mark.textContent.includes(
								'form-maxlength-progress:notification',
							),
						),
					).toBe(true);
				}
				if (name !== 'index.html') {
					expect(
						marks.some((mark) =>
							mark.textContent.includes('import {'),
						),
					).toBe(true);
					expect(
						marks.some((mark) =>
							/customElements\.define|defineFormMaxlengthProgress\(\)/.test(
								mark.textContent,
							),
						),
					).toBe(true);
				}
			}
		}
	});

	it('leaves descriptions to the component and omits added submission and theme UI', async () => {
		for (const name of ['index.html', 'esm.html', 'unpkg.html']) {
			const html = await read(`demo/${name}`);
			expect(html).not.toMatch(/<small\b|aria-describedby=/);
			expect(html).not.toContain('Submit address');
			expect(html).not.toContain('method="get"');
			expect(html).not.toContain('custom-theme');
		}
	});

	it('keeps behavior-only runtime styling free of a demo palette', async () => {
		const source = await read('form-maxlength-progress.js');
		const css = source.match(/<style>([\s\S]*?)<\/style>/)?.[1];
		expect(css).toBeTruthy();
		expect(css).not.toMatch(
			/(?:background|color|outline|accent-color)\s*:/,
		);
	});

	it('retains the version updater, staging, tag-push behavior, and versioned demo imports', async () => {
		const pkg = JSON.parse(await read('package.json'));
		expect(pkg.scripts.version).toBe(
			'node scripts/update-demo-versions.js && git add demo/esm.html',
		);
		expect(pkg.scripts.postversion).toBe('git push --follow-tags');
		const before = await read('demo/esm.html');
		execFileSync(process.execPath, ['scripts/update-demo-versions.js'], {
			cwd: process.cwd(),
		});
		expect(await read('demo/esm.html')).toBe(before);
		const imports = [
			...before.matchAll(
				/https:\/\/esm\.sh\/@aarongustafson\/form-maxlength-progress@([\d.]+)\//g,
			),
		];
		expect(imports).toHaveLength(2);
		expect(imports.every((match) => match[1] === pkg.version)).toBe(true);
		expect(await read('.github/workflows/publish.yml')).toContain(
			'npm publish',
		);
	});
});
