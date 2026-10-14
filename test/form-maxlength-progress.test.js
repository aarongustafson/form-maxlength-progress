import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { FormMaxlengthProgressElement } from '../form-maxlength-progress.js';

const settle = async () => {
	await new Promise((resolve) => requestAnimationFrame(resolve));
	await Promise.resolve();
};

const createField = ({
	id = 'message',
	maxlength = 20,
	tag = 'textarea',
	type = 'text',
	value = '',
} = {}) => {
	const field = document.createElement(tag);
	field.id = id;
	if (tag === 'input') {
		field.type = type;
	}
	if (maxlength !== null) {
		field.setAttribute('maxlength', String(maxlength));
	}
	field.value = value;
	document.body.append(field);
	return field;
};

const createElement = async (attributes = {}) => {
	const element = document.createElement('form-maxlength-progress');
	for (const [name, value] of Object.entries(attributes)) {
		element.setAttribute(name, value);
	}
	document.body.append(element);
	await settle();
	return element;
};

describe('FormMaxlengthProgressElement', () => {
	beforeEach(() => {
		document.documentElement.lang = 'en';
	});

	afterEach(() => {
		document.body.replaceChildren();
		vi.restoreAllMocks();
	});

	it('is defined and renders an inline-block host with hidden support', async () => {
		const element = await createElement();

		expect(customElements.get('form-maxlength-progress')).toBe(
			FormMaxlengthProgressElement,
		);
		expect(element.shadowRoot).toBeTruthy();
		expect(getComputedStyle(element).display).toBe('none');

		element.hidden = true;
		expect(getComputedStyle(element).display).toBe('none');
	});

	it.each([
		['textarea', ''],
		['input', 'text'],
		['input', 'search'],
		['input', 'tel'],
		['input', 'url'],
		['input', 'email'],
		['input', 'password'],
	])('boots for an eligible %s %s field', async (tag, type) => {
		const field = createField({ tag, type });
		const element = await createElement({ for: field.id });

		expect(element.hasAttribute('data-ready')).toBe(true);
		expect(getComputedStyle(element).display).toBe('inline-block');
		expect(element.id).toMatch(/^form-maxlength-progress-/);
		expect(field.getAttribute('aria-describedby')?.split(/\s+/)).toContain(
			element.id,
		);
	});

	it.each([
		['input', 'number'],
		['input', 'checkbox'],
		['select', ''],
	])('rejects an ineligible %s %s field', async (tag, type) => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		const field = createField({ tag, type });
		const element = await createElement({ for: field.id });

		expect(element.hasAttribute('data-ready')).toBe(false);
		expect(warn).toHaveBeenCalledWith(
			expect.stringMatching(
				/^<form-maxlength-progress> - .+not an eligible field/,
			),
		);
	});

	it('does nothing when the field has no maxlength', async () => {
		const field = createField({ maxlength: null });
		const element = await createElement({ for: field.id });

		expect(element.hasAttribute('data-ready')).toBe(false);
		expect(element.id).toBe('');
		expect(field.hasAttribute('aria-describedby')).toBe(false);
	});

	it.each(['-1', '3.5', 'nope'])(
		'rejects an invalid maxlength value of %s',
		async (maxlength) => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const field = createField({ maxlength });
			const element = await createElement({ for: field.id });

			expect(element.hasAttribute('data-ready')).toBe(false);
			expect(warn).toHaveBeenCalledWith(
				`<form-maxlength-progress> - The associated field has an invalid maxlength value "${maxlength}".`,
			);
		},
	);

	it('generates an ID that does not collide with the document', async () => {
		const collisions = document.createDocumentFragment();
		for (let index = 1; index <= 100; index += 1) {
			const collision = document.createElement('span');
			collision.id = `form-maxlength-progress-${index}`;
			collisions.append(collision);
		}
		document.body.append(collisions);
		const field = createField();
		const element = await createElement({ for: field.id });

		expect(Number(element.id.split('-').at(-1))).toBeGreaterThan(100);
		expect(document.querySelectorAll(`#${element.id}`)).toHaveLength(1);
	});

	it('warns for missing and duplicated field ID refs', async () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		await createElement({ for: 'missing' });

		expect(warn).toHaveBeenCalledWith(
			'<form-maxlength-progress> - The "for" ID reference "missing" does not exist.',
		);

		document.body.replaceChildren();
		createField({ id: 'duplicate' });
		createField({ id: 'duplicate' });
		await createElement({ for: 'duplicate' });

		expect(warn).toHaveBeenCalledWith(
			'<form-maxlength-progress> - The "for" ID reference "duplicate" is duplicated.',
		);
	});

	it('preserves existing descriptions without duplicating its own ID', async () => {
		const field = createField();
		field.setAttribute('aria-describedby', 'hint error');
		const element = await createElement({ for: field.id });

		element.setAttribute('label', 'Changed: {remaining}');
		await settle();

		expect(field.getAttribute('aria-describedby')).toBe(
			`hint error ${element.id}`,
		);
		expect(element.hasAttribute('aria-live')).toBe(false);
		expect(element.hasAttribute('aria-atomic')).toBe(false);
	});

	it('preserves properties assigned before connection', async () => {
		const field = createField();
		const element = new FormMaxlengthProgressElement();
		element.setAttribute('for', field.id);
		Object.defineProperty(element, 'label', {
			configurable: true,
			value: '{remaining} available',
			writable: true,
		});

		document.body.append(element);
		await settle();

		expect(element.getAttribute('label')).toBe('{remaining} available');
		expect(element.firstElementChild.getAttribute('aria-label')).toBe(
			'20 available',
		);
	});

	it('reassociates and cleans up only its own description', async () => {
		const first = createField({ id: 'first' });
		const second = createField({ id: 'second' });
		first.setAttribute('aria-describedby', 'hint');
		const element = await createElement({ for: first.id });

		element.setAttribute('for', second.id);
		await settle();

		expect(first.getAttribute('aria-describedby')).toBe('hint');
		expect(second.getAttribute('aria-describedby')).toBe(element.id);

		element.remove();
		expect(second.hasAttribute('aria-describedby')).toBe(false);
	});

	describe('default counter and labels', () => {
		it('creates a Light DOM counter and updates it on input', async () => {
			const field = createField({ maxlength: 10, value: 'abc' });
			const element = await createElement({ for: field.id });
			const counter = element.querySelector(
				'[data-form-maxlength-progress-generated-counter]',
			);

			expect(counter).not.toBeNull();
			expect(counter.textContent).toBe('7');
			expect(counter.getAttribute('aria-label')).toBe(
				'7 characters remaining',
			);

			field.value = '123456789';
			field.dispatchEvent(new Event('input', { bubbles: true }));

			expect(counter.textContent).toBe('1');
			expect(counter.getAttribute('aria-label')).toBe(
				'1 character remaining',
			);
		});

		it('uses UTF-16 code units like native maxlength', async () => {
			const field = createField({ maxlength: 4, value: '😀' });
			const element = await createElement({ for: field.id });

			expect(element.textContent).toBe('2');
		});

		it('supports plural-category templates and replaces every placeholder', async () => {
			const field = createField({ maxlength: 3, value: 'ab' });
			const element = await createElement({
				for: field.id,
				label: '{remaining} chars; {remaining} available',
				'label-one': 'Only {remaining} char',
			});
			const counter = element.firstElementChild;

			expect(counter.getAttribute('aria-label')).toBe('Only 1 char');

			field.value = 'a';
			field.dispatchEvent(new Event('input'));
			expect(counter.getAttribute('aria-label')).toBe(
				'2 chars; 2 available',
			);
		});

		it('uses Intl.PluralRules categories for the component language', async () => {
			const field = createField({ maxlength: 5, value: 'aa' });
			const element = document.createElement('form-maxlength-progress');
			element.lang = 'pl';
			element.setAttribute('for', field.id);
			element.setAttribute('label', '{remaining} innych');
			element.setAttribute('label-few', '{remaining} znaki');
			document.body.append(element);
			await settle();

			expect(element.firstElementChild.getAttribute('aria-label')).toBe(
				'3 znaki',
			);
		});

		it('reacts to label attributes and reflected properties', async () => {
			const field = createField({ maxlength: 10, value: 'abc' });
			const element = await createElement({ for: field.id });

			element.label = '{remaining} left';
			await settle();
			expect(element.label).toBe('{remaining} left');
			expect(element.firstElementChild.getAttribute('aria-label')).toBe(
				'7 left',
			);

			element.labelOne = 'One left';
			expect(element.getAttribute('label-one')).toBe('One left');
			element.labelOne = null;
			expect(element.hasAttribute('label-one')).toBe(false);
		});
	});

	describe('authored Light DOM', () => {
		it('updates a counter referenced by a host ID ref', async () => {
			const field = createField({ maxlength: 10, value: 'abc' });
			const element = document.createElement('form-maxlength-progress');
			element.setAttribute('for', field.id);
			element.setAttribute('counter', 'remaining');
			element.innerHTML =
				'<span>Characters: <strong id="remaining">pending</strong></span>';
			document.body.append(element);
			await settle();

			const counter = element.querySelector('#remaining');
			expect(counter.textContent).toBe('7');
			expect(counter.getAttribute('aria-label')).toBe(
				'7 characters remaining',
			);
			expect(
				element.querySelector(
					'[data-form-maxlength-progress-generated-counter]',
				),
			).toBeNull();
		});

		it.each([
			['missing', 'does not exist'],
			['outside', 'is not a descendant'],
			['duplicate', 'is duplicated'],
		])('rejects a counter ID ref that %s', async (scenario, message) => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const field = createField();
			const element = document.createElement('form-maxlength-progress');
			element.setAttribute('for', field.id);
			element.setAttribute('counter', scenario);

			if (scenario === 'outside') {
				const outside = document.createElement('span');
				outside.id = scenario;
				document.body.append(outside);
			} else if (scenario === 'duplicate') {
				element.innerHTML =
					'<span id="duplicate"></span><span id="duplicate"></span>';
			}

			document.body.append(element);
			await settle();

			expect(element.hasAttribute('data-ready')).toBe(false);
			expect(warn).toHaveBeenCalledWith(
				`<form-maxlength-progress> - The "counter" ID reference "${scenario}" ${message}.`,
			);
		});

		it('wires an authored progress element without a counter', async () => {
			const field = createField({ maxlength: 10, value: 'abcd' });
			const element = document.createElement('form-maxlength-progress');
			element.setAttribute('for', field.id);
			element.setAttribute('progress', 'meter');
			element.innerHTML = '<progress id="meter"></progress>';
			document.body.append(element);
			await settle();

			const progress = element.querySelector('progress');
			expect(progress.max).toBe(10);
			expect(progress.value).toBe(4);
			expect(progress.getAttribute('aria-label')).toBe(
				'6 characters remaining',
			);
			expect(progress.hasAttribute('aria-hidden')).toBe(false);
			expect(element.children).toHaveLength(1);
		});

		it('hides progress semantics when an authored counter is present', async () => {
			const field = createField({ maxlength: 8, value: 'abc' });
			const element = document.createElement('form-maxlength-progress');
			element.setAttribute('for', field.id);
			element.setAttribute('counter', 'remaining');
			element.setAttribute('progress', 'meter');
			element.innerHTML =
				'<span id="remaining"></span><progress id="meter"></progress>';
			document.body.append(element);
			await settle();

			const progress = element.querySelector('progress');
			expect(progress.getAttribute('aria-hidden')).toBe('true');
			expect(progress.hasAttribute('aria-label')).toBe(false);

			field.value = '1234567';
			field.dispatchEvent(new Event('input'));
			expect(progress.value).toBe(7);
			expect(element.querySelector('#remaining').textContent).toBe('1');
		});

		it('rejects a progress ref to a non-progress element', async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const field = createField();
			const element = document.createElement('form-maxlength-progress');
			element.setAttribute('for', field.id);
			element.setAttribute('progress', 'meter');
			element.innerHTML = '<div id="meter"></div>';
			document.body.append(element);
			await settle();

			expect(element.hasAttribute('data-ready')).toBe(false);
			expect(warn).toHaveBeenCalledWith(
				'<form-maxlength-progress> - The "progress" ID reference "meter" must reference a <progress> element.',
			);
		});

		it('restores authored hook state when disconnected', async () => {
			const field = createField();
			const element = document.createElement('form-maxlength-progress');
			element.setAttribute('for', field.id);
			element.setAttribute('counter', 'remaining');
			element.setAttribute('progress', 'meter');
			element.innerHTML =
				'<span id="remaining" aria-label="Original">Pending</span>' +
				'<progress id="meter" max="50" value="2" aria-label="Original meter"></progress>';
			document.body.append(element);
			await settle();

			const counter = element.querySelector('#remaining');
			const progress = element.querySelector('#meter');
			element.remove();

			expect(counter.textContent).toBe('Pending');
			expect(counter.getAttribute('aria-label')).toBe('Original');
			expect(progress.getAttribute('max')).toBe('50');
			expect(progress.getAttribute('value')).toBe('2');
			expect(progress.getAttribute('aria-label')).toBe('Original meter');
			expect(progress.hasAttribute('aria-hidden')).toBe(false);
		});
	});

	describe('proximity', () => {
		it.each([
			['', 'far'],
			['1234567', 'far'],
			['12345678', 'close'],
			['123456789', 'close'],
			['1234567890', 'target'],
		])('uses default lower-bound stops for %s', async (value, expected) => {
			const field = createField({ maxlength: 10, value });
			const element = await createElement({ for: field.id });

			expect(element.getAttribute('proximity')).toBe(expected);
		});

		it('supports custom names, counts, decimals, and boundaries', async () => {
			const field = createField({ maxlength: 20, value: '123456789' });
			const element = await createElement({
				for: field.id,
				'proximity-values':
					'safe 0%, notice 42.5%, warning 80%, limit 100%, exceeded',
			});

			expect(element.getAttribute('proximity')).toBe('notice');

			field.value = '1234567890123456';
			field.dispatchEvent(new Event('input'));
			expect(element.getAttribute('proximity')).toBe('warning');

			field.value = '12345678901234567890';
			field.dispatchEvent(new Event('input'));
			expect(element.getAttribute('proximity')).toBe('limit');
		});

		it.each([
			['far 1%, target 100%', 'missing zero'],
			['far 0%, close 75%', 'missing 100'],
			['far 0%, close nope, target 100%', 'malformed pair'],
			['far 0%, close 75%, close 100%', 'duplicate token'],
			['far 0%, close 80%, target 75%, end 100%', 'descending'],
			['far 0%, close 110%, target 100%', 'out of range'],
			['far 0%, over, target 100%', 'non-final bare token'],
			['far 0%, target 100%, over, extra', 'multiple bare tokens'],
			['bad/token 0%, target 100%', 'invalid token'],
		])('rejects the whole invalid configuration: %s', async (value) => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const field = createField({ maxlength: 10, value: '12345678' });
			const element = await createElement({
				for: field.id,
				'proximity-values': value,
			});

			expect(element.getAttribute('proximity')).toBe('close');
			expect(warn).toHaveBeenCalledWith(
				`<form-maxlength-progress> - Invalid proximity-values "${value}"; using defaults.`,
			);
		});

		it('reflects the proximityValues property and reacts to changes', async () => {
			const field = createField({ maxlength: 10, value: '12345678' });
			const element = await createElement({ for: field.id });

			element.proximityValues = 'low 0%, high 50%, max 100%';
			await settle();

			expect(element.proximityValues).toBe('low 0%, high 50%, max 100%');
			expect(element.getAttribute('proximity')).toBe('high');
		});
	});

	describe('overrun', () => {
		it.each([
			[null, false],
			['', false],
			['false', false],
			['TRUE', false],
			['true', true],
		])(
			'uses strict string-boolean semantics for %s',
			async (value, enabled) => {
				const field = createField({ maxlength: 5 });
				const attributes = { for: field.id };
				if (value !== null) {
					attributes.overrun = value;
				}
				const element = await createElement(attributes);

				expect(element.overrun).toBe(enabled);
				expect(field.hasAttribute('maxlength')).toBe(!enabled);
			},
		);

		it('moves maxlength, allows a negative count, and caps progress', async () => {
			const field = createField({ maxlength: 5, value: '1234567' });
			const element = document.createElement('form-maxlength-progress');
			element.setAttribute('for', field.id);
			element.setAttribute('overrun', 'true');
			element.setAttribute('counter', 'remaining');
			element.setAttribute('progress', 'meter');
			element.innerHTML =
				'<span id="remaining"></span><progress id="meter"></progress>';
			document.body.append(element);
			await settle();

			expect(field.hasAttribute('maxlength')).toBe(false);
			expect(field.getAttribute('data-maxlength')).toBe('5');
			expect(element.querySelector('#remaining').textContent).toBe('-2');
			expect(
				element.querySelector('#remaining').getAttribute('aria-label'),
			).toBe('2 characters over the max length.');
			expect(element.querySelector('#meter').max).toBe(5);
			expect(element.querySelector('#meter').value).toBe(5);
			expect(element.getAttribute('proximity')).toBe('overrun');
		});

		it('supports localized overrun label categories', async () => {
			const field = createField({ maxlength: 2, value: 'abc' });
			const element = await createElement({
				for: field.id,
				overrun: 'true',
				'overrun-label': '{remaining} too many',
				'overrun-label-one': 'Exactly {remaining} too many',
			});

			expect(element.firstElementChild.getAttribute('aria-label')).toBe(
				'Exactly 1 too many',
			);

			field.value = 'abcde';
			field.dispatchEvent(new Event('input'));
			expect(element.firstElementChild.getAttribute('aria-label')).toBe(
				'3 too many',
			);
		});

		it('keeps the last percentage token when custom stops omit overrun', async () => {
			const field = createField({ maxlength: 2, value: 'abc' });
			const element = await createElement({
				for: field.id,
				overrun: 'true',
				'proximity-values': 'safe 0%, limit 100%',
			});

			expect(element.getAttribute('proximity')).toBe('limit');
		});

		it('restores maxlength and a pre-existing data-maxlength on disable', async () => {
			const field = createField({ maxlength: 5 });
			field.setAttribute('data-maxlength', 'author-value');
			const element = await createElement({
				for: field.id,
				overrun: 'true',
			});

			element.overrun = false;
			await settle();

			expect(element.getAttribute('overrun')).toBe('false');
			expect(field.getAttribute('maxlength')).toBe('5');
			expect(field.getAttribute('data-maxlength')).toBe('author-value');
		});

		it('restores maxlength when reassociated or disconnected', async () => {
			const first = createField({ id: 'first', maxlength: 5 });
			const second = createField({ id: 'second', maxlength: 8 });
			const element = await createElement({
				for: first.id,
				overrun: 'true',
			});

			element.htmlFor = second.id;
			await settle();

			expect(first.getAttribute('maxlength')).toBe('5');
			expect(first.hasAttribute('data-maxlength')).toBe(false);
			expect(second.hasAttribute('maxlength')).toBe(false);
			expect(second.getAttribute('data-maxlength')).toBe('8');

			element.remove();
			expect(second.getAttribute('maxlength')).toBe('8');
			expect(second.hasAttribute('data-maxlength')).toBe(false);
		});

		it('adopts a new maxlength set while overrun is active', async () => {
			const field = createField({ maxlength: 5, value: '123456' });
			const element = await createElement({
				for: field.id,
				overrun: 'true',
			});

			field.setAttribute('maxlength', '10');
			await settle();

			expect(field.hasAttribute('maxlength')).toBe(false);
			expect(field.getAttribute('data-maxlength')).toBe('10');
			expect(element.textContent).toBe('4');
		});

		it('marks the field aria-invalid only while its value is over the maximum', async () => {
			const field = createField({ maxlength: 5, value: '123456' });
			await createElement({ for: field.id, overrun: 'true' });

			expect(field.getAttribute('aria-invalid')).toBe('true');

			field.value = '12345';
			field.dispatchEvent(new Event('input'));
			expect(field.hasAttribute('aria-invalid')).toBe(false);

			field.value = '1234567';
			field.dispatchEvent(new Event('input'));
			expect(field.getAttribute('aria-invalid')).toBe('true');
		});

		it('does not mark an overlength field invalid when overrun is disabled', async () => {
			const field = createField({ maxlength: 5, value: '123456' });
			await createElement({ for: field.id });

			expect(field.hasAttribute('aria-invalid')).toBe(false);
		});

		it.each(['false', 'grammar'])(
			'restores an authored aria-invalid value of %s',
			async (originalValue) => {
				const field = createField({
					maxlength: 5,
					value: '123456',
				});
				field.setAttribute('aria-invalid', originalValue);
				const element = await createElement({
					for: field.id,
					overrun: 'true',
				});

				expect(field.getAttribute('aria-invalid')).toBe('true');

				element.overrun = false;
				await settle();
				expect(field.getAttribute('aria-invalid')).toBe(originalValue);
			},
		);

		it('restores aria-invalid when disconnected while over the maximum', async () => {
			const field = createField({ maxlength: 5, value: '123456' });
			const element = await createElement({
				for: field.id,
				overrun: 'true',
			});

			element.remove();

			expect(field.hasAttribute('aria-invalid')).toBe(false);
		});
	});

	describe('dynamic lifecycle', () => {
		it('boots when a referenced field is inserted later', async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const element = await createElement({ for: 'late-field' });
			expect(element.hasAttribute('data-ready')).toBe(false);

			const field = createField({ id: 'late-field' });
			await settle();

			expect(element.hasAttribute('data-ready')).toBe(true);
			expect(field.getAttribute('aria-describedby')).toBe(element.id);
		});

		it('reacts to field maxlength and eligibility changes', async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const field = createField({ tag: 'input', maxlength: 10 });
			const element = await createElement({ for: field.id });

			field.setAttribute('maxlength', '5');
			await settle();
			expect(element.textContent).toBe('5');

			field.type = 'number';
			await settle();
			expect(element.hasAttribute('data-ready')).toBe(false);
			expect(field.hasAttribute('aria-describedby')).toBe(false);
		});

		it('follows target ID changes and recovers when the ref is updated', async () => {
			const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
			const field = createField();
			const element = await createElement({ for: field.id });

			field.id = 'renamed';
			await settle();
			expect(element.hasAttribute('data-ready')).toBe(false);

			element.htmlFor = 'renamed';
			await settle();
			expect(element.hasAttribute('data-ready')).toBe(true);
		});

		it('refreshes replaced authored hooks', async () => {
			const field = createField({ maxlength: 10, value: 'abc' });
			const element = document.createElement('form-maxlength-progress');
			element.setAttribute('for', field.id);
			element.setAttribute('counter', 'remaining');
			element.innerHTML = '<span id="remaining">First</span>';
			document.body.append(element);
			await settle();

			const first = element.firstElementChild;
			const replacement = document.createElement('strong');
			replacement.id = 'remaining';
			replacement.textContent = 'Second';
			first.replaceWith(replacement);
			await settle();

			expect(first.textContent).toBe('First');
			expect(replacement.textContent).toBe('7');
			expect(replacement.getAttribute('aria-label')).toBe(
				'7 characters remaining',
			);
		});

		it('does not duplicate generated UI, descriptions, or listeners after reconnect', async () => {
			const field = createField();
			const element = await createElement({ for: field.id });

			element.remove();
			document.body.append(element);
			await settle();
			field.dispatchEvent(new Event('input'));

			expect(
				element.querySelectorAll(
					'[data-form-maxlength-progress-generated-counter]',
				),
			).toHaveLength(1);
			expect(
				field
					.getAttribute('aria-describedby')
					.split(/\s+/)
					.filter((id) => id === element.id),
			).toHaveLength(1);
		});
	});
});
