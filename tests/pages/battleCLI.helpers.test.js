import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { JSDOM } from "jsdom";
import { readFileSync } from "fs";
import { join } from "path";
import { init } from "../../src/pages/battleCLI/init.js";

describe("Battle CLI Page Helpers", () => {
  let dom;
  let window;
  let document;
  let engineEmitter;

  beforeEach(async () => {
    const htmlPath = join(process.cwd(), "src/pages/battleCLI.html");
    const htmlContent = readFileSync(htmlPath, "utf-8");

    dom = new JSDOM(htmlContent, {
      url: "http://localhost:3000/battleCLI.html",
      runScripts: "dangerously",
      resources: "usable",
      pretendToBeVisual: true,
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
      clear: vi.fn(),
    };

    window.__FF_OVERRIDES = {
      cliShortcuts: true,
    };

    engineEmitter = new EventTarget();
    vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
      on: (event, callback) => engineEmitter.addEventListener(event, (e) => callback(e.detail)),
      createBattleEngine: vi.fn(),
      getPointsToWin: vi.fn(() => 5),
      setPointsToWin: vi.fn(),
    }));

    await init();
  });

  afterEach(() => {
    dom?.window?.close();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("toggles the verbose section when the checkbox is clicked", () => {
    const verboseToggle = document.getElementById("verbose-toggle");
    const verboseSection = document.getElementById("cli-verbose-section");
    expect(verboseSection.hidden).toBe(true);

    verboseToggle.click();

    expect(verboseSection.hidden).toBe(false);

    verboseToggle.click();

    expect(verboseSection.hidden).toBe(true);
  });

  it("toggles the help section when the 'h' key is pressed", () => {
    const shortcutsSection = document.getElementById("cli-shortcuts");
    expect(shortcutsSection.hidden).toBe(true);

    const keydownEvent = new window.KeyboardEvent("keydown", { key: "h" });
    window.dispatchEvent(keydownEvent);

    expect(shortcutsSection.hidden).toBe(false);

    window.dispatchEvent(keydownEvent);

    expect(shortcutsSection.hidden).toBe(true);
  });

  it("updates the timer display on a timerTick engine event", () => {
    const countdownDisplay = document.getElementById("cli-countdown");
    expect(countdownDisplay.textContent).toBe("");

    engineEmitter.dispatchEvent(new CustomEvent("timerTick", { detail: { remaining: 5, phase: "round" } }));

    expect(countdownDisplay.textContent).toBe("Time remaining: 5");
  });

  it("displays the match ended message on a matchEnded engine event", () => {
    const roundMessage = document.getElementById("round-message");
    expect(roundMessage.textContent).toBe("");

    engineEmitter.dispatchEvent(new CustomEvent("matchEnded", { detail: { outcome: "playerWin" } }));

    expect(roundMessage.textContent).toContain("Match over: playerWin");
  });
});
