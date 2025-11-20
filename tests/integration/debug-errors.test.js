import { beforeEach, afterEach, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { init } from "../../src/pages/battleClassic.init.js";

describe("Debug errors in startRoundCycle", () => {
  let dom;
  let window;
  let document;
  let consoleErrors = [];

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

    // Capture console errors
    const originalError = console.error;
    consoleErrors = [];
    console.error = (...args) => {
      consoleErrors.push(args.join(' '));
      originalError(...args);
    };

    window.__FF_OVERRIDES = {
      battleStateBadge: true,
      showRoundSelectModal: true
    };
  });

  afterEach(() => {
    dom?.window?.close();
  });

  it("capture any errors during round start", async () => {
    await init();

    // Wait for modal
    await new Promise(r => setTimeout(r, 200));

    // Find and click button
    const allButtons = Array.from(document.querySelectorAll("button"));
    const roundButtons = allButtons.filter(b => b.id?.includes("round-select"));
    
    expect(roundButtons.length).toBeGreaterThan(0);
    
    roundButtons[0].click();
    
    // Wait for any errors to be logged
    await new Promise(r => setTimeout(r, 1000));
    
    // Report all errors
    if (consoleErrors.length > 0) {
      console.log("=== ERRORS CAPTURED ===");
      consoleErrors.forEach(e => console.log(e));
    }
    
    // Check test API
    const testApi = window.__TEST_API;
    const state = testApi?.state?.getBattleState();
    console.log("Final state:", state);
    
    expect(consoleErrors.filter(e => e.includes("battleClassic:")).length).toBe(0);
  });
});
