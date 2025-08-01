import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalReadyState = Object.getOwnPropertyDescriptor(document, "readyState");

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = `
    <input id="tooltip-search" />
    <ul id="tooltip-list"></ul>
    <div id="tooltip-preview"></div>
    <pre id="tooltip-raw"></pre>
    <button id="copy-key-btn"></button>
    <button id="copy-body-btn"></button>
  `;
});

afterEach(() => {
  if (originalReadyState) {
    Object.defineProperty(document, "readyState", originalReadyState);
  }
});

describe("setupTooltipViewerPage", () => {
  it("updates preview when a list item is clicked", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });

    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ tipA: "**Bold**", tipB: "Raw" }),
      importJsonModule: vi.fn().mockResolvedValue({})
    }));

    await import("../../src/helpers/tooltipViewerPage.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await Promise.resolve();

    const item = document.querySelector("#tooltip-list li");
    expect(item).toBeTruthy();
    item.click();

    expect(document.getElementById("tooltip-preview").innerHTML).toBe("<strong>Bold</strong>");
    expect(document.getElementById("tooltip-raw").textContent).toBe("**Bold**");
  });
});
