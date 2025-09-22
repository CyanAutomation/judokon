import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { createTestController } from "../../src/utils/scheduler.js";
import { JSDOM } from "jsdom";
import { renderStatButtons } from "../../src/pages/battleClassic.init.js";

// Enable test controller access
globalThis.__TEST__ = true;

describe("Stat Buttons", () => {
  let dom;
  let testController;
  let originalPerformance;

  beforeEach(() => {
    originalPerformance = global.performance;
    dom = new JSDOM(
      `<!DOCTYPE html>
       <body>
         <div id="stat-buttons"></div>
         <button id="next-button" data-role="next-round"></button>
       </body>`,
      {
        url: "http://localhost:3000/battleClassic.html",
        pretendToBeVisual: true
      }
    );

    const { window } = dom;
    global.window = window;
    global.document = window.document;
    global.HTMLElement = window.HTMLElement;
    global.Node = window.Node;
    global.CustomEvent = window.CustomEvent;
    global.navigator = window.navigator;
    global.performance = window.performance;

    testController = createTestController();
  });

  afterEach(() => {
    try {
      testController?.dispose();
    } catch {}
    dom?.window?.close();
    vi.clearAllMocks();
    testController = undefined;
    delete global.window;
    delete global.document;
    delete global.HTMLElement;
    delete global.Node;
    delete global.CustomEvent;
    delete global.navigator;
    if (typeof originalPerformance === "undefined") {
      delete global.performance;
    } else {
      global.performance = originalPerformance;
    }
    originalPerformance = undefined;
  });

  it("should have aria-describedby and data-buttons-ready attributes", () => {
    const store = {};
    const container = document.getElementById("stat-buttons");
    expect(container).toBeTruthy();

    renderStatButtons(store);

    // Advance one frame to execute the RAF callback that sets up the buttons
    testController.advanceFrame();

    expect(container.dataset.buttonsReady).toBe("true");
    expect(container.getAttribute("data-buttons-ready")).toBe("true");

    const statButtons = container.querySelectorAll("button");
    expect(statButtons.length).toBeGreaterThan(0);
    statButtons.forEach((button) => {
      expect(button.getAttribute("aria-describedby")).toBe("round-message");
    });
  });
});
