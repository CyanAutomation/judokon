import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { init } from "../../src/pages/battleClassic.init.js";
import { setupOpponentDelayControl } from "../utils/battleTestUtils.js";

/**
 * Completes the first round of battle by clicking round and stat buttons.
 *
 * @param {Document} document - The DOM document for the battle page.
 * @param {Object} testApi - The test API object for state management.
 *
 * @pseudocode
 * completeFirstRound(document, testApi):
 *   1. Find and click first round button (expects at least one button)
 *   2. Wait for orchestrator to reach waitingForPlayerAction state
 *   3. Verify stat buttons appear (indicates we reached waitingForPlayerAction state)
 *   4. Find and click first stat button (expects at least one button)
 *   5. Assert all state transitions completed successfully
 */
async function completeFirstRound(document, testApi) {
  const roundButtons = Array.from(document.querySelectorAll(".round-select-buttons button"));
  expect(roundButtons.length).toBeGreaterThan(0);

  // Click round button and wait for orchestrator state transition
  await new Promise(async (resolve) => {
    roundButtons[0].click();
    // Wait for async handlers and orchestrator state transition to complete
    try {
      await testApi.state.waitForBattleState("waitingForPlayerAction", 5000);
    } catch (e) {
      // Fallback if state transition fails
    }
    resolve();
  });

  const statButtons = Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
  expect(statButtons.length).toBeGreaterThan(0);

  const opponentCard = document.getElementById("opponent-card");
  expect(opponentCard).not.toBeNull();
  expect(opponentCard?.classList.contains("opponent-hidden")).toBe(false);
  expect(opponentCard?.classList.contains("is-obscured")).toBe(true);
  const placeholder = opponentCard?.querySelector("#mystery-card-placeholder");
  expect(placeholder).not.toBeNull();

  await new Promise((resolve) => {
    statButtons[0].click();
    // Wait for async handlers to complete after stat selection
    let frameCount = 0;
    const checkFrames = () => {
      frameCount++;
      if (frameCount < 5) {
        if (typeof window.requestAnimationFrame === "function") {
          window.requestAnimationFrame(checkFrames);
        } else {
          setTimeout(checkFrames, 0);
        }
      } else {
        resolve();
      }
    };
    Promise.resolve().then(() => {
      if (typeof window.requestAnimationFrame === "function") {
        window.requestAnimationFrame(checkFrames);
      } else {
        setTimeout(checkFrames, 0);
      }
    });
  });
}

/**
 * Waits for the placeholder replacement to complete after round resolution.
 *
 * @param {Object} testApi - The test API object for state management.
 *
 * @pseudocode
 * waitForPlaceholderReplacement(testApi):
 *   1. Wait for rounds played count to reach exactly 1
 *   2. Assert completion was successful (roundCompleted === true)
 *   3. Ensures placeholder replacement has occurred after first round
 */
async function waitForPlaceholderReplacement(testApi) {
  const roundCompleted = await testApi.state.waitForRoundsPlayed(1);
  expect(roundCompleted).toBe(true);
}

/**
 * @fileoverview Integration tests validating the Battle Classic opponent placeholder lifecycle.
 * @testsetup Uses the real battle init flow with JSDOM to verify placeholder accessibility and replacement logic.
 */
describe("Battle Classic opponent placeholder integration", () => {
  let dom;
  let window;
  let document;

  beforeEach(async () => {
    // Read HTML file using Node's built-in require to bypass vi.resetModules() issues
    const fs = require("fs");
    const path = require("path");
    const htmlPath = path.join(process.cwd(), "src/pages/battleClassic.html");
    const htmlContent = fs.readFileSync(htmlPath, "utf-8");

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

    window.__FF_OVERRIDES = {
      battleStateBadge: true,
      showRoundSelectModal: true
    };
  });

  afterEach(() => {
    dom?.window?.close();
    vi.clearAllMocks();
    // Note: vi.resetModules() is not used because it clears ALL modules including Node.js built-ins,
    // causing the next test's beforeEach to fail when trying to use fs/path functions
  });

  it("renders an accessible opponent placeholder card before any reveal", async () => {
    await init();

    const opponentCard = document.getElementById("opponent-card");
    expect(opponentCard).not.toBeNull();
    expect(opponentCard?.classList.contains("opponent-hidden")).toBe(false);

    const placeholder = opponentCard.querySelector("#mystery-card-placeholder");
    expect(placeholder).not.toBeNull();
    expect(placeholder.classList.contains("card")).toBe(true);
    expect(placeholder.getAttribute("aria-label")).toBe("Mystery opponent card");
  });

  it("replaces the placeholder with the revealed opponent card after the first stat resolution", async () => {
    await init();

    const opponentCard = document.getElementById("opponent-card");
    expect(opponentCard).not.toBeNull();

    const placeholder = opponentCard.querySelector("#mystery-card-placeholder");
    expect(placeholder).not.toBeNull();

    const testApi = window.__TEST_API;
    expect(testApi).toBeDefined();
    expect(testApi?.state?.waitForBattleState).toBeTypeOf("function");

    const { resetOpponentDelay, setOpponentDelayToZero } = setupOpponentDelayControl(testApi);
    setOpponentDelayToZero();

    try {
      await completeFirstRound(document, testApi);
      await waitForPlaceholderReplacement(testApi);
    } finally {
      resetOpponentDelay();
    }

    expect(opponentCard.querySelector("#mystery-card-placeholder")).toBeNull();
    const revealedContainer = opponentCard.querySelector(".card-container");
    expect(revealedContainer).not.toBeNull();
    const revealedCard = revealedContainer?.querySelector(".judoka-card");
    expect(revealedCard).not.toBeNull();
    expect(revealedCard?.getAttribute("aria-label") ?? "").not.toContain("Mystery");
    expect(opponentCard?.getAttribute("aria-label")).toBe("Opponent card");
    expect(opponentCard?.classList.contains("is-obscured")).toBe(false);
  });
});
