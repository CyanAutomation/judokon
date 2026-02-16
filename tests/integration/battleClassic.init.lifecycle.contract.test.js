// @vitest-environment node

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { init } from "../../src/pages/battleClassic.init.js";
import { onBattleEvent, offBattleEvent } from "../../src/helpers/classicBattle/battleEvents.js";

let htmlContent;

function getBattleClassicHtml() {
  if (!htmlContent) {
    htmlContent = readFileSync(`${process.cwd()}/src/pages/battleClassic.html`, "utf-8");
  }
  return htmlContent;
}

describe("battleClassic init lifecycle contract", () => {
  let dom;
  let window;
  let listener;

  beforeEach(() => {
    dom = new JSDOM(getBattleClassicHtml(), {
      url: "http://localhost:3000/battleClassic.html",
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true
    });

    window = dom.window;
    global.window = window;
    global.document = window.document;
    Object.defineProperty(global, "navigator", {
      value: window.navigator,
      writable: true,
      configurable: true
    });
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
    if (listener) {
      offBattleEvent("classicBattle.init.lifecycle", listener);
      listener = null;
    }
    dom?.window?.close();
    vi.clearAllMocks();
  });

  it("emits deterministic lifecycle phase order", async () => {
    const phases = [];
    listener = (event) => {
      phases.push(event?.detail?.phase);
    };
    onBattleEvent("classicBattle.init.lifecycle", listener);

    await init();

    expect(phases).toEqual([
      "dependency-build:start",
      "dependency-build:complete",
      "view-wiring:pre-match:start",
      "view-wiring:pre-match:complete",
      "match-start:start",
      "match-start:complete",
      "view-wiring:post-match:start",
      "view-wiring:post-match:complete",
      "finalize:complete"
    ]);
  });
});
