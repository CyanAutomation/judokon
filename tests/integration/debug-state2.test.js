import { beforeEach, afterEach, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { init } from "../../src/pages/battleClassic.init.js";
import { withMutedConsole } from "../utils/console.js";

describe("Debug state transitions - check DOM", () => {
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
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
      clear: () => {}
    };

    window.__FF_OVERRIDES = {
      battleStateBadge: true,
      showRoundSelectModal: true
    };
  });

  afterEach(() => {
    dom?.window?.close();
  });

  it("check round button structure", async () => {
    await init();

    // Check if round-select-buttons exists
    const roundSelectContainer = document.querySelector(".round-select-buttons");
    expect(roundSelectContainer).not.toBeNull();
    
    const roundButtons = Array.from(document.querySelectorAll(".round-select-buttons button"));
    expect(roundButtons.length).toBeGreaterThan(0);
    
    // Get test API
    const testApi = window.__TEST_API;
    expect(testApi).toBeDefined();
    
    const initialState = testApi?.state?.getBattleState();
    
    // Try to click and wait for state change
    await withMutedConsole(async () => {
      roundButtons[0].click();
      const result = await testApi.state.waitForBattleState("waitingForPlayerAction", 3000);
      expect(result).toBe(true);
    });
  });
});
