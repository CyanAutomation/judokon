import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { join } from "path";
import { init } from "../../src/pages/battleClassic.init.js";
import { withMutedConsole } from "../utils/console.js";

const waitForNextFrame = (window) =>
  new Promise((resolve) => {
    if (typeof window.requestAnimationFrame === "function") {
      window.requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });

describe("Battle Classic opponent placeholder integration", () => {
  let dom;
  let window;
  let document;

  beforeEach(() => {
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

    await waitForNextFrame(window);

    const roundButtons = Array.from(document.querySelectorAll(".round-select-buttons button"));
    expect(roundButtons.length).toBeGreaterThan(0);

    const testApi = window.__TEST_API;
    expect(testApi).toBeDefined();
    expect(testApi?.state?.waitForBattleState).toBeTypeOf("function");

    let reachedPlayerAction = false;
    await withMutedConsole(async () => {
      roundButtons[0].click();
      reachedPlayerAction = await testApi.state.waitForBattleState("waitingForPlayerAction");
    });
    expect(reachedPlayerAction).toBe(true);

    const statButtons = Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
    expect(statButtons.length).toBeGreaterThan(0);

    const resetOpponentDelay = () => {
      if (typeof testApi?.timers?.setOpponentResolveDelay === "function") {
        testApi.timers.setOpponentResolveDelay(null);
      }
    };

    if (typeof testApi?.timers?.setOpponentResolveDelay === "function") {
      testApi.timers.setOpponentResolveDelay(0);
    }

    let reachedRoundDecision = false;
    try {
      await withMutedConsole(async () => {
        statButtons[0].click();
        reachedRoundDecision = await testApi.state.waitForBattleState("roundDecision");
      });
    } finally {
      resetOpponentDelay();
    }
    expect(reachedRoundDecision).toBe(true);

    await waitForNextFrame(window);

    expect(opponentCard.querySelector("#mystery-card-placeholder")).toBeNull();
    const revealedContainer = opponentCard.querySelector(".card-container");
    expect(revealedContainer).not.toBeNull();
    const revealedCard = revealedContainer?.querySelector(".judoka-card");
    expect(revealedCard).not.toBeNull();
    expect(revealedCard?.getAttribute("aria-label") ?? "").not.toContain("Mystery");
  });
});
