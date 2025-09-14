import { describe, it, expect, vi, afterEach } from "vitest";
import { loadQuote } from "../../src/helpers/quoteBuilder.js";
import { formatFableStory } from "../../src/helpers/quotes/quoteRenderer.js";
import { mount, clearBody } from "./domUtils.js";

const originalFetch = global.fetch;

afterEach(() => {
  vi.restoreAllMocks();
  global.fetch = originalFetch;
  clearBody();
  localStorage.clear();
});

describe("loadQuote", () => {
  it("formats fable story with HTML", async () => {
    const {
      container,
      query,
      cleanup: localCleanup
    } = mount(
      `<div id="quote" class="hidden"></div>
       <div id="quote-loader"></div>
       <button id="language-toggle" class="hidden"></button>
       <div id="language-announcement"></div>`
    );
    localStorage.setItem("settings", JSON.stringify({ typewriterEffect: false }));

    const storyData = [{ id: 1, story: "Line1\nLine2\n\nLine3" }];
    const metaData = [{ id: 1, title: "A" }];
    global.fetch = vi.fn((url) => {
      if (url.includes("aesopsFables.json")) {
        return Promise.resolve({ ok: true, json: async () => storyData });
      }
      return Promise.resolve({ ok: true, json: async () => metaData });
    });
    vi.spyOn(Math, "random").mockReturnValue(0);

    await loadQuote({ root: container });

    const contentHtml = query("#quote-content").innerHTML;
    expect(contentHtml).toBe("<p>Line1<br>Line2</p><br><p>Line3</p><br>");
    localCleanup();
  });

  it("renders fallback message when fetch fails", async () => {
    const {
      container,
      query,
      cleanup: localCleanup
    } = mount(`<div id="quote"></div><div id="quote-loader"></div>`);
    localStorage.setItem("settings", JSON.stringify({ typewriterEffect: false }));

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    global.fetch = vi.fn().mockRejectedValue(new Error("fail"));

    await loadQuote({ root: container });

    expect(query("#quote").innerHTML).toBe(
      "<p>Take a breath. Even a still pond reflects the sky.</p>"
    );
    localCleanup();
    consoleErrorSpy.mockRestore();
  });

  it("handles empty or invalid quote data gracefully", async () => {
    const {
      container,
      query,
      cleanup: localCleanup
    } = mount(`<div id="quote"></div><div id="quote-loader"></div>`);
    localStorage.setItem("settings", JSON.stringify({ typewriterEffect: false }));

    // Empty array
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => [] }));
    await loadQuote({ root: container });
    expect(query("#quote").textContent).toContain("Take a breath");

    // Invalid data
    global.fetch = vi.fn(() => Promise.resolve({ ok: true, json: async () => [{}] }));
    await loadQuote({ root: container });
    expect(query("#quote").textContent).toContain("Take a breath");
    localCleanup();
  });

  it("does not throw if DOM elements are missing", async () => {
    localStorage.setItem("settings", JSON.stringify({ typewriterEffect: false }));
    global.fetch = vi.fn((url) => {
      if (url.includes("aesopsFables.json")) {
        return Promise.resolve({ ok: true, json: async () => [{ id: 1, story: "B" }] });
      }
      return Promise.resolve({ ok: true, json: async () => [{ id: 1, title: "A" }] });
    });
    await loadQuote({ root: document });
    // Should not throw even if #quote, #quote-loader, or #language-toggle are missing
  });
});

describe("formatFableStory", () => {
  it("returns empty string for null or undefined", () => {
    expect(formatFableStory(null)).toBe("");
    expect(formatFableStory(undefined)).toBe("");
  });
});
