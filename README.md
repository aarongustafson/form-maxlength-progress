# form-maxlength-progress Web Component

[![npm version](https://img.shields.io/npm/v/@aarongustafson/form-maxlength-progress.svg)](https://www.npmjs.com/package/@aarongustafson/form-maxlength-progress) [![Build Status](https://img.shields.io/github/actions/workflow/status/aarongustafson/form-maxlength-progress/ci.yml?branch=main)](https://github.com/aarongustafson/form-maxlength-progress/actions)

Indicates a user’s progress toward the limit of a field’s `maxlength` value.

The component sits separately from its field, keeps authored UI in Light DOM, exposes a styleable `proximity` state, and can optionally allow text beyond the native maximum.

## Demo

[Live Demo](https://aarongustafson.github.io/form-maxlength-progress/demo/) ([Source](./demo/index.html))

Additional CDN checks:

- [ESM CDN Demo](https://aarongustafson.github.io/form-maxlength-progress/demo/esm.html)
- [Unpkg CDN Demo](https://aarongustafson.github.io/form-maxlength-progress/demo/unpkg.html)

## Installation

```bash
npm install @aarongustafson/form-maxlength-progress
```

Import the package to define `<form-maxlength-progress>` automatically:

```javascript
import '@aarongustafson/form-maxlength-progress';
```

To register the class under another valid custom-element name:

```javascript
import { FormMaxlengthProgressElement } from '@aarongustafson/form-maxlength-progress/form-maxlength-progress.js';

customElements.define('my-maxlength-progress', FormMaxlengthProgressElement);
```

The guarded definition helper is also available:

```javascript
import { defineFormMaxlengthProgress } from '@aarongustafson/form-maxlength-progress/define.js';

defineFormMaxlengthProgress();
```

## Basic usage

Associate the component to an eligible field using `for`. The field must have a unique ID and a non-negative integer `maxlength`.

```html
<label for="message">Message</label>
<textarea id="message" maxlength="280"></textarea>
<form-maxlength-progress for="message"></form-maxlength-progress>
```

The component injects a numeric Light DOM counter, generates its own ID when needed, and appends that ID to the field's existing `aria-describedby` tokens.

The simplified rendered Light DOM looks like this (generated IDs vary):

```html
<form-maxlength-progress
  for="message"
  id="form-maxlength-progress-1"
  proximity="far"
>
  <span
    data-form-maxlength-progress-generated-counter
    aria-label="280 characters remaining"
  >280</span>
</form-maxlength-progress>
```

The generated counter data attribute is a supported styling hook:

```css
[data-form-maxlength-progress-generated-counter] {
  font-variant-numeric: tabular-nums;
}
```

Style the host to affect the complete counter, and use its `proximity`
attribute for state-based styles. Generated host IDs and other runtime
bookkeeping are implementation details.

Eligible fields are `<textarea>` and these `<input>` types: `text`, `search`, `tel`, `url`, `email`, and `password`.

## Authored Light DOM

Use host-side ID references to identify a custom counter and/or native `<progress>` element. References must resolve to one unique descendant of the component.

```html
<label for="summary">Summary</label>
<input id="summary" maxlength="120" />

<form-maxlength-progress
  for="summary"
  counter="summary-count"
  progress="summary-progress"
>
  <strong id="summary-count"></strong>
  <progress id="summary-progress"></progress>
</form-maxlength-progress>
```

The counter's text becomes the numeric remaining value and its `aria-label` receives the complete accessible label. When a counter and `<progress>` are both present, the `<progress>` is `aria-hidden` to avoid duplicate semantics. A `<progress>`-only UI receives the accessible label directly.

Authored markup stays in Light DOM and can be styled normally. Its original text, ARIA attributes, and progress values are restored if the component disconnects or stops using those elements.

To prevent authored counter or progress markup from appearing before the
component definition loads, include this in your global CSS:

```css
form-maxlength-progress:not(:defined) {
  display: none;
}
```

## Labels and localization

Use `label` to set the default accessible wording, and put `{remaining}`
wherever the current number should appear. Use `label-one` when the singular
wording differs:

```html
<form-maxlength-progress
  for="message"
  label="{remaining} characters available"
  label-one="{remaining} character available"
></form-maxlength-progress>
```

Plural selection uses `Intl.PluralRules` and the component's inherited language. The optional category attributes are:

- `label-zero`
- `label-one`
- `label-two`
- `label-few`
- `label-many`

Missing categories fall back to `label`. Without custom labels, the defaults are “1 character remaining” and “X characters remaining.”

The component intentionally does not create a live region or set `aria-atomic`. The current text is available through `aria-describedby` without forcing a potentially noisy announcement after every keystroke.

## Proximity states

The component maintains a `proximity` attribute for styling progress toward the `maxlength` value:

```css
form-maxlength-progress[proximity='close'] {
  color: darkorange;
}

form-maxlength-progress[proximity='target'],
form-maxlength-progress[proximity='overrun'] {
  color: crimson;
}
```

Defaults:

- `far`: 0% through less than 75%
- `close`: 75% through less than 100%
- `target`: exactly 100%
- `overrun`: above 100% (if overrun is allowed)

You can customize the stops with `proximity-values`:

```html
<form-maxlength-progress
  for="message"
  proximity-values="safe 0%, notice 50%, warning 80%, limit 100%, exceeded"
></form-maxlength-progress>
```

Rules:

- The first percentage must be `0%`.
- Percentages must be strictly ascending and end at `100%`.
- Tokens must start with an ASCII letter and then contain only letters, numbers, `_`, or `-`.
- One final, optional token without a percentage may represent values above 100%.
- If that final token is omitted and overrun is allowed, overrun keeps the `100%` token.
- Any invalid custom value is rejected as a whole, logs a warning, and uses the defaults.

## Allowing overrun

Adding `overrun="true"` to `<form-maxlength-progress>` enables values to overrun the maxlength:

```html
<textarea id="notes" maxlength="500"></textarea>
<form-maxlength-progress
  for="notes"
  overrun="true"
  overrun-label="{remaining} characters over the maximum."
  overrun-label-one="{remaining} character over the maximum."
></form-maxlength-progress>
```

While enabled, the component moves the field's `maxlength` value to `data-maxlength`, allowing the visible remaining count to become negative. Progress remains capped at 100%, and accessible labels use the positive amount over the limit.

Overrun supports the same plural categories through `overrun-label-zero`, `overrun-label-one`, `overrun-label-two`, `overrun-label-few`, and `overrun-label-many`.

When the value exceeds the maximum, the component sets
`aria-invalid="true"` on the field. This communicates the invalid state to
assistive technology and provides a field-level styling hook:

```css
textarea[aria-invalid='true'] {
  border-color: crimson;
}
```

When the value returns within the limit, the component restores the field's
original `aria-invalid` state. It also restores that state when overrun is
disabled, the component is reassociated, or it disconnects.

`aria-invalid` does not prevent form submission. The component does not call
`setCustomValidity()`; applications that need blocking validation should add
that behavior separately.

The enhancement is reversible. `overrun="false"`, reassociation, or disconnection restores `maxlength` and any pre-existing `data-maxlength` value.

## Attributes and properties

| Attribute | Property | Default | Purpose |
| --- | --- | --- | --- |
| `for` | `htmlFor` | `""` | Associated field ID reference |
| `counter` | `counter` | `""` | Authored counter descendant ID reference |
| `progress` | `progress` | `""` | Authored `progress` descendant ID reference |
| `label` | `label` | `{remaining} characters remaining` | Normal `other` label template |
| `label-{category}` | `labelZero`, `labelOne`, etc. | category fallback | Normal plural-category templates |
| `proximity-values` | `proximityValues` | `far 0%, close 75%, target 100%, overrun` | Custom lower-bound stops |
| `proximity` | `proximity` (read-only) | calculated | Current style token |
| `overrun` | `overrun` | `false` | Enabled only by the exact string `true` |
| `overrun-label` | `overrunLabel` | `{remaining} characters over the max length.` | Overrun `other` template |
| `overrun-label-{category}` | `overrunLabelZero`, `overrunLabelOne`, etc. | category fallback | Overrun plural-category templates |

The `overrun` property is boolean. Setting it writes `"true"` or `"false"` to the attribute.

## Styling and initial visibility

The ready component defaults to `display: inline-block`; author CSS can override it. `[hidden]` always uses `display: none`.

Component JavaScript hides authored contents after upgrade until all references validate. To prevent a flash before the custom element definition loads, add:

```css
form-maxlength-progress:not(:defined) {
  display: none;
}
```

Invalid ID references, duplicate IDs, ineligible fields, invalid maxlength values, and invalid proximity configuration log warnings to the console.

## Browser support

The package uses Custom Elements, Shadow DOM, ES modules, `MutationObserver`, and `Intl.PluralRules`. Use appropriate polyfills when targeting browsers without those APIs.

## Development

```bash
npm install
npm run test:run
npm run test:coverage
npm run lint
npm run format
```

## License

MIT © [Aaron Gustafson](https://www.aaron-gustafson.com/)
