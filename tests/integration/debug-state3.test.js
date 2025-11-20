import { beforeEach, afterEach, it, expect } from "vitest";
import { JSDOM } from "jsdom";
import { init } from "../../src/pages/battleClassic.init.js";

describe("Debug state transitions - check modal", () => {
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

  it("check if modal is shown", async () => {
    await init();

    // Wait for modal to appear
    await new Promise(r => setTimeout(r, 500));

    // Check if modal dialog exists
    const modal = document.querySelector("dialog");
    expect(modal).not.toBeNull();
    
    // Check if modal is open
    expect(modal?.open).toBe(true);
    
    // Check for round select buttons
    const roundButtons = modal?.querySelectorAll("button");
    expect(roundButtons?.length).toBeGreaterThan(0);
  });
});
