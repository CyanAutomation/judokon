// @vitest-environment jsdom
import { beforeEach, describe, expect, test } from "vitest";
import { toggleCountryPanel } from "../../src/helpers/countryPanel.js";

function setup({ open = false } = {}) {
  document.body.innerHTML = `
    <details class="country-panel"${open ? " open" : ""}>
      <summary class="country-panel__toggle">Toggle</summary>
      <div class="country-panel__content">
        <label>
          <input type="radio" name="country-filter" value="jpn" />
        </label>
      </div>
    </details>
    <button id="external">External</button>
  `;

  const details = /** @type {HTMLDetailsElement} */ (document.querySelector("details"));
  const toggle = /** @type {HTMLElement} */ (document.querySelector("summary"));
  const radio = /** @type {HTMLInputElement} */ (
    document.querySelector('input[type="radio"][name="country-filter"]')
  );
  const external = /** @type {HTMLButtonElement} */ (document.getElementById("external"));

  return { details, toggle, radio, external };
}

describe("toggleCountryPanel", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
    document.activeElement?.blur?.();
  });

  test("focuses the first radio when opening from a closed state", () => {
    const { details, toggle, radio } = setup();

    toggleCountryPanel(toggle, details, true);

    expect(document.activeElement).toBe(radio);
  });

  test("does not refocus content when already open", () => {
    const { details, toggle, radio, external } = setup({ open: true });

    radio.focus();
    external.focus();

    toggleCountryPanel(toggle, details, true);

    expect(document.activeElement).toBe(external);
  });

  test("returns focus to the toggle when closing from open", () => {
    const { details, toggle, radio } = setup({ open: true });

    radio.focus();

    toggleCountryPanel(toggle, details, false);

    expect(document.activeElement).toBe(toggle);
  });

  test("reflects native open transitions when provided the previous state", () => {
    const { details, toggle, radio } = setup({ open: false });

    toggle.focus();
    details.open = true;

    toggleCountryPanel(toggle, details, details.open, { previousOpen: false });

    expect(document.activeElement).toBe(radio);
  });

  test("skips focus changes when the previous state matches the current state", () => {
    const { details, toggle, radio, external } = setup({ open: true });

    radio.focus();
    external.focus();

    toggleCountryPanel(toggle, details, details.open, { previousOpen: true });

    expect(document.activeElement).toBe(external);
  });

  test("does not move focus when already closed", () => {
    const { details, toggle, external } = setup({ open: false });

    external.focus();

    toggleCountryPanel(toggle, details, false);

    expect(document.activeElement).toBe(external);
  });
});
