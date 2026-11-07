import { expect, type Locator } from '@playwright/test';

/**
 * Fills a field without the value in the step title.
 *
 * `locator.fill(value)` is reported as `Fill "<value>"` in the HTML report
 * (and so is every keyboard method), so a password typed that way would be
 * public in the published report. This is the same input event that `fill`
 * dispatches, set from page JavaScript: the report shows `Evaluate`, without
 * arguments. The prototype's value setter, not `input.value = ...`, because
 * React overrides the setter of a controlled input and would ignore the value.
 *
 * Remaining risk: a test that FAILS while the secret is in the field still
 * prints it, in the call log (`value="..."`) and in the page snapshot of the
 * error context. Playwright has no supported redaction yet (see
 * docs/PROJECT_SESSION_SUMMARY.md, Mission 6).
 */
export async function fillSecret(field: Locator, value: string): Promise<void> {
  // The checks fill would make before typing: visible, enabled, editable
  await expect(field).toBeEditable();
  await field.evaluate((input, secret) => {
    if (!(input instanceof HTMLInputElement)) {
      throw new Error(`fillSecret expects an <input>, got <${input.tagName.toLowerCase()}>`);
    }
    input.focus();
    // The prototype's setter, run on this input (the receiver)
    Reflect.set(HTMLInputElement.prototype, 'value', secret, input);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, value);
}
