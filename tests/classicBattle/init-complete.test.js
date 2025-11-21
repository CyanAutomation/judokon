/**
 * Test for deterministic initialization hooks in Classic Battle.
 * Ensures that after successful initialization, the required test hooks are exposed
 * and the init-complete event is dispatched.
 */
// @vitest-environment node

import { describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { init } from "../../src/pages/battleClassic.init.js";

// Read HTML file at module load time, before any test runs and before vi.resetModules() can affect it
const cwd = process.cwd();
const sep = process.platform === "win32" ? "\\" : "/";
const htmlPathInit = cwd + sep + "src" + sep + "pages" + sep + "battleClassic.html";
const htmlContentInit = readFileSync(htmlPathInit, "utf-8");

describe("Classic Battle Init Complete Hooks", () => {
  let dom;
  let window;
  let document;

  beforeEach(async () => {
    dom = new JSDOM(htmlContentInit, {
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
  });

  it("signals readiness through init-complete dispatch", async () => {
    let eventFired = false;
    let eventDetail = null;
    let initCompleteButtons = [];

    const eventHandler = (event) => {
      eventFired = true;
      eventDetail = event;
      initCompleteButtons = Array.from(
        document.querySelectorAll(".round-select-buttons button")
      ).map((button) => ({
        disabled: button.disabled,
        label: button.textContent?.trim() ?? "",
        tooltipId: button.dataset.tooltipId ?? null
      }));
    };

    document.addEventListener("battle:init-complete", eventHandler);

    await init();

    expect(eventFired).toBe(true);
    expect(eventDetail).toBeInstanceOf(Event);
    expect(eventDetail.type).toBe("battle:init-complete");
    expect(document.querySelector(".round-select-buttons")).not.toBeNull();
    expect(initCompleteButtons.length).toBeGreaterThan(0);
    initCompleteButtons.forEach(({ disabled, label, tooltipId }) => {
      expect(disabled).toBe(false);
      expect(label).not.toBe("");
      expect(tooltipId).toMatch(/^ui\.round/);
    });

    document.removeEventListener("battle:init-complete", eventHandler);
  });
});
