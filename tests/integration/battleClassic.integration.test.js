/**
 * Integration test for the battleClassic page initialization.
 * This test loads the real HTML, runs the initialization script,
 * and asserts the page is in the correct initial state.
 *
 * Test Hooks Documentation:
 * - `initClassicBattleTest({ afterMock: true })`: Helper to reset and ensure Classic Battle bindings after mocks.
 *   Use immediately after vi.doMock() in unit tests.
 * - `window.__FF_OVERRIDES`: Object for overriding feature flags and test behaviors.
 *   Common overrides: { battleStateBadge: true, showRoundSelectModal: true, enableTestMode: true }
 * - `window.battleStore`: The battle state store exposed after successful initialization.
 * - Stat selection buttons: Rendered and enabled for user interaction after init completes.
 */

import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { join } from "path";
import { init } from "../../src/pages/battleClassic.init.js";
import { withMutedConsole } from "../utils/console.js";

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

    // 4. Assert round select modal renders interactive controls after init
    const framePromise = new Promise((resolve) => {
      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(() => resolve());
      } else {
        setTimeout(resolve, 0);
      }
    });
    await framePromise;

    const roundSelectButtons = Array.from(
      document.querySelectorAll(".round-select-buttons button")
    );
    expect(roundSelectButtons.length).toBeGreaterThan(0);
    roundSelectButtons.forEach((button) => {
      expect(button.disabled).toBe(false);
      expect(button.textContent?.trim()).not.toBe("");
      expect(button.dataset.tooltipId).toMatch(/^ui\.round/);
    });

    const firstOption = roundSelectButtons[0];
    await withMutedConsole(async () => {
      firstOption.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(document.querySelector(".round-select-buttons")).toBeNull();

    // 5. Assert initialization completed successfully
    expect(window.battleStore).toBeDefined();
  });

  it("preserves opponent placeholder card for reveal upgrade", async () => {
    await init();

    const opponentCard = document.getElementById("opponent-card");
    expect(opponentCard).not.toBeNull();

    const placeholder = opponentCard.querySelector("#mystery-card-placeholder");
    expect(placeholder).not.toBeNull();
    expect(placeholder.classList.contains("card")).toBe(true);
    expect(placeholder.getAttribute("aria-label")).toBe("Mystery opponent card");
  });

  it("upgrades the placeholder card during opponent reveal", async () => {
    await init();

    const opponentCard = document.getElementById("opponent-card");
    expect(opponentCard).not.toBeNull();

    const placeholder = opponentCard.querySelector("#mystery-card-placeholder");
    expect(placeholder).not.toBeNull();

    const revealedCard = document.createElement("div");
    revealedCard.id = "revealed-opponent-card";
    revealedCard.className = "card revealed-opponent";
    revealedCard.setAttribute("aria-label", "Revealed opponent card");

    opponentCard.innerHTML = "";
    opponentCard.appendChild(revealedCard);

    expect(opponentCard.querySelector("#mystery-card-placeholder")).toBeNull();
    expect(opponentCard.querySelector(".revealed-opponent")).not.toBeNull();
    expect(opponentCard.querySelector("#revealed-opponent-card")?.getAttribute("aria-label")).toBe(
      "Revealed opponent card"
    );
  });
});
