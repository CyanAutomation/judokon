import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { init } from "../../src/pages/battleClassic.init.js";
import * as uiHelpers from "../../src/helpers/classicBattle/uiHelpers.js";
import { withMutedConsole } from "../utils/console.js";

describe("Classic Battle UI Event Binding", () => {
  let dom;
  let window;
  let document;

  beforeEach(async () => {
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
      showRoundSelectModal: true
    };
  });

  afterEach(() => {
    dom?.window?.close();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("should call selectStat with the correct stat when a stat button is clicked", async () => {
    const selectStatSpy = vi.spyOn(uiHelpers, "selectStat");

    await withMutedConsole(async () => {
      await init();
    });

    const testApi = window.__TEST_API;
    await withMutedConsole(async () => {
      const isReady = await testApi.init.waitForBattleReady(5000);
      expect(isReady).toBe(true);
    });

    // Start a round to make stat buttons visible
    const roundButtons = Array.from(document.querySelectorAll(".round-select-buttons button"));
    expect(roundButtons.length).toBeGreaterThan(0);

    await withMutedConsole(async () => {
      roundButtons[0].click();
      await Promise.resolve();
      await testApi.state.waitForBattleState("waitingForPlayerAction", 5000);
    });

    const statButtons = Array.from(document.querySelectorAll("#stat-buttons button[data-stat]"));
    expect(statButtons.length).toBeGreaterThan(0);

    const firstStatButton = statButtons[0];
    const stat = firstStatButton.dataset.stat;

    // Simulate a user click on the first stat button
    firstStatButton.click();

    // Check if selectStat was called with the correct arguments
    expect(selectStatSpy).toHaveBeenCalled();
    expect(selectStatSpy).toHaveBeenCalledWith(expect.anything(), stat);
  });
});
