/**
 * Test for deterministic initialization of Classic Battle.
 * Verifies that initialization completes successfully, sets up required state,
 * and renders the expected UI elements.
 *
 * This test directly verifies DOM state and exposed test APIs rather than
 * relying on events or timers, making it robust and deterministic.
 */
// @vitest-environment node

import { describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { createBattleClassic } from "../../src/pages/battleClassic.init.js";

// Defer reading HTML file until after Node environment is setup
let htmlContentInit;
function getHtmlContentInit() {
  if (!htmlContentInit) {
    const cwd = process.cwd();
    const sep = process.platform === "win32" ? "\\" : "/";
    const htmlPathInit = cwd + sep + "src" + sep + "pages" + sep + "battleClassic.html";
    htmlContentInit = readFileSync(htmlPathInit, "utf-8");
  }
  return htmlContentInit;
}

describe("Classic Battle Initialization", () => {
  let dom;
  let window;
  let document;

  beforeEach(async () => {
    dom = new JSDOM(getHtmlContentInit(), {
      url: "http://localhost:3000/battleClassic.html",
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true
    });

    window = dom.window;
    document = window.document;

    global.window = window;
    global.document = document;
    // Use Object.defineProperty to set navigator since it's read-only in Node
    Object.defineProperty(global, "navigator", {
      value: window.navigator,
      writable: true,
      configurable: true
    });
    global.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };

    // Set feature flags for consistent test environment
    window.__FF_OVERRIDES = {
      showRoundSelectModal: true
    };
  });

  afterEach(() => {
    dom?.window?.close();
    vi.clearAllMocks();
  });

  it("completes initialization and sets up required UI state", async () => {
    const battleClassic = createBattleClassic();
    await battleClassic.readyPromise;

    // Verify test API is exposed for testing
    expect(window.__TEST_API).toBeDefined();

    // Verify round select UI is rendered
    const roundSelectButtons = document.querySelectorAll(".round-select-buttons button");
    expect(roundSelectButtons.length).toBeGreaterThan(0);

    // Verify each button has required attributes and properties
    roundSelectButtons.forEach((button) => {
      expect(button.disabled).toBe(false);
      expect(button.textContent?.trim()).not.toBe("");

      const tooltipId = button.dataset.tooltipId;
      expect(tooltipId).toBeDefined();
      expect(tooltipId).toMatch(/^ui\.round/);
    });

    // Verify core UI elements are present
    expect(document.querySelector("#opponent-card")).not.toBeNull();
    expect(document.querySelector("#score-display")).not.toBeNull();
    expect(document.querySelector("#round-counter")).not.toBeNull();
  });
});
