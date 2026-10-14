import { beforeAll } from 'vitest';
import { FormMaxlengthProgressElement } from '../form-maxlength-progress.js';

const elementName = 'form-maxlength-progress'.toLowerCase();

// Define the custom element before tests run
beforeAll(() => {
	if (!customElements.get(elementName)) {
		customElements.define(elementName, FormMaxlengthProgressElement);
	}

	// Make the class available globally for testing static methods
	globalThis.FormMaxlengthProgressElement = FormMaxlengthProgressElement;
});
