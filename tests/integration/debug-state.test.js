import { beforeEach, afterEach, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { init } from "../../src/pages/battleClassic.init.js";
import { withMutedConsole } from "../utils/console.js";

describe("Debug state transitions", () => {
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

  it("debug initial state and click handling", async () => {
    await init();

    const testApi = window.__TEST_API;
    console.log("Initial state:", testApi?.state?.getBattleState());
    console.log("Test API available:", !!testApi);
    console.log("Has waitForBattleState:", typeof testApi?.state?.waitForBattleState);

    const roundButtons = Array.from(document.querySelectorAll(".round-select-buttons button"));
    console.log("Round buttons found:", roundButtons.length);

    if (roundButtons.length > 0) {
      console.log("Clicking round button");
      
      let stateAfterClick = null;
      await withMutedConsole(async () => {
        roundButtons[0].click();
        stateAfterClick = testApi?.state?.getBattleState();
      });
      
      console.log("State immediately after click:", stateAfterClick);
      
      // Wait a bit and check again
      await new Promise(r => setTimeout(r, 200));
      console.log("State after 200ms:", testApi?.state?.getBattleState());
    }
    
    expect(true).toBe(true);
  });
});
