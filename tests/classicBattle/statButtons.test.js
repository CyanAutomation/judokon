import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import installRAFMock from "../helpers/rafMock.js";
import { JSDOM } from "jsdom";
import { renderStatButtons } from "../../src/pages/battleClassic.init.js";

describe("Stat Buttons", () => {
  let dom;
  let restoreRaf;
  let flushAllFrames;

  beforeEach(() => {
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

    const rafControls = installRAFMock();
    restoreRaf = rafControls.restore;
    flushAllFrames = rafControls.flushAll;
  });

  afterEach(() => {
    try {
      restoreRaf?.();
    } catch {}
    dom?.window?.close();
    vi.clearAllMocks();
    flushAllFrames = undefined;
    delete global.window;
    delete global.document;
    delete global.HTMLElement;
    delete global.Node;
    delete global.CustomEvent;
    delete global.navigator;
    delete global.performance;
  });

  it("should have aria-describedby and data-buttons-ready attributes", () => {
    const store = {};
    const container = document.getElementById("stat-buttons");
    expect(container).toBeTruthy();

    renderStatButtons(store);

    const frameCallbacks = global.requestAnimationFrame.mock.calls.map(([cb]) => cb);
    expect(frameCallbacks).toHaveLength(1);
    expect(frameCallbacks[0]).toBeTypeOf("function");

    flushAllFrames?.();

    expect(container.dataset.buttonsReady).toBe("true");
    expect(container.getAttribute("data-buttons-ready")).toBe("true");

    const statButtons = container.querySelectorAll("button");
    expect(statButtons.length).toBeGreaterThan(0);
    statButtons.forEach((button) => {
      expect(button.getAttribute("aria-describedby")).toBe("round-message");
    });
  });
});
