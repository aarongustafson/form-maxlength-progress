import { FormMaxlengthProgressElement } from './form-maxlength-progress.js';

export function defineFormMaxlengthProgress(
	tagName = 'form-maxlength-progress',
) {
	const hasWindow = typeof window !== 'undefined';
	const registry = hasWindow ? window.customElements : undefined;

	if (!registry || typeof registry.define !== 'function') {
		return false;
	}

	if (!registry.get(tagName)) {
		registry.define(tagName, FormMaxlengthProgressElement);
	}

	return true;
}

defineFormMaxlengthProgress();
