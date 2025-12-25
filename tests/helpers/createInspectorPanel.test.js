import { describe, it, expect } from "vitest";
import { mountInspectorPanel } from "./mountInspectorPanel.js";
import { toggleDetails } from "../utils/componentTestUtils.js";

const judoka = {};

/** @test {createInspectorPanel} */
describe("createInspectorPanel accessibility", () => {
  it("relies on native summary behavior and toggles dataset on open", () => {
    const panel = mountInspectorPanel(judoka);
    const summary = panel.querySelector("summary");
    const container = panel.parentElement;

    expect(panel.getAttribute("aria-label")).toBe("Inspector panel");
    expect(summary).toBeTruthy();
    expect(summary?.hasAttribute("tabindex")).toBe(false);
    expect(summary.getAttribute("aria-expanded")).toBe("false");
    expect(summary.style.minHeight).toBe("");
    expect(summary.style.minWidth).toBe("");
    expect(summary.style.outline).toBe("");

    expect(container?.dataset.inspector).toBeUndefined();

    toggleDetails(panel);
    expect(panel.open).toBe(true);
    expect(summary.getAttribute("aria-expanded")).toBe("true");
    expect(container?.dataset.inspector).toBe("true");

    toggleDetails(panel);
    expect(panel.open).toBe(false);
    expect(summary.getAttribute("aria-expanded")).toBe("false");
    expect(container?.dataset.inspector).toBeUndefined();
  });
});
