/**
 * Test for deterministic initialization hooks in Classic Battle.
 * Ensures that after successful initialization, the required test hooks are exposed
 * and the init-complete event is dispatched.
 *
 * This suite intentionally validates readiness via the dispatched DOM event instead of
 * asserting the legacy `window.__battleInitComplete` marker.
 */

import { describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { join } from "path";
import { init } from "../../src/pages/battleClassic.init.js";

describe("Classic Battle Init Complete Hooks", () => {
  let dom;
  let window;
  let document;

  beforeEach(async () => {
    const htmlPath = join(process.cwd(), "src/pages/battleClassic.html");
    const htmlContent = readFileSync(htmlPath, "utf-8");

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

    // Set feature flags for consistent test environment
    window.__FF_OVERRIDES = {
      showRoundSelectModal: true
    };
  });

  afterEach(() => {
    dom?.window?.close();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("signals readiness through init-complete dispatch and exposed hooks", async () => {
    const eventPromise = new Promise((resolve) => {
      document.addEventListener(
        "battle:init-complete",
        (event) => resolve(event),
        { once: true }
      );
    });

    const initPromise = init();
    const eventDetail = await eventPromise;
    await initPromise;

    expect(eventDetail).toBeInstanceOf(Event);
    expect(eventDetail.type).toBe("battle:init-complete");
    expect(window.battleStore).toBeDefined();
    expect(document.querySelector(".round-select-buttons")).not.toBeNull();
  });
});
