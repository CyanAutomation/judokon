import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { withMutedConsole } from "../utils/console.js";
import { init } from "../../src/pages/battleClassic.init.js";

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
    // Clear the custom handler property from stat-buttons container
    // This property persists on the DOM element even after module reset
    try {
      const container = document.getElementById("stat-buttons");
      if (container) {
        delete container.__classicBattleStatHandler;
      }
    } catch {}
    
    dom?.window?.close();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("should attach a click event handler when stat buttons are initialized", async () => {
    // Spy on initStatButtons to see if it's called
    vi.spyOn(require("../../src/helpers/classicBattle/uiHelpers.js"), "initStatButtons");

    await withMutedConsole(async () => {
      await init();
    });

    const container = document.getElementById("stat-buttons");
    expect(container).toBeDefined();

    // Check if the handler property was set on the container
    // This property is set by registerStatButtonClickHandler when the handler is attached
    const handlerWasRegistered = !!container.__classicBattleStatHandler;
    
    expect(handlerWasRegistered).toBe(true);
  });
});




