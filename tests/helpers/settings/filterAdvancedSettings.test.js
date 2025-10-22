import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("../../../src/helpers/settings/collapsibleSections.js", () => ({
  ensureSectionOpen: vi.fn()
}));

import { ensureSectionOpen } from "../../../src/helpers/settings/collapsibleSections.js";
import {
  setupAdvancedSettingsSearch,
  reapplyAdvancedSettingsFilter
} from "../../../src/helpers/settings/filterAdvancedSettings.js";

function createSettingsItem({ label, description, flag }) {
  const wrapper = document.createElement("div");
  wrapper.className = "settings-item";
  const labelEl = document.createElement("label");
  labelEl.className = "switch";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.dataset.flag = flag;
  const slider = document.createElement("div");
  slider.className = "slider round";
  const span = document.createElement("span");
  span.textContent = label;
  labelEl.append(input, slider, span);
  const descriptionEl = document.createElement("p");
  descriptionEl.className = "settings-description";
  descriptionEl.textContent = description;
  wrapper.append(labelEl, descriptionEl);
  return wrapper;
}

function getVisibleItems(container) {
  return Array.from(container.querySelectorAll(".settings-item")).filter(
    (item) => item.style.display !== "none"
  );
}

describe("setupAdvancedSettingsSearch", () => {
  let input;
  let container;
  let emptyState;
  let statusNode;

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = `
      <div class="advanced-settings-search">
        <label for="advanced-settings-search">Search feature flags</label>
        <input id="advanced-settings-search" type="search" />
        <p id="advanced-settings-no-results" hidden>No feature flags match your search.</p>
        <span id="advanced-settings-search-status" role="status" aria-live="polite"></span>
      </div>
      <fieldset id="feature-flags-container"></fieldset>
    `;
    input = document.getElementById("advanced-settings-search");
    container = document.getElementById("feature-flags-container");
    emptyState = document.getElementById("advanced-settings-no-results");
    statusNode = document.getElementById("advanced-settings-search-status");

    container.append(
      createSettingsItem({
        label: "Test Mode",
        description: "Deterministic draws",
        flag: "enableTestMode"
      }),
      createSettingsItem({
        label: "Card Inspector",
        description: "Inspect raw card data",
        flag: "enableCardInspector"
      }),
      createSettingsItem({
        label: "Tooltip Overlay Debug",
        description: "Shows overlay bounds",
        flag: "tooltipOverlayDebug"
      })
    );
  });

  it("filters feature flags by query and updates status", () => {
    setupAdvancedSettingsSearch({
      input,
      container,
      emptyStateNode: emptyState,
      statusNode
    });

    expect(getVisibleItems(container)).toHaveLength(3);
    expect(statusNode.textContent).toBe("Showing all 3 feature flags");
    expect(emptyState.hidden).toBe(true);

    input.value = "card";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    const visibleAfterFilter = getVisibleItems(container);
    expect(visibleAfterFilter).toHaveLength(1);
    expect(visibleAfterFilter[0].querySelector("span").textContent).toBe("Card Inspector");
    expect(statusNode.textContent).toBe("Showing 1 of 3 feature flags");
    expect(emptyState.hidden).toBe(true);
    expect(ensureSectionOpen).toHaveBeenCalledWith("advanced");
  });

  it("reveals empty state when no matches and clears on Escape", () => {
    setupAdvancedSettingsSearch({
      input,
      container,
      emptyStateNode: emptyState,
      statusNode
    });

    input.value = "nonexistent";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    expect(getVisibleItems(container)).toHaveLength(0);
    expect(emptyState.hidden).toBe(false);
    expect(statusNode.textContent).toBe("Showing 0 of 3 feature flags");

    input.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(input.value).toBe("");
    expect(getVisibleItems(container)).toHaveLength(3);
    expect(emptyState.hidden).toBe(true);
    expect(statusNode.textContent).toBe("Showing all 3 feature flags");
  });

  it("reapplies filter after feature flags rerender", () => {
    setupAdvancedSettingsSearch({
      input,
      container,
      emptyStateNode: emptyState,
      statusNode
    });

    input.value = "debug";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    const newItem = createSettingsItem({
      label: "CLI Enhancements",
      description: "Verbose CLI mode",
      flag: "cliVerbose"
    });
    container.appendChild(newItem);

    reapplyAdvancedSettingsFilter();
    const visible = getVisibleItems(container);
    expect(visible).toHaveLength(1);
    expect(visible[0].querySelector("span").textContent).toBe("Tooltip Overlay Debug");
  });
});
