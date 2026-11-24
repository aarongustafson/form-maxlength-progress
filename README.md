# form-maxlength-progress Web Component

[![npm version](https://img.shields.io/npm/v/@aarongustafson/form-maxlength-progress.svg)](https://www.npmjs.com/package/@aarongustafson/form-maxlength-progress)
[![CI status](https://img.shields.io/github/actions/workflow/status/aarongustafson/form-maxlength-progress/ci.yml?branch=main&label=CI)](https://github.com/aarongustafson/form-maxlength-progress/actions/workflows/ci.yml)
[![Minified + gzipped size](https://img.shields.io/bundlejs/size/@aarongustafson/form-maxlength-progress?format=minzip&label=min%2Bgzip)](https://bundlejs.com/?q=@aarongustafson/form-maxlength-progress)
[![License](https://img.shields.io/npm/l/@aarongustafson/form-maxlength-progress)](https://github.com/aarongustafson/form-maxlength-progress/blob/main/LICENSE)
[![Type definitions](https://img.shields.io/npm/types/@aarongustafson/form-maxlength-progress)](https://github.com/aarongustafson/form-maxlength-progress/blob/main/form-maxlength-progress.d.ts)

`<form-maxlength-progress>` shows a user’s progress toward a field’s
`maxlength`, with a remaining count and milestone notifications. Without
JavaScript, the labeled field keeps native `maxlength` enforcement. After
upgrade, you can optionally allow values beyond that limit.

## Demos

- [Live demo](https://aarongustafson.github.io/form-maxlength-progress/demo/)
  ([source](./demo/index.html)), including [authored counters](https://aarongustafson.github.io/form-maxlength-progress/demo/#authored-counter-progress),
  [translations](https://aarongustafson.github.io/form-maxlength-progress/demo/#french-translation),
  and [styling](https://aarongustafson.github.io/form-maxlength-progress/demo/#profile-styling)
- [ESM CDN demo](https://aarongustafson.github.io/form-maxlength-progress/demo/esm.html)
  ([source](./demo/esm.html))
- [Unpkg CDN demo](https://aarongustafson.github.io/form-maxlength-progress/demo/unpkg.html)
  ([source](./demo/unpkg.html))

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

## Counter and field behavior

The browser enforces the field’s native `maxlength` unless you enable overrun.
Both the browser and component count UTF-16 code units, not user-perceived
characters: some emoji and combined characters use more than one unit.

The component adds a static maximum description to the field’s
`aria-describedby`, preserving existing references. That description stays
the same as you type. The visible generated counter is `aria-hidden`, so its
updates don’t become per-keystroke announcements. Milestone notifications
communicate approaching, reached, and exceeded limits instead.

Typing, paste, and browser input/change events update the count. During
[IME composition](https://en.wikipedia.org/wiki/Input_method), counts update
but notifications wait until composition ends. Setting `field.value` alone
doesn’t fire an input event; dispatch `input` when application code changes it.

## Authored counters and progress elements

Use `counter` and `progress` to reference a counter element, a native
`<progress>` element, or both. Each reference must identify a unique descendant
of the component.

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

The component replaces the counter’s text with the numeric remaining value and
sets its `aria-label` to the full accessible label. When a counter and
`<progress>` are both present, the component makes `<progress>` `aria-hidden`
to avoid duplicate semantics. A `<progress>`-only UI receives the accessible
label directly.

Authored markup stays in light DOM and can be styled normally. If the component
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
available in both templates; `{remaining}` supplies the count in labels and
the maximum in descriptions. The
component supports plural-category attributes for count labels (for example,
`label-one`):

```html
<form-maxlength-progress
  for="message"
  description="{maxlength} characters allowed"
  label="{remaining} characters left"
  label-one="{remaining} character left"
></form-maxlength-progress>
```

Plural selection uses `Intl.PluralRules` and the language the component
inherits. The optional category attributes are:

- `label-zero`
- `label-one`
- `label-two`
- `label-few`
- `label-many`

Missing count categories fall back to `label`; when that base label is also
absent, the component uses its English singular/other defaults. The same rule
applies to `overrun-label`. Without a custom `description`,
the empty-field default uses “1 character allowed” when `maxlength` is exactly
1 and “X characters allowed” otherwise. The count defaults are “1 character
remaining” and “X characters remaining.”

## Proximity states

The component maintains a `proximity` attribute for styling a user’s progress
toward the `maxlength`:

```css
form-maxlength-progress[proximity='close'] {
  color: light-dark(#8a4b00, #fbbf24);
}

form-maxlength-progress[proximity='target'],
form-maxlength-progress[proximity='overrun'] {
  font-weight: bold;
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
- Tokens must be unique.
- Tokens must start with an ASCII letter and then contain only letters, numbers,
  `_`, or `-`.
- One final, optional token without a percentage may represent values above
  100%.
- If that final token is omitted and overrun is allowed, overrun keeps the
  `100%` token.
- The component rejects an invalid `proximity-values` token string as a whole,
  logs a warning, and uses the defaults.

## Allowing values beyond `maxlength`

Set exactly `overrun="true"` to let the field’s value exceed `maxlength`.
A bare `overrun` attribute, `"false"`, or any other value leaves native
enforcement in place:

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
counter and accessible overrun labels use a positive amount. The event’s
`remaining` value stays negative. A `<progress>` element remains capped at 100%.

Overrun supports the same plural categories as `label` through
`overrun-label-zero`, `overrun-label-one`, `overrun-label-two`,
`overrun-label-few`, and `overrun-label-many`.

When the value exceeds the maximum, the component sets `aria-invalid="true"` on
the field. This communicates the invalid state to assistive technology and
provides a field-level styling hook:

```css
textarea[aria-invalid='true'] {
  border-style: double;
  border-width: 3px;
}
```

When the value returns within the limit, the component restores the field’s
original `aria-invalid` state. It also restores that state when the overrun
feature is disabled, the component is reassociated, or the component
disconnects. Disabling overrun or disconnecting also restores native
`maxlength` and the original `data-maxlength` attribute; it doesn’t truncate
the field’s existing value.

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
| `label`                    | `label`                                     | `{remaining} characters remaining`            | Normal `other` label template                     |
| `label-{category}`         | `labelZero`, `labelOne`, etc.               | category fallback                             | Normal plural-category templates                  |
| `proximity-values`         | `proximityValues`                           | `far 0%, close 75%, target 100%, overrun`     | Custom lower-bound stops                          |
| `proximity`                | `proximity` (read-only)                     | calculated                                    | Current style token                               |
| `overrun`                  | `overrun`                                   | `false`                                       | Enabled only by the exact string `true`           |
| `overrun-label`            | `overrunLabel`                              | `{remaining} characters over the max length.` | Overrun `other` template                          |
| `overrun-label-{category}` | `overrunLabelZero`, `overrunLabelOne`, etc. | category fallback                             | Overrun plural-category templates                 |
| `limit-reached-label`      | `limitReachedLabel`                         | `Character limit reached`                     | Notification text when the limit is reached       |
| `limit-exceeded-label`     | `limitExceededLabel`                        | `Character limit exceeded`                    | Notification text when overrun crosses the limit  |

The `overrun` property is boolean. Setting it writes `"true"` or `"false"` to
the attribute.

## Events

The component dispatches `form-maxlength-progress:notification` for each
notification milestone. The event bubbles and is composed, so you can listen
for it from an ancestor:

```javascript
document.addEventListener('form-maxlength-progress:notification', (event) => {
  const { state, message, priority, remaining, maximum, field } = event.detail;
  console.log({ state, message, priority, remaining, maximum, field });
});
```

The event’s `detail` is
`{ state, message, priority, remaining, maximum, field }`. `state` is
`near-limit`, `limit-reached`, or `limit-exceeded`. `priority` is `normal` or
`high`, and `field` is the associated field.

## Styling

The component defaults to `display: inline-block`, but you can assign your own
styles as needed. You can use its `proximity` attribute for state-based styles.
In forced colors, the default generated counter becomes bold and underlined at
or above the actual character limit. This does not depend on proximity token
names and clears when the value returns below the limit. Authored counters keep
their own styles.
If you don’t bring your own markup, you can target the counter through its
`data-*` attribute:

```css
[data-form-maxlength-progress-generated-counter] {
  font-variant-numeric: tabular-nums;
}
```

### Styling hooks

The visible generated counter and static description are in light DOM. These
`data-*` attributes and state selectors are stable styling hooks:

| Selector                                                      | Element and state                                                         |
| ------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `[data-form-maxlength-progress-generated-counter]`            | Visible generated text, both the at-rest description and active countdown |
| `[data-form-maxlength-progress-description]`                  | Static `hidden` text referenced by the field’s `aria-describedby`         |
| `form-maxlength-progress[proximity='…']`                      | Component host at the current configured proximity stop                   |
| `textarea[aria-invalid='true']`, `input[aria-invalid='true']` | Associated overrun-enabled field while above its maximum                  |
| `textarea[data-maxlength]`, `input[data-maxlength]`           | Associated field while native `maxlength` is moved aside for overrun      |

The description must remain hidden because it supplies the field’s static
assistive-technology text.

The component supplies no color palette. The [styling demo](./demo/index.html#profile-styling)
shows an optional field panel and counter treatment. The demos use amber near
the limit and red at or above it, with bold text and thicker field boundaries.
Forced colors add bold warnings and underlined limit states.

Leave `<progress>` native when possible. The [authored progress demo](./demo/index.html#authored-counter-progress)
uses `accent-color: currentColor` to match the counter’s state color, and
`accent-color: auto` in forced colors. The readable remaining count carries
meaning even when the browser chooses its own fill.

Test text, field boundaries, and focus indicators in light, dark, and forced
colors when authoring a theme. System-color names alone don’t guarantee contrast.

## Accessibility details

The component includes these accessibility considerations:

- Counter updates are not spoken on every update. Only the major milestones are
  announced.
- The component communicates the maximum value through the field’s accessible
  description (using `aria-describedby`).
- The generated counter is `aria-hidden`; authored counters retain the
  accessible text and ARIA supplied by the component.
- Upon reaching the final 10 characters, the component sends a polite
  normal-priority notification.
- Reaching the limit sends a high-priority notification. With overrun enabled,
  a value that crosses the limit sends a high-priority “exceeded” notification
  instead.
- The component uses `ariaNotify()` with `normal` or `high` priority for every
  milestone. When `ariaNotify()` is unavailable, the component creates
  DOM-based fallbacks inside its shadow root.
- Paste, autofill-style input, deletion and re-entry, and
  [IME-based composition](https://en.wikipedia.org/wiki/Input_method) are all
  supported; jumps to or beyond the limit don’t send the near-limit warning.
- Initialization and configuration changes don’t produce notifications.

Use `limit-reached-label` and `limit-exceeded-label` to localize the
high-priority notification text. The remaining-count `label` supplies the
localized near-limit notification.

Color alone shouldn’t communicate proximity. Pair it with text and a structural
cue, and preserve the associated field’s focus outline.

If you provide visible limit instructions, keep them outside the component and
associate them with the field using `aria-describedby`. The component preserves
those references. The demos rely on the component’s own static description
and visible count rather than adding separate instructions. If JavaScript is
unavailable or a module fails, their fields, labels, and native `maxlength`
remain usable; overrun is only enabled after upgrade.

## Invalid configuration

Invalid ID references, duplicate IDs, ineligible fields, invalid `maxlength`
values, and invalid proximity configuration log warnings to the console.
Invalid field/counter/progress references or an invalid maximum leave the
component hidden and restore the previously associated field’s state. Correcting those
references lets it recover. Invalid proximity stops instead use the default
stops. The field remains available in either case.

On disconnection or reassociation, the component removes its field listeners,
static description reference, generated counter, and notification fallbacks,
and restores the authored counter/progress state. It disconnects its mutation
observer when removed from the document.

## Browser support

The package uses Custom Elements, Shadow DOM, ES modules, `MutationObserver`,
and `Intl.PluralRules`. Use appropriate polyfills when targeting browsers
without those APIs.

## Development

```bash
npm install
npm run test:run
npm run test:coverage
npm run test:browser
npm run lint
npm run format
```

Browser tests run Chromium, Firefox, and WebKit with one worker on port 4188.
Install their engines with `npx playwright install` when needed. Tests cover
19 distinct recorded study palettes, light/dark schemes, increased contrast,
supported forced-color emulation, keyboard focus, non-submitting autofill checks,
progress values, localized overrun/recovery, module failure, no JavaScript,
and 320px reflow with enlarged text. CDN tests substitute local source; they
don’t prove CDN availability. A narrowly scoped expected failure tracks
Ubuntu WebKit’s dark `ButtonText`/`ButtonFace` contrast.

The local server rejects malformed request URLs with HTTP 400. A regression
checks that it continues serving valid requests afterward.

Palette substitution and browser emulation don’t prove Windows high-contrast
repainting or assistive-technology behavior. Real OS themes, screen readers,
browser zoom, saved-address autofill, and clipboard/IME checks still need human
acceptance testing; these checks don’t establish accessibility conformance.

## License

MIT © [Aaron Gustafson](https://www.aaron-gustafson.com/)
