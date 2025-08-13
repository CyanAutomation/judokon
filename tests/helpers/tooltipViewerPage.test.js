import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const originalReadyState = Object.getOwnPropertyDescriptor(document, "readyState");
const originalClipboard = navigator.clipboard;
const originalScrollIntoView = Element.prototype.scrollIntoView;
const originalHash = location.hash;

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

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
  Element.prototype.scrollIntoView = originalScrollIntoView;
  location.hash = originalHash;
  vi.useRealTimers();
});

describe("setupTooltipViewerPage", () => {
  it("updates preview when a list item is clicked", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });

    const mod = await import("../../src/helpers/tooltipViewerPage.js");
    mod.setTooltipDataLoader(async () => ({ "stat.tipA": "**Bold**", "ui.tipB": "Raw" }));

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await flush();

    const item = document.querySelector("#tooltip-list li");
    expect(item).toBeTruthy();
    item.click();

    expect(document.getElementById("tooltip-preview").innerHTML).toBe("<strong>Bold</strong>");
    expect(document.getElementById("tooltip-raw").textContent).toBe("**Bold**");
    expect(document.getElementById("tooltip-warning").hidden).toBe(true);
  });

  it("adds warning icon to invalid entries", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });

    const mod = await import("../../src/helpers/tooltipViewerPage.js");
    mod.setTooltipDataLoader(async () => ({ "ui.ok": "text", "ui.bad": "" }));

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await flush();

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

    const mod = await import("../../src/helpers/tooltipViewerPage.js");
    mod.setTooltipDataLoader(async () => ({ "ui.ok": "text", "ui.warn": "**Bold" }));

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await flush();

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

    const mod = await import("../../src/helpers/tooltipViewerPage.js");
    mod.setTooltipDataLoader(async () => ({ "ui.tip": "**Bold" }));

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await flush();

    const item = document.querySelector("#tooltip-list li");
    item.click();

    const warnEl = document.getElementById("tooltip-warning");
    expect(warnEl.hidden).toBe(false);
    expect(warnEl.textContent).toBe("Unbalanced markup detected");
  });

  it("toggles preview expansion for long content", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });

    const mod = await import("../../src/helpers/tooltipViewerPage.js");
    mod.setTooltipDataLoader(async () => ({ "ui.tip": "long" }));

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await flush();

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

    const mod = await import("../../src/helpers/tooltipViewerPage.js");
    mod.setTooltipDataLoader(async () => ({ "ui.tip": "text" }));
    const showSnackbar = vi.fn();
    mod.setTooltipSnackbar(showSnackbar);

    vi.useFakeTimers();
    document.dispatchEvent(new Event("DOMContentLoaded"));

    await flush();

    const item = document.querySelector("#tooltip-list li");
    item.click();

    const btn = document.getElementById("copy-key-btn");
    btn.click();

    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith("ui.tip");
    expect(showSnackbar).toHaveBeenCalledWith("Copied");
    expect(btn.classList.contains("copied")).toBe(true);

    vi.runAllTimers();
    expect(btn.classList.contains("copied")).toBe(false);
  });

  it("copies body text when body copy button is clicked", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });

    const writeText = vi.fn().mockResolvedValue();
    navigator.clipboard = { writeText };

    const mod = await import("../../src/helpers/tooltipViewerPage.js");
    mod.setTooltipDataLoader(async () => ({ "ui.tip": "body text" }));
    const showSnackbar = vi.fn();
    mod.setTooltipSnackbar(showSnackbar);

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await flush();

    const item = document.querySelector("#tooltip-list li");
    item.click();

    const btn = document.getElementById("copy-body-btn");
    btn.click();

    await Promise.resolve();

    expect(writeText).toHaveBeenCalledWith("body text");
    expect(showSnackbar).toHaveBeenCalledWith("Copied");
    expect(btn.classList.contains("copied")).toBe(true);
  });

  it("selects tooltip from URL hash on load", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });

    const mod = await import("../../src/helpers/tooltipViewerPage.js");
    mod.setTooltipDataLoader(async () => ({ "ui.tip": "text", "ui.other": "x" }));

    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    location.hash = "#ui.tip";

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await flush();

    expect(document.getElementById("tooltip-preview").innerHTML).toBe("text");
    expect(scrollIntoView).toHaveBeenCalled();
  });

  it("shows 'File not found' when tooltips.json is missing", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });

    const error = Object.assign(new Error("missing"), { code: "ENOENT" });
    const mod = await import("../../src/helpers/tooltipViewerPage.js");
    mod.setTooltipDataLoader(async () => Promise.reject(error));

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await flush();

    expect(document.getElementById("tooltip-preview").textContent).toBe("File not found");

    consoleError.mockRestore();
  });

  it("shows parse error details when JSON is invalid", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });

    const error = new SyntaxError("Unexpected token } in JSON at line 3 column 15");
    const mod = await import("../../src/helpers/tooltipViewerPage.js");
    mod.setTooltipDataLoader(async () => Promise.reject(error));

    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await flush();

    expect(document.getElementById("tooltip-preview").textContent).toBe("Line 3, Column 15");

    consoleError.mockRestore();
  });

  it("adds warning icon to invalid key names", async () => {
    Object.defineProperty(document, "readyState", { value: "loading", configurable: true });

    const mod = await import("../../src/helpers/tooltipViewerPage.js");
    mod.setTooltipDataLoader(async () => ({ badkey: "text" }));

    document.dispatchEvent(new Event("DOMContentLoaded"));

    await flush();

    const invalid = document.querySelector('#tooltip-list li[data-key="badkey"]');
    expect(invalid).toBeTruthy();
    expect(invalid.dataset.keyValid).toBe("false");
    const icon = invalid.querySelector(".tooltip-invalid-icon");
    expect(icon).toBeTruthy();
    expect(icon.title).toBe("Invalid key format (prefix.name)");
    const sr = invalid.querySelector(".tooltip-invalid-text");
    expect(sr).toBeTruthy();
    expect(sr.textContent).toBe("Invalid key format (prefix.name)");
  });
});
