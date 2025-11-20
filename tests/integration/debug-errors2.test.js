import { beforeEach, afterEach, it } from "vitest";
import { JSDOM } from "jsdom";
import { init } from "../../src/pages/battleClassic.init.js";

describe("Debug errors", () => {
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

    const originalError = console.error;
    consoleErrors = [];
    console.error = (...args) => {
      consoleErrors.push(args.map(a => String(a)).join(' '));
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

  it("show all errors", async () => {
    await init();

    await new Promise(r => setTimeout(r, 200));

    const allButtons = Array.from(document.querySelectorAll("button"));
    const roundButtons = allButtons.filter(b => b.id?.includes("round-select"));
    
    roundButtons[0].click();
    
    await new Promise(r => setTimeout(r, 1000));
    
    const battleErrors = consoleErrors.filter(e => e.includes("battleClassic:"));
    battleErrors.forEach(e => console.log("ERROR:", e));
  });
});
