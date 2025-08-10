import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalReadyState = Object.getOwnPropertyDescriptor(document, "readyState");
const originalClipboard = navigator.clipboard;

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
  navigator.clipboard = originalClipboard;
});

describe("setupTooltipViewerPage", () => {
  it("updates preview when a list item is clicked", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });

    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ "stat.tipA": "**Bold**", "ui.tipB": "Raw" }),
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
      fetchJson: vi.fn().mockResolvedValue({ "ui.ok": "text", "ui.bad": "" }),
      importJsonModule: vi.fn().mockResolvedValue({})
    }));

    await import("../../src/helpers/tooltipViewerPage.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await Promise.resolve();

    const invalid = document.querySelector('#tooltip-list li[data-key="ui.bad"]');
    expect(invalid).toBeTruthy();
    const icon = invalid.querySelector(".tooltip-invalid-icon");
    expect(icon).toBeTruthy();
    expect(icon.title).toBe("Empty or whitespace-only content");
    const sr = invalid.querySelector(".tooltip-invalid-text");
    expect(sr).toBeTruthy();
    expect(sr.textContent).toBe("Empty or whitespace-only content");
  });

  it("adds warning icon to malformed entries", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });

    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ "ui.ok": "text", "ui.warn": "**Bold" }),
      importJsonModule: vi.fn().mockResolvedValue({})
    }));

    await import("../../src/helpers/tooltipViewerPage.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await Promise.resolve();

    const malformed = document.querySelector('#tooltip-list li[data-key="ui.warn"]');
    expect(malformed).toBeTruthy();
    const icon = malformed.querySelector(".tooltip-invalid-icon");
    expect(icon).toBeTruthy();
    expect(icon.title).toBe("Unbalanced markup detected");
    const sr = malformed.querySelector(".tooltip-invalid-text");
    expect(sr).toBeTruthy();
    expect(sr.textContent).toBe("Unbalanced markup detected");
  });

  it("shows warning for unbalanced markup", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });

    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ "ui.tip": "**Bold" }),
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

  it("toggles preview expansion for long content", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });

    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ "ui.tip": "long" }),
      importJsonModule: vi.fn().mockResolvedValue({})
    }));

    await import("../../src/helpers/tooltipViewerPage.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await Promise.resolve();

    const preview = document.getElementById("tooltip-preview");
    Object.defineProperty(preview, "scrollHeight", { value: 400, configurable: true });

    const item = document.querySelector("#tooltip-list li");
    item.click();

    const toggle = document.getElementById("toggle-preview-btn");
    const container = preview.parentElement;
    expect(toggle.hidden).toBe(false);
    expect(container.classList.contains("expanded")).toBe(false);
    toggle.click();
    expect(container.classList.contains("expanded")).toBe(true);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
  });

  it("shows feedback when copying", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });

    const writeText = vi.fn().mockResolvedValue();
    navigator.clipboard = { writeText };

    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ "ui.tip": "text" }),
      importJsonModule: vi.fn().mockResolvedValue({})
    }));

    const showSnackbar = vi.fn();
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({ showSnackbar }));

    await import("../../src/helpers/tooltipViewerPage.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await Promise.resolve();

    const item = document.querySelector("#tooltip-list li");
    item.click();

    const btn = document.getElementById("copy-key-btn");
    btn.click();

    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith("ui.tip");
    expect(showSnackbar).toHaveBeenCalledWith("Copied");
    expect(btn.classList.contains("copied")).toBe(true);
  });

  it("shows 'File not found' when tooltips.json is missing", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });

    const error = Object.assign(new Error("missing"), { code: "ENOENT" });
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockRejectedValue(error),
      importJsonModule: vi.fn().mockResolvedValue({})
    }));

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await import("../../src/helpers/tooltipViewerPage.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await Promise.resolve();

    expect(document.getElementById("tooltip-preview").textContent).toBe("File not found");

    consoleError.mockRestore();
  });

  it("shows parse error details when JSON is invalid", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });

    const error = new SyntaxError("Unexpected token } in JSON at line 3 column 15");
    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockRejectedValue(error),
      importJsonModule: vi.fn().mockResolvedValue({})
    }));

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    await import("../../src/helpers/tooltipViewerPage.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await Promise.resolve();

    expect(document.getElementById("tooltip-preview").textContent).toBe("Line 3, Column 15");

    consoleError.mockRestore();
  });

  it("adds warning icon to invalid key names", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });

    vi.doMock("../../src/helpers/dataUtils.js", () => ({
      fetchJson: vi.fn().mockResolvedValue({ badkey: "text" }),
      importJsonModule: vi.fn().mockResolvedValue({})
    }));

    await import("../../src/helpers/tooltipViewerPage.js");

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await Promise.resolve();

    const invalid = document.querySelector('#tooltip-list li[data-key="badkey"]');
    expect(invalid).toBeTruthy();
    const icon = invalid.querySelector(".tooltip-invalid-icon");
    expect(icon).toBeTruthy();
    expect(icon.title).toBe("Invalid key format (prefix.name)");
    const sr = invalid.querySelector(".tooltip-invalid-text");
    expect(sr).toBeTruthy();
    expect(sr.textContent).toBe("Invalid key format (prefix.name)");
  });
});
