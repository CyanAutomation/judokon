import { describe, it, expect } from "vitest";
import { createInspectorPanel } from "../../src/helpers/cardBuilder.js";

const judoka = {};

/** @test {createInspectorPanel} */
describe("createInspectorPanel accessibility", () => {
  it("adds label, focus styles, and keyboard support", () => {
    const container = document.createElement("div");
    const panel = createInspectorPanel(container, judoka, {});
    const summary = panel.querySelector("summary");

    expect(panel.getAttribute("aria-label")).toBe("Inspector panel");
    expect(parseInt(summary.style.minHeight)).toBeGreaterThanOrEqual(44);
    expect(parseInt(summary.style.minWidth)).toBeGreaterThanOrEqual(44);
    expect(summary.tabIndex).toBe(0);

    summary.dispatchEvent(new Event("focus"));
    expect(summary.style.outlineColor).toBe("rgb(0, 0, 0)");

    expect(panel.open).toBe(false);
    summary.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(panel.open).toBe(true);
    summary.dispatchEvent(new KeyboardEvent("keydown", { key: " " }));
    expect(panel.open).toBe(false);
  });
});
