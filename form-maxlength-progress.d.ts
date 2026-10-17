/**
 * Displays progress toward an associated field's maxlength.
 *
 * @element form-maxlength-progress
 */
export type FormMaxlengthProgressNotificationState =
	| 'near-limit'
	| 'limit-reached'
	| 'limit-exceeded';

export type FormMaxlengthProgressNotificationPriority = 'normal' | 'high';

export interface FormMaxlengthProgressNotificationDetail {
	state: FormMaxlengthProgressNotificationState;
	message: string;
	priority: FormMaxlengthProgressNotificationPriority;
	remaining: number;
	maximum: number;
	field: HTMLInputElement | HTMLTextAreaElement;
}

export type FormMaxlengthProgressNotificationEvent =
	CustomEvent<FormMaxlengthProgressNotificationDetail>;

export class FormMaxlengthProgressElement extends HTMLElement {
	static readonly observedAttributes: string[];

	constructor();
	connectedCallback(): void;
	disconnectedCallback(): void;
	attributeChangedCallback(
		name: string,
		oldValue: string | null,
		newValue: string | null,
	): void;

	get htmlFor(): string;
	set htmlFor(value: string | null | undefined);

	get counter(): string;
	set counter(value: string | null | undefined);

	get progress(): string;
	set progress(value: string | null | undefined);

	get proximityValues(): string;
	set proximityValues(value: string | null | undefined);

	/** Current component-managed proximity token. */
	get proximity(): string;

	get description(): string;
	set description(value: string | null | undefined);

	get overrun(): boolean;
	set overrun(value: boolean);

	get label(): string;
	set label(value: string | null | undefined);
	get labelZero(): string | null;
	set labelZero(value: string | null | undefined);
	get labelOne(): string | null;
	set labelOne(value: string | null | undefined);
	get labelTwo(): string | null;
	set labelTwo(value: string | null | undefined);
	get labelFew(): string | null;
	set labelFew(value: string | null | undefined);
	get labelMany(): string | null;
	set labelMany(value: string | null | undefined);

	get overrunLabel(): string;
	set overrunLabel(value: string | null | undefined);
	get overrunLabelZero(): string | null;
	set overrunLabelZero(value: string | null | undefined);
	get overrunLabelOne(): string | null;
	set overrunLabelOne(value: string | null | undefined);
	get overrunLabelTwo(): string | null;
	set overrunLabelTwo(value: string | null | undefined);
	get overrunLabelFew(): string | null;
	set overrunLabelFew(value: string | null | undefined);
	get overrunLabelMany(): string | null;
	set overrunLabelMany(value: string | null | undefined);

	get limitReachedLabel(): string;
	set limitReachedLabel(value: string | null | undefined);
	get limitExceededLabel(): string;
	set limitExceededLabel(value: string | null | undefined);

	render(): void;
}

declare global {
	interface HTMLElementTagNameMap {
		'form-maxlength-progress': FormMaxlengthProgressElement;
	}

	interface GlobalEventHandlersEventMap {
		'form-maxlength-progress:notification': FormMaxlengthProgressNotificationEvent;
	}
}

export {};
