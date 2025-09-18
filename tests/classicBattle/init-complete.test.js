/**
 * Test for deterministic initialization hooks in Classic Battle.
 * Ensures that after successful initialization, the required test hooks are exposed
 * and the init-complete event is dispatched.
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

  it("sets window.__battleInitComplete to true after successful init", async () => {
    expect(window.__battleInitComplete).toBeUndefined();

    await init();

    expect(window.__battleInitComplete).toBe(true);
  });

  it("exposes window.battleStore after successful init", async () => {
    expect(window.battleStore).toBeUndefined();

    await init();

    expect(window.battleStore).toBeDefined();
    expect(typeof window.battleStore).toBe("object");
  });

  it("dispatches battle:init-complete event after successful init", async () => {
    let eventFired = false;
    let eventDetail = null;

    const eventHandler = (event) => {
      eventFired = true;
      eventDetail = event;
    };

    document.addEventListener("battle:init-complete", eventHandler);

    await init();

    expect(eventFired).toBe(true);
    expect(eventDetail).toBeInstanceOf(Event);
    expect(eventDetail.type).toBe("battle:init-complete");

    document.removeEventListener("battle:init-complete", eventHandler);
  });

  it("all hooks are set together after init", async () => {
    let eventFired = false;
    document.addEventListener("battle:init-complete", () => {
      eventFired = true;
    });

    await init();

    expect(window.__battleInitComplete).toBe(true);
    expect(window.battleStore).toBeDefined();
    expect(eventFired).toBe(true);
  });
});
