import { beforeEach, afterEach, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { init } from "../../src/pages/battleClassic.init.js";

describe("Debug button click flow", () => {
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

  it("debug round button click and state broadcast", async () => {
    await init();

    // Wait for modal to appear
    await new Promise(r => setTimeout(r, 500));

    // Check for buttons
    const allButtons = Array.from(document.querySelectorAll("button"));
    const roundButtons = allButtons.filter(b => b.id?.includes("round-select"));
    
    expect(roundButtons.length).toBeGreaterThan(0);
    
    // Get state before click
    const testApi = window.__TEST_API;
    const stateBefore = testApi?.state?.getBattleState();
    console.log("State before click:", stateBefore);
    
    // Click the first round button
    const firstButton = roundButtons[0];
    console.log("Clicking button:", firstButton.id);
    
    firstButton.click();
    
    // Wait for state change
    await new Promise(r => setTimeout(r, 500));
    
    const stateAfter = testApi?.state?.getBattleState();
    console.log("State after click:", stateAfter);
    
    // Expected state should be "waitingForPlayerAction"
    expect(stateAfter).toBe("waitingForPlayerAction");
  });
});
