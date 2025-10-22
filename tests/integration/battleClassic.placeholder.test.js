import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { join } from "path";
import { init } from "../../src/pages/battleClassic.init.js";
import { withMutedConsole } from "../utils/console.js";
import { setupOpponentDelayControl } from "../utils/battleTestUtils.js";

async function completeFirstRound(document, testApi) {
  const roundButtons = Array.from(document.querySelectorAll(".round-select-buttons button"));
  expect(roundButtons.length).toBeGreaterThan(0);

  let reachedPlayerAction = false;
  await withMutedConsole(async () => {
    roundButtons[0].click();
    reachedPlayerAction = await testApi.state.waitForBattleState("waitingForPlayerAction");
  });
  expect(reachedPlayerAction).toBe(true);

  const statButtons = Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
  expect(statButtons.length).toBeGreaterThan(0);

  let reachedRoundDecision = false;
  await withMutedConsole(async () => {
    statButtons[0].click();
    reachedRoundDecision = await testApi.state.waitForBattleState("roundDecision");
  });
  expect(reachedRoundDecision).toBe(true);
}

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

    window.__FF_OVERRIDES = {
      battleStateBadge: true,
      showRoundSelectModal: true
    };
  });

  afterEach(() => {
    dom?.window?.close();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("renders an accessible opponent placeholder card before any reveal", async () => {
    await init();

    const opponentCard = document.getElementById("opponent-card");
    expect(opponentCard).not.toBeNull();

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
  });
});
