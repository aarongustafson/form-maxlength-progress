const ELIGIBLE_INPUT_TYPES = new Set([
	'email',
	'password',
	'search',
	'tel',
	'text',
	'url',
]);

const PLURAL_CATEGORIES = ['zero', 'one', 'two', 'few', 'many'];
const NEAR_LIMIT_THRESHOLD = 10;
const DEFAULT_PROXIMITY_STOPS = {
	stops: [
		{ token: 'far', percentage: 0 },
		{ token: 'close', percentage: 75 },
		{ token: 'target', percentage: 100 },
	],
	overrun: 'overrun',
};
let generatedId = 0;

/**
 * Indicates a user’s progress toward the limit of a field’s maxlength value.
 *
 * @element form-maxlength-progress
 * @attr {string} for - ID reference for the associated field.
 * @attr {string} counter - ID reference for an authored Light DOM counter.
 * @attr {string} progress - ID reference for an authored Light DOM progress element.
 * @attr {string} description - Visible empty-field and static field description template.
 * @attr {string} label - Accessible label template for normal counts.
 * @attr {string} proximity-values - Comma-separated proximity stops.
 * @attr {string} proximity - Current proximity token (component managed).
 * @attr {string} overrun - Enables overrun only when its value is "true".
 * @attr {string} overrun-label - Accessible label template for overrun counts.
 * @attr {string} limit-reached-label - Alert announced when the limit is reached.
 * @attr {string} limit-exceeded-label - Alert announced when the limit is exceeded.
 * @slot - Authored counter, progress, and surrounding content.
 */
export class FormMaxlengthProgressElement extends HTMLElement {
	static get observedAttributes() {
		return [
			'for',
			'counter',
			'progress',
			'proximity-values',
			'description',
			...PLURAL_CATEGORIES.map((category) => `description-${category}`),
			'overrun',
			'overrun-label',
			...PLURAL_CATEGORIES.map((category) => `overrun-label-${category}`),
			'limit-reached-label',
			'limit-exceeded-label',
			'label',
			...PLURAL_CATEGORIES.map((category) => `label-${category}`),
		];
	}

	constructor() {
		super();
		this.attachShadow({ mode: 'open' });
		this._field = null;
		this._counter = null;
		this._progress = null;
		this._counterState = null;
		this._progressState = null;
		this._proximityConfigValue = undefined;
		this._proximityConfig = DEFAULT_PROXIMITY_STOPS;
		this._maxlengthState = null;
		this._ariaInvalidState = null;
		this._maximum = null;
		this._refreshScheduled = false;
		this._descriptionElement = null;
		this._statusRegion = null;
		this._alertRegion = null;
		this._nearWarningAnnounced = false;
		this._limitAlertAnnounced = false;
		this._exceededAlertAnnounced = false;
		this._isComposing = false;
		this._handleInput = this._handleInput.bind(this);
		this._handleChange = this._handleChange.bind(this);
		this._handleCompositionStart = this._handleCompositionStart.bind(this);
		this._handleCompositionEnd = this._handleCompositionEnd.bind(this);
		this._handleMutations = this._handleMutations.bind(this);
		this._mutationObserver = new MutationObserver(this._handleMutations);
		this.render();
	}

	connectedCallback() {
		for (const property of [
			'htmlFor',
			'counter',
			'progress',
			'proximityValues',
			'description',
			...PLURAL_CATEGORIES.map(
				(category) =>
					`description${category[0].toUpperCase()}${category.slice(1)}`,
			),
			'overrun',
			'overrunLabel',
			...PLURAL_CATEGORIES.map(
				(category) =>
					`overrunLabel${category[0].toUpperCase()}${category.slice(1)}`,
			),
			'label',
			...PLURAL_CATEGORIES.map(
				(category) =>
					`label${category[0].toUpperCase()}${category.slice(1)}`,
			),
			'limitReachedLabel',
			'limitExceededLabel',
		]) {
			this._upgradeProperty(property);
		}
		this._mutationObserver.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['id', 'maxlength', 'type'],
			childList: true,
			subtree: true,
		});
		this._scheduleRefresh();
	}

	disconnectedCallback() {
		this._mutationObserver.disconnect();
		this._teardownField();
	}

	attributeChangedCallback(name, oldValue, newValue) {
		if (oldValue === newValue || !this.isConnected) {
			return;
		}

		this._scheduleRefresh();
	}

	get htmlFor() {
		return this.getAttribute('for') || '';
	}

	set htmlFor(value) {
		this._reflectStringAttribute('for', value);
	}

	get counter() {
		return this.getAttribute('counter') || '';
	}

	set counter(value) {
		this._reflectStringAttribute('counter', value);
	}

	get progress() {
		return this.getAttribute('progress') || '';
	}

	set progress(value) {
		this._reflectStringAttribute('progress', value);
	}

	get proximityValues() {
		return this.getAttribute('proximity-values') || '';
	}

	set proximityValues(value) {
		this._reflectStringAttribute('proximity-values', value);
	}

	get proximity() {
		return this.getAttribute('proximity') || '';
	}

	get overrun() {
		return this.getAttribute('overrun') === 'true';
	}

	set overrun(value) {
		this.setAttribute('overrun', value === true ? 'true' : 'false');
	}

	get description() {
		return (
			this.getAttribute('description') || '{maxlength} characters allowed'
		);
	}

	set description(value) {
		this._reflectStringAttribute('description', value);
	}

	get descriptionZero() {
		return this.getAttribute('description-zero');
	}

	set descriptionZero(value) {
		this._reflectStringAttribute('description-zero', value);
	}

	get descriptionOne() {
		return this.getAttribute('description-one');
	}

	set descriptionOne(value) {
		this._reflectStringAttribute('description-one', value);
	}

	get descriptionTwo() {
		return this.getAttribute('description-two');
	}

	set descriptionTwo(value) {
		this._reflectStringAttribute('description-two', value);
	}

	get descriptionFew() {
		return this.getAttribute('description-few');
	}

	set descriptionFew(value) {
		this._reflectStringAttribute('description-few', value);
	}

	get descriptionMany() {
		return this.getAttribute('description-many');
	}

	set descriptionMany(value) {
		this._reflectStringAttribute('description-many', value);
	}

	get overrunLabel() {
		return (
			this.getAttribute('overrun-label') ||
			'{remaining} characters over the max length.'
		);
	}

	set overrunLabel(value) {
		this._reflectStringAttribute('overrun-label', value);
	}

	get overrunLabelZero() {
		return this.getAttribute('overrun-label-zero');
	}

	set overrunLabelZero(value) {
		this._reflectStringAttribute('overrun-label-zero', value);
	}

	get overrunLabelOne() {
		return this.getAttribute('overrun-label-one');
	}

	set overrunLabelOne(value) {
		this._reflectStringAttribute('overrun-label-one', value);
	}

	get overrunLabelTwo() {
		return this.getAttribute('overrun-label-two');
	}

	set overrunLabelTwo(value) {
		this._reflectStringAttribute('overrun-label-two', value);
	}

	get overrunLabelFew() {
		return this.getAttribute('overrun-label-few');
	}

	set overrunLabelFew(value) {
		this._reflectStringAttribute('overrun-label-few', value);
	}

	get overrunLabelMany() {
		return this.getAttribute('overrun-label-many');
	}

	set overrunLabelMany(value) {
		this._reflectStringAttribute('overrun-label-many', value);
	}

	get label() {
		return this.getAttribute('label') || '{remaining} characters remaining';
	}

	set label(value) {
		this._reflectStringAttribute('label', value);
	}

	get labelZero() {
		return this.getAttribute('label-zero');
	}

	set labelZero(value) {
		this._reflectStringAttribute('label-zero', value);
	}

	get labelOne() {
		return this.getAttribute('label-one');
	}

	set labelOne(value) {
		this._reflectStringAttribute('label-one', value);
	}

	get labelTwo() {
		return this.getAttribute('label-two');
	}

	set labelTwo(value) {
		this._reflectStringAttribute('label-two', value);
	}

	get labelFew() {
		return this.getAttribute('label-few');
	}

	set labelFew(value) {
		this._reflectStringAttribute('label-few', value);
	}

	get labelMany() {
		return this.getAttribute('label-many');
	}

	set labelMany(value) {
		this._reflectStringAttribute('label-many', value);
	}

	get limitReachedLabel() {
		return (
			this.getAttribute('limit-reached-label') ||
			'Character limit reached'
		);
	}

	set limitReachedLabel(value) {
		this._reflectStringAttribute('limit-reached-label', value);
	}

	get limitExceededLabel() {
		return (
			this.getAttribute('limit-exceeded-label') ||
			'Character limit exceeded'
		);
	}

	set limitExceededLabel(value) {
		this._reflectStringAttribute('limit-exceeded-label', value);
	}

	_upgradeProperty(property) {
		if (Object.prototype.hasOwnProperty.call(this, property)) {
			const value = this[property];
			delete this[property];
			this[property] = value;
		}
	}

	_reflectStringAttribute(name, value) {
		if (value === null || value === undefined || value === '') {
			this.removeAttribute(name);
		} else {
			this.setAttribute(name, String(value));
		}
	}

	_scheduleRefresh() {
		if (this._refreshScheduled) {
			return;
		}

		this._refreshScheduled = true;
		requestAnimationFrame(() => {
			this._refreshScheduled = false;
			if (this.isConnected) {
				this._refresh();
			}
		});
	}

	_handleMutations(records) {
		const hasRelevantMutation = records.some((record) => {
			if (record.type === 'attributes') {
				return true;
			}

			return [...record.addedNodes, ...record.removedNodes].some(
				(node) => node.nodeType === Node.ELEMENT_NODE,
			);
		});

		if (hasRelevantMutation) {
			this._refresh();
		}
	}

	_refresh() {
		const field = this._resolveField();
		if (!field) {
			this._teardownField();
			return;
		}

		if (field === this._field && !this.overrun) {
			this._restoreMaxlength();
		}

		if (
			field === this._field &&
			this._maxlengthState &&
			this.overrun &&
			field.hasAttribute('maxlength')
		) {
			const nextMaxlength = field.getAttribute('maxlength');
			if (
				!FormMaxlengthProgressElement._isValidMaxlength(nextMaxlength)
			) {
				this._warn(
					`The associated field has an invalid maxlength value "${nextMaxlength}".`,
				);
				this._teardownField();
				return;
			}
			this._maxlengthState.maxlength = nextMaxlength;
			field.setAttribute('data-maxlength', nextMaxlength);
			field.removeAttribute('maxlength');
		}

		const maxlength =
			field === this._field && this._maxlengthState
				? this._maxlengthState.maxlength
				: field.getAttribute('maxlength');
		if (maxlength === null) {
			this._teardownField();
			return;
		}
		if (!FormMaxlengthProgressElement._isValidMaxlength(maxlength)) {
			this._warn(
				`The associated field has an invalid maxlength value "${maxlength}".`,
			);
			this._teardownField();
			return;
		}

		const counter = this.counter
			? this._resolveHook('counter', this.counter)
			: null;
		if (this.counter && !counter) {
			this._teardownField();
			return;
		}

		const progress = this.progress
			? this._resolveHook('progress', this.progress, HTMLProgressElement)
			: null;
		if (this.progress && !progress) {
			this._teardownField();
			return;
		}

		if (field !== this._field) {
			this._teardownField();
			this._field = field;
			this._field.addEventListener('input', this._handleInput);
			this._field.addEventListener('change', this._handleChange);
			this._field.addEventListener(
				'compositionstart',
				this._handleCompositionStart,
			);
			this._field.addEventListener(
				'compositionend',
				this._handleCompositionEnd,
			);
		}

		this._maximum = Number(maxlength);
		if (this.overrun) {
			this._enableOverrun(maxlength);
		}

		this._setHooks(counter, progress);

		if (!this.id) {
			do {
				generatedId += 1;
				this.id = `form-maxlength-progress-${generatedId}`;
			} while (
				FormMaxlengthProgressElement._elementsWithId(this.id).length > 1
			);
		}

		this._ensureSupportElements();
		const descriptions = new Set(
			(field.getAttribute('aria-describedby') || '')
				.split(/\s+/)
				.filter(Boolean),
		);
		descriptions.add(this._descriptionElement.id);
		field.setAttribute('aria-describedby', [...descriptions].join(' '));
		this._update({ announce: false });
		this.setAttribute('data-ready', '');
	}

	_ensureSupportElements() {
		if (!this._descriptionElement) {
			this._descriptionElement = document.createElement('span');
			this._descriptionElement.id = this._createSupportId('description');
			this._descriptionElement.setAttribute(
				'data-form-maxlength-progress-description',
				'',
			);
			this._descriptionElement.className =
				'form-maxlength-progress-visually-hidden';
			this.append(this._descriptionElement);
		}

		if (!this._statusRegion) {
			this._statusRegion = document.createElement('span');
			this._statusRegion.setAttribute('role', 'status');
			this._statusRegion.setAttribute('aria-live', 'polite');
			this._statusRegion.setAttribute('aria-atomic', 'true');
			this._statusRegion.setAttribute(
				'data-form-maxlength-progress-status',
				'',
			);
			this._statusRegion.className =
				'form-maxlength-progress-visually-hidden';
			this.append(this._statusRegion);
		}

		if (!this._alertRegion) {
			this._alertRegion = document.createElement('span');
			this._alertRegion.setAttribute('role', 'alert');
			this._alertRegion.setAttribute(
				'data-form-maxlength-progress-alert',
				'',
			);
			this._alertRegion.className =
				'form-maxlength-progress-visually-hidden';
			this._alertRegion.hidden = true;
			this.append(this._alertRegion);
		}
	}

	_createSupportId(suffix) {
		const base = `${this.id}-${suffix}`;
		let id = base;
		let index = 1;
		while (document.getElementById(id)) {
			index += 1;
			id = `${base}-${index}`;
		}
		return id;
	}

	_ensureCounter() {
		if (this._counter?.isConnected) {
			return;
		}

		this._counter = document.createElement('span');
		this._counter.setAttribute(
			'data-form-maxlength-progress-generated-counter',
			'',
		);
		this.append(this._counter);
	}

	_resolveHook(name, id, expectedType = null) {
		const matches = FormMaxlengthProgressElement._elementsWithId(id);
		if (matches.length === 0) {
			this._warn(`The "${name}" ID reference "${id}" does not exist.`);
			return null;
		}
		if (matches.length > 1) {
			this._warn(`The "${name}" ID reference "${id}" is duplicated.`);
			return null;
		}

		const [element] = matches;
		if (!this.contains(element)) {
			this._warn(
				`The "${name}" ID reference "${id}" is not a descendant.`,
			);
			return null;
		}
		if (expectedType && !(element instanceof expectedType)) {
			this._warn(
				`The "${name}" ID reference "${id}" must reference a <progress> element.`,
			);
			return null;
		}

		return element;
	}

	_setHooks(counter, progress) {
		const hasMatchingGeneratedCounter =
			!counter &&
			!progress &&
			this._counter?.hasAttribute(
				'data-form-maxlength-progress-generated-counter',
			);
		if (
			(counter === this._counter || hasMatchingGeneratedCounter) &&
			progress === this._progress &&
			(this._counter || this._progress)
		) {
			return;
		}

		this._restoreHooks();

		if (counter) {
			this._counter = counter;
			this._counterState = {
				text: counter.textContent,
				ariaLabel: FormMaxlengthProgressElement._attributeState(
					counter,
					'aria-label',
				),
			};
		} else if (!progress) {
			this._ensureCounter();
		}

		if (progress) {
			this._progress = progress;
			this._progressState = {
				max: FormMaxlengthProgressElement._attributeState(
					progress,
					'max',
				),
				value: FormMaxlengthProgressElement._attributeState(
					progress,
					'value',
				),
				ariaLabel: FormMaxlengthProgressElement._attributeState(
					progress,
					'aria-label',
				),
				ariaHidden: FormMaxlengthProgressElement._attributeState(
					progress,
					'aria-hidden',
				),
			};
		}
	}

	_handleInput(event) {
		this._update({ announce: !this._isComposing && !event.isComposing });
	}

	_handleChange() {
		this._update({ announce: !this._isComposing });
	}

	_handleCompositionStart() {
		this._isComposing = true;
	}

	_handleCompositionEnd() {
		this._isComposing = false;
		this._update({ announce: true });
	}

	_update({ announce = false } = {}) {
		if (!this._field) {
			return;
		}

		const maximum = this._maximum;
		const remaining = maximum - this._field.value.length;
		const isEmpty = this._field.value.length === 0;
		const label = isEmpty
			? this._formatDescription()
			: this._formatLabel(remaining);
		this._syncAriaInvalid(this.overrun && remaining < 0);
		this._descriptionElement.textContent = this._formatDescription();

		if (this._counter) {
			const isGenerated = this._counter.hasAttribute(
				'data-form-maxlength-progress-generated-counter',
			);
			this._counter.textContent = isGenerated ? label : String(remaining);
			this._counter.setAttribute('aria-label', label);
		}
		if (this._progress) {
			this._progress.max = maximum;
			this._progress.value = Math.min(this._field.value.length, maximum);
			if (this.counter) {
				this._progress.setAttribute('aria-hidden', 'true');
				this._progress.removeAttribute('aria-label');
			} else {
				this._progress.removeAttribute('aria-hidden');
				this._progress.setAttribute('aria-label', label);
			}
		}

		this.setAttribute(
			'proximity',
			this._getProximityToken(this._field.value.length, maximum),
		);

		this._syncAnnouncementState(remaining, announce);
	}

	_syncAnnouncementState(remaining, announce) {
		if (
			remaining > NEAR_LIMIT_THRESHOLD ||
			this._field.value.length === 0
		) {
			this._nearWarningAnnounced = false;
			if (this._statusRegion) {
				this._statusRegion.textContent = '';
			}
		}
		if (remaining > 0) {
			this._limitAlertAnnounced = false;
			this._hideAlert();
		}
		if (remaining >= 0) {
			this._exceededAlertAnnounced = false;
		}

		if (!announce) {
			return;
		}

		if (remaining < 0) {
			if (!this._exceededAlertAnnounced) {
				this._showAlert(this.limitExceededLabel);
				this._exceededAlertAnnounced = true;
			}
			return;
		}

		if (remaining === 0) {
			if (!this._limitAlertAnnounced) {
				this._showAlert(this.limitReachedLabel);
				this._limitAlertAnnounced = true;
			}
			return;
		}

		if (remaining <= NEAR_LIMIT_THRESHOLD && !this._nearWarningAnnounced) {
			this._notifyNearLimit(this._formatLabel(remaining));
			this._nearWarningAnnounced = true;
		}
	}

	_notifyNearLimit(message) {
		if (typeof this.ariaNotify === 'function') {
			this.ariaNotify(message, { priority: 'normal' });
			return;
		}

		this._statusRegion.textContent = message;
	}

	_showAlert(message) {
		this._alertRegion.textContent = message;
		this._alertRegion.hidden = false;
	}

	_hideAlert() {
		if (!this._alertRegion) {
			return;
		}
		this._alertRegion.hidden = true;
		this._alertRegion.textContent = '';
	}

	_syncAriaInvalid(isInvalid) {
		if (isInvalid) {
			if (!this._ariaInvalidState) {
				this._ariaInvalidState =
					FormMaxlengthProgressElement._attributeState(
						this._field,
						'aria-invalid',
					);
			}
			this._field.setAttribute('aria-invalid', 'true');
			return;
		}

		this._restoreAriaInvalid();
	}

	_restoreAriaInvalid() {
		if (!this._field || !this._ariaInvalidState) {
			return;
		}

		FormMaxlengthProgressElement._restoreAttribute(
			this._field,
			'aria-invalid',
			this._ariaInvalidState,
		);
		this._ariaInvalidState = null;
	}

	_getProximityToken(length, maximum) {
		const config = this._getProximityConfig();
		const percentage =
			maximum === 0
				? length === 0
					? 100
					: Number.POSITIVE_INFINITY
				: (length / maximum) * 100;

		if (percentage > 100 && config.overrun) {
			return config.overrun;
		}

		let selected = config.stops[0].token;
		for (const stop of config.stops) {
			if (percentage < stop.percentage) {
				break;
			}
			selected = stop.token;
		}
		return selected;
	}

	_getProximityConfig() {
		const value = this.proximityValues;
		if (value === this._proximityConfigValue) {
			return this._proximityConfig;
		}

		this._proximityConfigValue = value;
		if (!value) {
			this._proximityConfig = DEFAULT_PROXIMITY_STOPS;
			return this._proximityConfig;
		}

		const parsed =
			FormMaxlengthProgressElement._parseProximityValues(value);
		if (!parsed) {
			this._warn(`Invalid proximity-values "${value}"; using defaults.`);
			this._proximityConfig = DEFAULT_PROXIMITY_STOPS;
		} else {
			this._proximityConfig = parsed;
		}
		return this._proximityConfig;
	}

	static _parseProximityValues(value) {
		const parts = value.split(',').map((part) => part.trim());
		if (parts.length === 0 || parts.some((part) => !part)) {
			return null;
		}

		const stops = [];
		const tokens = new Set();
		let overrun = null;

		for (const [index, part] of parts.entries()) {
			const match = part.match(
				/^([A-Za-z][A-Za-z0-9_-]*)\s+(\d+(?:\.\d+)?)%$/,
			);
			if (!match) {
				if (
					index !== parts.length - 1 ||
					!/^[A-Za-z][A-Za-z0-9_-]*$/.test(part) ||
					tokens.has(part)
				) {
					return null;
				}
				overrun = part;
				tokens.add(part);
				continue;
			}

			const [, token, percentageText] = match;
			const percentage = Number(percentageText);
			if (
				tokens.has(token) ||
				percentage < 0 ||
				percentage > 100 ||
				(stops.length > 0 && percentage <= stops.at(-1).percentage)
			) {
				return null;
			}

			tokens.add(token);
			stops.push({ token, percentage });
		}

		if (
			stops.length === 0 ||
			stops[0].percentage !== 0 ||
			stops.at(-1).percentage !== 100
		) {
			return null;
		}

		return { stops, overrun };
	}

	_formatLabel(remaining) {
		const language =
			this.lang ||
			this.closest('[lang]')?.getAttribute('lang') ||
			document.documentElement.lang ||
			undefined;
		const isOverrun = this.overrun && remaining < 0;
		const amount = isOverrun ? Math.abs(remaining) : remaining;
		const prefix = isOverrun ? 'overrun-label' : 'label';
		const category = new Intl.PluralRules(language).select(amount);
		const categoryTemplate = this.getAttribute(`${prefix}-${category}`);
		let template = categoryTemplate || this.getAttribute(prefix);

		if (!template) {
			if (isOverrun) {
				template =
					category === 'one'
						? '{remaining} character over the max length.'
						: '{remaining} characters over the max length.';
			} else {
				template =
					category === 'one'
						? '{remaining} character remaining'
						: '{remaining} characters remaining';
			}
		}

		return template
			.split('{remaining}')
			.join(String(amount))
			.split('{maxlength}')
			.join(String(this._maximum));
	}

	_formatDescription() {
		const language =
			this.lang ||
			this.closest('[lang]')?.getAttribute('lang') ||
			document.documentElement.lang ||
			undefined;
		const category = new Intl.PluralRules(language).select(this._maximum);
		const categoryTemplate = this.getAttribute(`description-${category}`);
		let template = categoryTemplate || this.getAttribute('description');

		if (!template) {
			template =
				category === 'one'
					? '{maxlength} character allowed'
					: '{maxlength} characters allowed';
		}

		return template
			.split('{maxlength}')
			.join(String(this._maximum))
			.split('{remaining}')
			.join(String(this._maximum));
	}

	_enableOverrun(maxlength) {
		if (this._maxlengthState) {
			return;
		}

		this._maxlengthState = {
			maxlength,
			dataMaxlength: FormMaxlengthProgressElement._attributeState(
				this._field,
				'data-maxlength',
			),
		};
		this._field.setAttribute('data-maxlength', maxlength);
		this._field.removeAttribute('maxlength');
	}

	_restoreMaxlength() {
		if (!this._field || !this._maxlengthState) {
			return;
		}

		this._field.setAttribute('maxlength', this._maxlengthState.maxlength);
		FormMaxlengthProgressElement._restoreAttribute(
			this._field,
			'data-maxlength',
			this._maxlengthState.dataMaxlength,
		);
		this._maxlengthState = null;
	}

	_resolveField() {
		const id = this.htmlFor;
		if (!id) {
			return null;
		}

		const matches = FormMaxlengthProgressElement._elementsWithId(id);
		if (matches.length === 0) {
			this._warn(`The "for" ID reference "${id}" does not exist.`);
			return null;
		}
		if (matches.length > 1) {
			this._warn(`The "for" ID reference "${id}" is duplicated.`);
			return null;
		}

		const [field] = matches;
		if (!FormMaxlengthProgressElement._isEligibleField(field)) {
			this._warn(
				`The "for" ID reference "${id}" is not an eligible field.`,
			);
			return null;
		}

		return field;
	}

	static _elementsWithId(id) {
		return [...document.querySelectorAll('[id]')].filter(
			(element) => element.id === id,
		);
	}

	static _isEligibleField(element) {
		if (element instanceof HTMLTextAreaElement) {
			return true;
		}

		return (
			element instanceof HTMLInputElement &&
			ELIGIBLE_INPUT_TYPES.has(element.type)
		);
	}

	static _isValidMaxlength(value) {
		return /^\d+$/.test(value);
	}

	_teardownField() {
		this._field?.removeEventListener('input', this._handleInput);
		this._field?.removeEventListener('change', this._handleChange);
		this._field?.removeEventListener(
			'compositionstart',
			this._handleCompositionStart,
		);
		this._field?.removeEventListener(
			'compositionend',
			this._handleCompositionEnd,
		);
		this._restoreAriaInvalid();
		this._restoreMaxlength();

		if (this._field && this._descriptionElement) {
			const descriptions = (
				this._field.getAttribute('aria-describedby') || ''
			)
				.split(/\s+/)
				.filter((id) => id && id !== this._descriptionElement.id);

			if (descriptions.length > 0) {
				this._field.setAttribute(
					'aria-describedby',
					descriptions.join(' '),
				);
			} else {
				this._field.removeAttribute('aria-describedby');
			}
		}

		this._field = null;
		this._maximum = null;
		this._isComposing = false;
		this._nearWarningAnnounced = false;
		this._limitAlertAnnounced = false;
		this._exceededAlertAnnounced = false;
		this._restoreHooks();
		this._removeSupportElements();
		this.removeAttribute('proximity');
		this.removeAttribute('data-ready');
	}

	_removeSupportElements() {
		this._descriptionElement?.remove();
		this._statusRegion?.remove();
		this._alertRegion?.remove();
		this._descriptionElement = null;
		this._statusRegion = null;
		this._alertRegion = null;
	}

	_restoreHooks() {
		if (
			this._counter?.hasAttribute(
				'data-form-maxlength-progress-generated-counter',
			)
		) {
			this._counter.remove();
		} else if (this._counter && this._counterState) {
			this._counter.textContent = this._counterState.text;
			FormMaxlengthProgressElement._restoreAttribute(
				this._counter,
				'aria-label',
				this._counterState.ariaLabel,
			);
		}

		if (this._progress && this._progressState) {
			for (const [attribute, state] of [
				['max', this._progressState.max],
				['value', this._progressState.value],
				['aria-label', this._progressState.ariaLabel],
				['aria-hidden', this._progressState.ariaHidden],
			]) {
				FormMaxlengthProgressElement._restoreAttribute(
					this._progress,
					attribute,
					state,
				);
			}
		}

		this._counter = null;
		this._progress = null;
		this._counterState = null;
		this._progressState = null;
	}

	static _attributeState(element, name) {
		return {
			present: element.hasAttribute(name),
			value: element.getAttribute(name),
		};
	}

	static _restoreAttribute(element, name, state) {
		if (state.present) {
			element.setAttribute(name, state.value);
		} else {
			element.removeAttribute(name);
		}
	}

	_warn(message) {
		console.warn(`<${this.localName}> - ${message}`);
	}

	render() {
		this.shadowRoot.innerHTML = `
			<style>
				:host {
					display: none;
				}

				:host([data-ready]) {
					display: inline-block;
				}

				:host([hidden]) {
					display: none;
				}

				::slotted(.form-maxlength-progress-visually-hidden) {
					border: 0;
					clip: rect(0 0 0 0);
					clip-path: inset(50%);
					height: 1px;
					margin: -1px;
					overflow: hidden;
					padding: 0;
					position: absolute;
					white-space: nowrap;
					width: 1px;
				}
			</style>
			<slot></slot>
		`;
	}
}
