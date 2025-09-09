/**
 * Improved test using real HTML structure instead of manual DOM manipulation
 * Demonstrates selective reduction of manual DOM where it provides value
 */

import { beforeEach, afterEach, describe, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { join } from "path";
import { setOpponentDelay } from "../../src/helpers/classicBattle/snackbar.js";
import { bindUIHelperEventHandlersDynamic } from "../../src/helpers/classicBattle/uiEventHandlers.js";
import { emitBattleEvent } from "../../src/helpers/classicBattle/battleEvents.js";

describe("UI handlers: opponent message (Improved with Real HTML)", () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
    // Load actual HTML file for complete structure
    const htmlPath = join(process.cwd(), "src/pages/battleClassic.html");
    const htmlContent = readFileSync(htmlPath, "utf-8");

    dom = new JSDOM(htmlContent, {
      url: "http://localhost:3000/battleClassic.html",
      pretendToBeVisual: true
    });

    window = dom.window;
    document = window.document;
    global.window = window;
    global.document = document;
  });

  afterEach(() => {
    dom?.window?.close();
  });

  it("shows snackbar 'Opponent is choosing…' with real HTML structure", async () => {
    // Real HTML has proper snackbar container with correct attributes
    const snackContainer = document.getElementById("snackbar-container");
    expect(snackContainer).toBeTruthy();
    expect(snackContainer.getAttribute("aria-live")).toBe("polite");
    expect(snackContainer.getAttribute("aria-atomic")).toBe("true");

    // Real HTML has round message element
    const roundMessage = document.getElementById("round-message");
    expect(roundMessage).toBeTruthy();
    expect(roundMessage.getAttribute("aria-live")).toBe("polite");

    setOpponentDelay(10);
    bindUIHelperEventHandlersDynamic();
    emitBattleEvent("statSelected", { opts: {} });

    // Wait just beyond the configured delay
    await new Promise((r) => setTimeout(r, 15));

    const snack = document.getElementById("snackbar-container");
    expect(snack.textContent || "").toMatch(/Opponent is choosing/i);
  });

  it("demonstrates advantages over manual DOM", () => {
    // Real HTML structure provides additional validation opportunities
    const snackContainer = document.getElementById("snackbar-container");

    // Manual DOM test would miss these important attributes:
    expect(snackContainer.getAttribute("aria-live")).toBe("polite");
    expect(snackContainer.getAttribute("aria-atomic")).toBe("true");
    // Note: Real HTML doesn't have role="status" - this shows integration testing reveals actual structure

    // Manual DOM test would miss the complete page structure:
    expect(document.querySelector("header[role='banner']")).toBeTruthy();
    expect(document.querySelector("main[role='main']")).toBeTruthy();

    // This validates the snackbar works in the context of the full page
    expect(snackContainer.parentElement.tagName).toBe("BODY");
  });
});
