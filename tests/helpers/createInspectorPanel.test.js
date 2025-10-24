import { describe, it, expect } from "vitest";
import { mountInspectorPanel } from "./mountInspectorPanel.js";

const judoka = {};

/** @test {createInspectorPanel} */
describe("createInspectorPanel accessibility", () => {
  it("relies on native summary behavior and toggles dataset on open", () => {
    const panel = mountInspectorPanel(judoka);
    const summary = panel.querySelector("summary");
    const container = panel.parentElement;

    expect(panel.getAttribute("aria-label")).toBe("Inspector panel");
    expect(summary?.hasAttribute("tabindex")).toBe(false);
    expect(summary.getAttribute("aria-expanded")).toBe("false");
    expect(summary.style.minHeight).toBe("");
    expect(summary.style.minWidth).toBe("");
    expect(summary.style.outline).toBe("");

    expect(container?.dataset.inspector).toBeUndefined();

    panel.open = true;
    panel.dispatchEvent(new Event("toggle"));
    expect(panel.open).toBe(true);
    expect(summary.getAttribute("aria-expanded")).toBe("true");
    expect(container?.dataset.inspector).toBe("true");

    panel.open = false;
    panel.dispatchEvent(new Event("toggle"));
    expect(panel.open).toBe(false);
    expect(summary.getAttribute("aria-expanded")).toBe("false");
    expect(container?.dataset.inspector).toBeUndefined();
  });
});
