import { beforeEach, afterEach, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { init } from "../../src/pages/battleClassic.init.js";

describe("Debug timing issues", () => {
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

  it("wait longer for state transition", async () => {
    await init();

    // Wait for modal to appear
    await new Promise(r => setTimeout(r, 500));

    // Find and click button
    const allButtons = Array.from(document.querySelectorAll("button"));
    const roundButtons = allButtons.filter(b => b.id?.includes("round-select"));
    
    expect(roundButtons.length).toBeGreaterThan(0);
    
    roundButtons[0].click();
    
    // Wait progressively longer and check state
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 200));
      const testApi = window.__TEST_API;
      const state = testApi?.state?.getBattleState();
      console.log(`State at ${(i + 1) * 200}ms:`, state);
      if (state === "waitingForPlayerAction") {
        expect(state).toBe("waitingForPlayerAction");
        return;
      }
    }
    
    // If we get here, state never reached waitingForPlayerAction
    const testApi = window.__TEST_API;
    const finalState = testApi?.state?.getBattleState();
    expect(finalState).toBe("waitingForPlayerAction");
  });
});
