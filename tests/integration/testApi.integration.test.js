import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JSDOM } from "jsdom";
import { init } from "../../src/pages/battleClassic.init.js";
import { withMutedConsole } from "../utils/console.js";
import { resetOrchestratorForTest } from "../../src/helpers/classicBattle/orchestrator.js";

describe("Test API integration", () => {
  let dom;
  let window;
  let document;

  beforeEach(async () => {
    let htmlContent;
    try {
      const fs = require("fs");
      const path = require("path");
      const htmlPath = path.join(process.cwd(), "src/pages/battleClassic.html");
      htmlContent = fs.readFileSync(htmlPath, "utf-8");
    } catch (error) {
      throw new Error(`Failed to load HTML file: ${error.message}`);
    }

    dom = new JSDOM(htmlContent, {
      url: "http://localhost:3000/battleClassic.html",
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true
    });

    window = dom.window;
    document = window.document;

    global.window = window;
    global.document = window.document;
    globalThis.document = window.document;
    globalThis.window = window;
    global.navigator = window.navigator;
    global.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };

    global.fetch = vi.fn(async (url) => {
      const fs = require("fs");
      const path = require("path");
      const urlStr = typeof url === "string" ? url : url.toString();
      const match = urlStr.match(/\/src\/data\/[\w-]+\.json$/);
      if (match) {
        try {
          const filePath = path.join(process.cwd(), match[0]);
          const content = fs.readFileSync(filePath, "utf-8");
          return {
            ok: true,
            json: async () => JSON.parse(content),
            text: async () => content
          };
        } catch (error) {
          return {
            ok: false,
            status: 404,
            json: async () => { throw new Error(`File not found: ${match[0]}`); },
            text: async () => { throw new Error(`File not found: ${match[0]}`); }
          };
        }
      }

      return {
        ok: true,
        json: async () => [],
        text: async () => "[]"
      };
    });

    window.fetch = global.fetch;

    window.__TEST__ = true;
    window.__FF_OVERRIDES = {
      battleStateBadge: true,
      showRoundSelectModal: true,
      enableTestMode: true
    };
  });

  afterEach(() => {
    dom?.window?.close();
    vi.clearAllMocks();
    resetOrchestratorForTest();
  });

  it("drives classic battle state through the test API", async () => {
    await init();

    const testApi = window.__TEST_API;
    expect(testApi).toBeDefined();
    await withMutedConsole(async () => {
      const ready = await testApi.init.waitForBattleReady(5000);
      expect(ready).toBe(true);
    });

    const store = testApi.inspect.getBattleStore();
    expect(store).toBeTruthy();
    expect(store.orchestrator).toBeTruthy();

    const roundButtons = Array.from(document.querySelectorAll(".round-select-buttons button"));
    expect(roundButtons.length).toBeGreaterThan(0);

    await withMutedConsole(async () => {
      roundButtons[0].click();
      await Promise.resolve();
      await testApi.state.waitForBattleState("waitingForPlayerAction", 5000);
    });

    expect(["waitingForPlayerAction", "matchStart"]).toContain(testApi.state.getBattleState());
    expect(store.selectionMade).toBe(false);
  });
});
