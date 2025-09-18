import { describe, it, expect, vi, afterEach } from "vitest";
import { loadQuote } from "../../src/helpers/quoteBuilder.js";
import { formatFableStory } from "../../src/helpers/quotes/quoteRenderer.js";
import * as quoteService from "../../src/helpers/quotes/quoteService.js";
import { mount, clearBody } from "./domUtils.js";

const SETTINGS_KEY = "settings";

function persistTypewriterPreference() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ typewriterEffect: false }));
}

function setupQuoteDom() {
  const dom = mount(`
    <div id="quote" class="hidden"></div>
    <div id="quote-loader"></div>
    <button id="language-toggle" class="hidden"></button>
    <div id="language-announcement"></div>
  `);
  return {
    ...dom,
    quote: dom.query("#quote"),
    loader: dom.query("#quote-loader"),
    toggle: dom.query("#language-toggle"),
    announcement: dom.query("#language-announcement")
  };
}

function stubRandomQuote(result) {
  return vi.spyOn(quoteService, "displayRandomQuote").mockResolvedValue(result);
}

afterEach(() => {
  vi.restoreAllMocks();
  clearBody();
  localStorage.clear();
});

describe("loadQuote", () => {
  it("reveals quote content and language controls once a fable is loaded", async () => {
    const { container, quote, loader, toggle, announcement, cleanup } = setupQuoteDom();
    persistTypewriterPreference();
    stubRandomQuote({ id: 1, title: "Aesop", story: "Line1\nLine2" });

    await loadQuote({ root: container });

    expect(loader.classList.contains("hidden")).toBe(true);
    expect(quote.classList.contains("hidden")).toBe(false);
    expect(toggle.classList.contains("hidden")).toBe(false);
    expect(toggle.getAttribute("aria-live")).toBe("polite");
    expect(document.activeElement).toBe(toggle);
    expect(announcement.textContent).toBe("language toggle available");
    cleanup();
  });

  it("renders fallback message and announces availability when service returns null", async () => {
    const { container, quote, loader, toggle, announcement, cleanup } = setupQuoteDom();
    persistTypewriterPreference();
    stubRandomQuote(null);
    const readyListener = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    window.addEventListener("quote:ready", readyListener);

    await loadQuote({ root: container });

    expect(quote.innerHTML).toBe("<p>Take a breath. Even a still pond reflects the sky.</p>");
    expect(loader.classList.contains("hidden")).toBe(true);
    expect(toggle.classList.contains("hidden")).toBe(false);
    expect(announcement.textContent).toBe("language toggle available");
    expect(consoleErrorSpy).not.toHaveBeenCalled();
    expect(readyListener).toHaveBeenCalledTimes(1);
    window.removeEventListener("quote:ready", readyListener);
    cleanup();
  });

  it("does not throw if DOM elements are missing", async () => {
    persistTypewriterPreference();
    stubRandomQuote({ id: 2, title: "Hidden", story: "Story" });

    await expect(loadQuote({ root: document })).resolves.toBeUndefined();
  });
});

describe("formatFableStory", () => {
  it("returns empty string for null or undefined", () => {
    expect(formatFableStory(null)).toBe("");
    expect(formatFableStory(undefined)).toBe("");
  });

  it("converts multi-paragraph markdown-like content into paragraph blocks", () => {
    const story = `Remember:\n- *Listen* first\n- **Act** wisely\n\nStay calm.\nKeep focus.`;

    expect(formatFableStory(story)).toBe(
      "<p>Remember:<br>- *Listen* first<br>- **Act** wisely</p><br>" +
        "<p>Stay calm.<br>Keep focus.</p><br>"
    );
  });

  it("normalizes escaped newline characters before formatting", () => {
    const story = "Line one\\nLine two\\n\\n*Closing*";

    expect(formatFableStory(story)).toBe("<p>Line one<br>Line two</p><br><p>*Closing*</p><br>");
  });
});
