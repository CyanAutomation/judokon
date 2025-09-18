import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { join } from "path";
import { renderStatButtons } from "../../src/pages/battleClassic.init.js";

describe("Stat Buttons", () => {
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
      pretendToBeVisual: true,
    });

    window = dom.window;
    document = window.document;

    global.window = window;
    global.document = document;

    // Mock requestAnimationFrame for immediate execution
    global.requestAnimationFrame = (cb) => cb();
  });

  afterEach(() => {
    dom?.window?.close();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("should have aria-describedby and data-buttons-ready attributes", async () => {
    const store = {};
    // We need to import STATS from the facade to pass to renderStatButtons
    const { STATS } = await import("../../src/helpers/battleEngineFacade.js");
    renderStatButtons(store, STATS);

    const statButtonsContainer = document.getElementById("stat-buttons");

    // Wait for the next frame where data-buttons-ready is set
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(statButtonsContainer.dataset.buttonsReady).toBe("true");

    const statButtons = statButtonsContainer.querySelectorAll("button");
    statButtons.forEach((button) => {
      expect(button.getAttribute("aria-describedby")).toBe("round-message");
    });
  });
});
