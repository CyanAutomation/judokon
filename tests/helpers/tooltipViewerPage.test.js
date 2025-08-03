import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalReadyState = Object.getOwnPropertyDescriptor(document, "readyState");

beforeEach(() => {
  vi.resetModules();
  document.body.innerHTML = `
    <input id="tooltip-search" />
    <ul id="tooltip-list"></ul>
    <div id="tooltip-preview"></div>
    <div id="tooltip-warning"></div>
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
    expect(document.getElementById("tooltip-warning").hidden).toBe(true);
  });

  it("adds warning icon to invalid entries", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });

    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ ok: "text", bad: "" }),
      importJsonModule: vi.fn().mockResolvedValue({})
    }));

    await import("../../src/helpers/tooltipViewerPage.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await Promise.resolve();

    const invalid = document.querySelector('#tooltip-list li[data-key="bad"]');
    expect(invalid).toBeTruthy();
    const icon = invalid.querySelector(".tooltip-invalid-icon");
    expect(icon).toBeTruthy();
    expect(icon.title).toBe("Empty or whitespace-only content");
    const sr = invalid.querySelector(".tooltip-invalid-text");
    expect(sr).toBeTruthy();
    expect(sr.textContent).toBe("Empty or whitespace-only content");
  });

  it("shows warning for unbalanced markup", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });

    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ tip: "**Bold" }),
      importJsonModule: vi.fn().mockResolvedValue({})
    }));

    await import("../../src/helpers/tooltipViewerPage.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await Promise.resolve();

    const item = document.querySelector("#tooltip-list li");
    item.click();

    const warnEl = document.getElementById("tooltip-warning");
    expect(warnEl.hidden).toBe(false);
    expect(warnEl.textContent).toBe("Unbalanced markup detected");
  });
});
