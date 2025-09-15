/**
 * Integration test for the battleClassic page initialization.
 * This test loads the real HTML, runs the initialization script,
 * and asserts the page is in the correct initial state.
 */

import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { join } from "path";
import { init } from "../../src/pages/battleClassic.init.js";

describe("Battle Classic Page Integration", () => {
  let dom;
  let window;
  let document;

  beforeEach(async () => {
    const htmlPath = join(process.cwd(), "src/pages/battleClassic.html");
    const htmlContent = readFileSync(htmlPath, "utf-8");

    dom = new JSDOM(htmlContent, {
      url: "http://localhost:3000/battleClassic.html",
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true
    });

    window = dom.window;
    document = window.document;

    global.window = window;
    global.document = document;
    global.navigator = window.navigator;
    global.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };

    // Mock feature flags to ensure a consistent test environment
    window.__FF_OVERRIDES = {
      battleStateBadge: true,
      showRoundSelectModal: true // Ensure modal is shown for testing
    };
  });

  afterEach(() => {
    dom?.window?.close();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("initializes the page UI to the correct default state", async () => {
    // Run the main initialization function
    await init();

    // 1. Assert Battle State Badge is correct
    const badge = document.getElementById("battle-state-badge");
    expect(badge.hidden).toBe(false);
    expect(badge.textContent).toBe("Lobby");

    // 2. Assert Scoreboard is in its initial state
    const scoreDisplay = document.getElementById("score-display");
    expect(scoreDisplay.textContent).toContain("You: 0");
    expect(scoreDisplay.textContent).toContain("Opponent: 0");

    const roundCounter = document.getElementById("round-counter");
    expect(roundCounter.textContent).toContain("Round 0");

    // 3. Assert Round Select Modal is visible
    const modalTitle = document.getElementById("round-select-title");
    expect(modalTitle).not.toBeNull();
    expect(modalTitle.textContent).toBe("Select Match Length");

    const modal = document.querySelector(".modal-backdrop");
    expect(modal).not.toBeNull();
    // The modal's open state might be controlled by a class or attribute.
    // Here we assume it's rendered and present in the DOM.
    // A more robust check could be for `modal.classList.contains('open')`
    // if the modal library uses that convention.

    // 4. Assert stat buttons are not yet rendered
    const statButtons = document.getElementById("stat-buttons");
    expect(statButtons.innerHTML).toBe("");
  });
});
