# form-maxlength-progress Web Component

[![npm version](https://img.shields.io/npm/v/@aarongustafson/form-maxlength-progress.svg)](https://www.npmjs.com/package/@aarongustafson/form-maxlength-progress) [![Build Status](https://img.shields.io/github/actions/workflow/status/aarongustafson/form-maxlength-progress/ci.yml?branch=main)](https://github.com/aarongustafson/form-maxlength-progress/actions)

`<form-maxlength-progress>` shows a user’s progress toward a field’s
`maxlength`. It sits separately from the field, keeps authored UI in Light DOM,
exposes a styleable `proximity` state, and can optionally allow text to overrun
the defined maximum.

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

The package also provides a guarded definition helper:

```javascript
import { defineFormMaxlengthProgress } from '@aarongustafson/form-maxlength-progress/define.js';

defineFormMaxlengthProgress();
```

## Basic use

Associate the component with an eligible field through `for`. The field needs
a unique ID and a non-negative integer `maxlength`.

```html
<label for="message">Message</label>
<textarea id="message" maxlength="280"></textarea>
<form-maxlength-progress for="message"></form-maxlength-progress>
```

Eligible fields are `<textarea>` and `<input>` elements with one of these
types: `text`, `search`, `tel`, `url`, `email`, or `password`.

When the field is empty, the component displays its maximum using the
`{maxlength} characters allowed` template by default. Once the field has
content, it displays the remaining count.

## Demos

- [Live demo](https://aarongustafson.github.io/form-maxlength-progress/demo/)
  ([source](./demo/index.html))
- [ESM CDN demo](https://aarongustafson.github.io/form-maxlength-progress/demo/esm.html)
- [Unpkg CDN demo](https://aarongustafson.github.io/form-maxlength-progress/demo/unpkg.html)

## Generated output and behavior

The component creates a hidden static description and associates it with the
field via `aria-describedby`. The changing generated counter is `aria-hidden`
to avoid announcements on every keystroke.

The simplified, rendered Light DOM looks like this (though generated IDs vary):

```html
<form-maxlength-progress
  for="message"
  id="form-maxlength-progress-1"
  proximity="far"
>
  <span data-form-maxlength-progress-generated-counter
        aria-hidden="true">
    280 characters allowed
  </span>
  <span
    id="form-maxlength-progress-1-description"
    data-form-maxlength-progress-description
    hidden>
    280 characters allowed
    </span>
  <span
    data-form-maxlength-progress-status
    role="status"
    aria-live="polite"
    aria-atomic="true"
    >
    <!-- polite announcements will go here -->
  </span>
  <span data-form-maxlength-progress-alert role="alert" hidden>
    <!-- if a user hits the limit, the announcement will go here -->
  </span>
</form-maxlength-progress>
```

All generated UI remains in Light DOM and uses consistent `data-*` attributes to make styling easier.

## Authored counters and progress elements

If you want to control the counter markup, that’s an option too. You can use
`id` references to point the component to your custom counter element, a
native `<progress>` element, or both. This gives you the flexibility to change
the elements, add your own style hooks, rearrange the contents, and more.

```html
<label for="summary">Summary</label>
<input id="summary" maxlength="120" />

<form-maxlength-progress
  for="summary"
  counter="summary-count"
  progress="summary-progress">
  <strong id="summary-count"></strong>
  <progress id="summary-progress"></progress>
</form-maxlength-progress>
```

The component replaces the counter’s text with the numeric remaining value and
sets its `aria-label` to the complete accessible label. When a counter and
`<progress>` are both present, the component makes `<progress>` `aria-hidden`
to avoid duplicate semantics. A `<progress>`-only UI receives the accessible
label directly.

Authored markup stays in Light DOM and can be styled normally. If the component
disconnects or stops using an authored element, it restores that element’s
original text, ARIA attributes, and progress values.

To prevent authored counter or progress markup from appearing before the
component definition loads, include this rule in your global CSS:

```css
form-maxlength-progress:not(:defined) {
  display: none;
}
```

## Labels and localization

To customize the text the component shows, use `description` for the
empty-field state and `label` for the countdown state. `{maxlength}` is
available in both templates; `{remaining}` is available in count labels. For
grammatical variations, the component supports plural-category attributes
(e.g., `label-one`):

```html
<form-maxlength-progress
  for="message"
  description="{maxlength} characters allowed"
  description-one="{maxlength} character allowed"
  label="{remaining} characters left"
  label-one="{remaining} character left"
></form-maxlength-progress>
```

Plural selection uses `Intl.PluralRules` and the component’s inherited
language. The optional category attributes are:

- `description-zero`
- `description-one`
- `description-two`
- `description-few`
- `description-many`
- `label-zero`
- `label-one`
- `label-two`
- `label-few`
- `label-many`

Missing description categories fall back to `description`; missing count
categories fall back to `label`. Without custom values, the empty-field
defaults are “1 character allowed” and “X characters allowed,” and the count
defaults are “1 character remaining” and “X characters remaining.”

## Proximity states

The component maintains a `proximity` attribute for styling a user’s progress
toward the `maxlength`:

```css
form-maxlength-progress[proximity='close'] {
  color: darkorange;
}

form-maxlength-progress[proximity='target'],
form-maxlength-progress[proximity='overrun'] {
  color: crimson;
}
```

The default states are:

| State     | Range                               |
| --------- | ----------------------------------- |
| `far`     | 0% through less than 75%            |
| `close`   | 75% through less than 100%          |
| `target`  | Exactly 100%                        |
| `overrun` | Above 100%, when overrun is allowed |

Customize the stops with `proximity-values`:

```html
<form-maxlength-progress
  for="message"
  proximity-values="safe 0%, notice 50%, warning 80%, limit 100%, exceeded"
></form-maxlength-progress>
```

Custom stops follow these rules:

- The first percentage must be `0%`.
- Percentages must be strictly ascending and end at `100%`.
- Tokens must start with an ASCII letter and then contain only letters, numbers,
  `_`, or `-`.
- One final, optional token without a percentage may represent values above
  100%.
- If that final token is omitted and overrun is allowed, overrun keeps the
  `100%` token.
- The component rejects an invalid `proximity-values` token string as a whole,
  logs a warning, and uses the defaults.

## Allowing values beyond `maxlength`

Set `overrun="true"` to let the field’s value exceed `maxlength`:

```html
<textarea id="notes" maxlength="500"></textarea>
<form-maxlength-progress
  for="notes"
  overrun="true"
  overrun-label="{remaining} characters over the maximum."
  overrun-label-one="{remaining} character over the maximum."
></form-maxlength-progress>
```

While overrun is enabled, the component moves the field’s `maxlength` value to
`data-maxlength`. Authored numeric counters can become negative; the generated
counter uses the overrun label and a positive amount. A `<progress>` element
remains capped at 100%.

Overrun supports the same plural categories as `label` through
`overrun-label-zero`, `overrun-label-one`, `overrun-label-two`,
`overrun-label-few`, and `overrun-label-many`.

When the value exceeds the maximum, the component sets `aria-invalid="true"` on
the field. This communicates the invalid state to assistive technology and
provides a field-level styling hook:

```css
textarea[aria-invalid='true'] {
  border-color: crimson;
}
```

When the value returns within the limit, the component restores the field’s
original `aria-invalid` state. It also restores that state when the overrun
feature is disabled, the component is reassociated, or the component
disconnects.

`aria-invalid` doesn’t prevent form submission. The component doesn’t call
`setCustomValidity()`; applications that need blocking validation should manage
that behavior separately through custom validation logic.

## The limit remains in sync

If application code adjusts the `maxlength` attribute or `maxLength` property,
the component observes the reflected attribute and resets itself accordingly.

## Attributes and properties

| Attribute                  | Property                                    | Default                                       | Purpose                                           |
| -------------------------- | ------------------------------------------- | --------------------------------------------- | ------------------------------------------------- |
| `for`                      | `htmlFor`                                   | `""`                                          | Associated field ID reference                     |
| `counter`                  | `counter`                                   | `""`                                          | Authored counter descendant ID reference          |
| `progress`                 | `progress`                                  | `""`                                          | Authored `progress` descendant ID reference       |
| `description`              | `description`                               | `{maxlength} characters allowed`              | Empty-field and static field-description template |
| `description-{category}`   | `descriptionZero`, `descriptionOne`, etc.   | category fallback                             | Description plural-category templates             |
| `label`                    | `label`                                     | `{remaining} characters remaining`            | Normal `other` label template                     |
| `label-{category}`         | `labelZero`, `labelOne`, etc.               | category fallback                             | Normal plural-category templates                  |
| `proximity-values`         | `proximityValues`                           | `far 0%, close 75%, target 100%, overrun`     | Custom lower-bound stops                          |
| `proximity`                | `proximity` (read-only)                     | calculated                                    | Current style token                               |
| `overrun`                  | `overrun`                                   | `false`                                       | Enabled only by the exact string `true`           |
| `overrun-label`            | `overrunLabel`                              | `{remaining} characters over the max length.` | Overrun `other` template                          |
| `overrun-label-{category}` | `overrunLabelZero`, `overrunLabelOne`, etc. | category fallback                             | Overrun plural-category templates                 |
| `limit-reached-label`      | `limitReachedLabel`                         | `Character limit reached`                     | Alert text when the limit is reached              |
| `limit-exceeded-label`     | `limitExceededLabel`                        | `Character limit exceeded`                    | Alert text when overrun crosses the limit         |

The `overrun` property is boolean. Setting it writes `"true"` or `"false"` to
the attribute.

## Styling

The component defaults to `display: inline-block`, but you can assign your own
styles as needed. You can use its `proximity` attribute for state-based styles.
If you don’t bring your own markup, you can target the counter through its
`data-*` attribute:

```css
[data-form-maxlength-progress-generated-counter] {
  font-variant-numeric: tabular-nums;
}
```

### Styling hooks

All generated elements are in Light DOM. These `data-*` attributes and state
selectors are stable styling hooks:

| Selector                                                      | Element and state                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `[data-form-maxlength-progress-generated-counter]`            | Visible generated text, both the at-rest description and active countdown |
| `[data-form-maxlength-progress-description]`                  | Native-hidden static text referenced by the field’s `aria-describedby`    |
| `[data-form-maxlength-progress-status]`                       | Polite near-limit fallback used when `ariaNotify()` is unavailable        |
| `[data-form-maxlength-progress-alert]`                        | Reached/exceeded alert; `hidden` until active                             |
| `form-maxlength-progress[proximity='…']`                      | Component host at the current configured proximity stop                   |
| `textarea[aria-invalid='true']`, `input[aria-invalid='true']` | Associated overrun-enabled field while above its maximum                  |
| `textarea[data-maxlength]`, `input[data-maxlength]`           | Associated field while native `maxlength` is moved aside for overrun      |

For example:

```css
[data-form-maxlength-progress-generated-counter] {
  font-variant-numeric: tabular-nums;
}

form-maxlength-progress[proximity='close'] {
  color: darkorange;
}

form-maxlength-progress[proximity='target'],
form-maxlength-progress[proximity='overrun'] {
  color: crimson;
  font-weight: bold;
}

.maxlength-field:has(
    form-maxlength-progress:is([proximity='target'], [proximity='overrun'])
  )
  :is(textarea, input) {
  border-width: 3px;
}
```

The description must remain hidden because it supplies the field’s static
assistive-technology text. The component visually hides the status and alert
through their data attributes. Use those hooks to make them visible, but
respect `[hidden]` so inactive alerts aren’t shown.

Reminder: The component hides authored contents after upgrade until all
references validate. To prevent those elements from flashing before the custom
element definition loads, add:

```css
form-maxlength-progress:not(:defined) {
  display: none;
}
```


## Accessibility details

The component includes these accessibility considerations:

- Counter updates are not spoken on every update. Only the major milestones are
  announced.
- The component communicates the maximum value through the field’s accessible
  description (using `aria-describedby`).
- The generated counter is `aria-hidden`; authored counters retain the
  accessible text and ARIA supplied by the component.
- Upon reaching the final 10 characters, the component sends a polite
  notification. It uses `ariaNotify()` with a `role="status"` fallback.
- Reaching the limit triggers an alert. With overrun enabled,
  crossing the limit triggers an exceeded alert instead.
- Paste, autofill-style input, deletion and re-entry, and
  [IME-based composition](https://en.wikipedia.org/wiki/Input_method) are all
  supported; jumps to or beyond the limit don’t send the near-limit warning.
- Initialization and configuration changes don’t produce notifications.

Use `limit-reached-label` and `limit-exceeded-label` to localize the alert text.
The remaining-count `label` supplies the localized near-limit notification.

Color alone shouldn’t communicate proximity. Pair it with text and a structural
cue, and preserve the associated field’s focus outline.

## Invalid configuration

Invalid ID references, duplicate IDs, ineligible fields, invalid `maxlength`
values, and invalid proximity configuration log warnings to the console.

## Browser support

The package uses Custom Elements, Shadow DOM, ES modules, `MutationObserver`,
and `Intl.PluralRules`. Use appropriate polyfills when targeting browsers
without those APIs.

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
