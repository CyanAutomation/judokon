import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { join } from "path";
import { init } from "../../src/pages/battleClassic.init.js";

describe("Footer Navigation", () => {
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
    global.requestAnimationFrame = (cb) => cb();
  });

  afterEach(() => {
    dom?.window?.close();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("should set data-battle-active on the body when the match starts", async () => {
    await init();
    const modal = document.querySelector(".modal-backdrop");
    const quickButton = modal.querySelector("button#round-select-1");
    quickButton.click();

    await new Promise(resolve => setTimeout(resolve, 0));

    expect(document.body.getAttribute("data-battle-active")).toBe("true");
  });
});