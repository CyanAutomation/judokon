import { beforeEach, describe, expect, it } from "vitest";
import {
  setupCollapsibleSections,
  expandAllSections,
  ensureSectionOpen,
  SETTINGS_SECTIONS_STORAGE_KEY
} from "../../../src/helpers/settings/collapsibleSections.js";

function buildSections() {
  document.body.innerHTML = `
    <form id="settings-form">
      <details class="settings-section" data-section-id="display">
        <summary>Display</summary>
        <fieldset></fieldset>
      </details>
      <details class="settings-section" data-section-id="general">
        <summary>General</summary>
        <fieldset></fieldset>
      </details>
      <details class="settings-section" data-section-id="advanced">
        <summary>Advanced</summary>
        <fieldset></fieldset>
      </details>
    </form>
  `;
}

describe("collapsible sections", () => {
  beforeEach(() => {
    localStorage.clear();
    buildSections();
  });

  it("applies default open state to display and general sections", () => {
    setupCollapsibleSections();
    const details = document.querySelectorAll("#settings-form details");
    expect(details[0].open).toBe(true);
    expect(details[1].open).toBe(true);
    expect(details[2].open).toBe(false);
  });

  it("persists toggle state to storage", () => {
    setupCollapsibleSections();
    const advanced = document.querySelector('[data-section-id="advanced"]');
    advanced.open = true;
    advanced.dispatchEvent(new Event("toggle"));
    expect(JSON.parse(localStorage.getItem(SETTINGS_SECTIONS_STORAGE_KEY))).toMatchObject({
      advanced: true
    });

    buildSections();
    setupCollapsibleSections();
    const restoredAdvanced = document.querySelector('[data-section-id="advanced"]');
    expect(restoredAdvanced.open).toBe(true);
  });

  it("forces sections open via helpers", () => {
    setupCollapsibleSections();
    const advanced = document.querySelector('[data-section-id="advanced"]');
    expect(advanced.open).toBe(false);
    ensureSectionOpen("advanced");
    expect(advanced.open).toBe(true);
    expandAllSections();
    document.querySelectorAll("#settings-form details").forEach((section) => {
      expect(section.open).toBe(true);
    });
  });
});
