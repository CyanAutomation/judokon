import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { loadQuote } from "../../src/helpers/quoteBuilder.js";

const originalFetch = global.fetch;

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  global.fetch = originalFetch;
  document.body.innerHTML = "";
  localStorage.clear();
});

describe("loadQuote", () => {
  it("renders a fetched quote", async () => {
    const quoteDiv = document.createElement("div");
    quoteDiv.id = "quote";
    quoteDiv.className = "hidden";
    const loader = document.createElement("div");
    loader.id = "quote-loader";
    const toggle = document.createElement("button");
    toggle.id = "language-toggle";
    toggle.className = "hidden";
    const liveRegion = document.createElement("div");
    liveRegion.id = "language-announcement";
    document.body.append(quoteDiv, loader, toggle, liveRegion);
    localStorage.setItem("settings", JSON.stringify({ typewriterEffect: false }));

    const storyData = [{ id: 1, story: "B" }];
    const metaData = [{ id: 1, title: "A" }];
    global.fetch = vi.fn((url) => {
      if (url.includes("aesopsFables.json")) {
        return Promise.resolve({ ok: true, json: async () => storyData });
      }
      return Promise.resolve({ ok: true, json: async () => metaData });
    });
    vi.spyOn(Math, "random").mockReturnValue(0);

    await loadQuote();
    await vi.runAllTimersAsync();

    expect(quoteDiv.classList.contains("hidden")).toBe(false);
    expect(loader.classList.contains("hidden")).toBe(true);
    expect(quoteDiv.innerHTML).toContain("A");
    expect(toggle.classList.contains("hidden")).toBe(false);
    expect(toggle).toHaveAttribute("aria-live", "polite");
    expect(document.activeElement).toBe(toggle);
    expect(liveRegion.textContent).toBe("language toggle available");
  });

  it("shows fallback text when fetching fails", async () => {
    const quoteDiv = document.createElement("div");
    quoteDiv.id = "quote";
    const loader = document.createElement("div");
    loader.id = "quote-loader";
    document.body.append(quoteDiv, loader);
    localStorage.setItem("settings", JSON.stringify({ typewriterEffect: false }));

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error("fail"));

    await loadQuote();
    await vi.runAllTimersAsync();

    expect(quoteDiv.textContent).toContain("Take a breath. Even a still pond reflects the sky.");
    consoleErrorSpy.mockRestore();
  });

  it("handles empty or invalid quote data gracefully", async () => {
    const quoteDiv = document.createElement("div");
    quoteDiv.id = "quote";
    const loader = document.createElement("div");
    loader.id = "quote-loader";
    document.body.append(quoteDiv, loader);
    localStorage.setItem("settings", JSON.stringify({ typewriterEffect: false }));

    // Empty array
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => [] }));
    await loadQuote();
    await vi.runAllTimersAsync();
    expect(quoteDiv.textContent).toContain("Take a breath");

    // Invalid data
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => [{}] }));
    await loadQuote();
    await vi.runAllTimersAsync();
    expect(quoteDiv.textContent).toContain("Take a breath");
  });

  it("does not throw if DOM elements are missing", async () => {
    localStorage.setItem("settings", JSON.stringify({ typewriterEffect: false }));
    global.fetch = vi.fn((url) => {
      if (url.includes("aesopsFables.json")) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 1, story: "B" }] });
      }
      return Promise.resolve({ ok: true, json: async () => [{ id: 1, title: "A" }] });
    });
    await loadQuote();
    await vi.runAllTimersAsync();
    // Should not throw even if #quote, #quote-loader, or #language-toggle are missing
  });
});
