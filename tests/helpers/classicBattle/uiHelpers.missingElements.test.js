import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
// Import battleEvents at the top to ensure it's in the module cache
import "../../../src/helpers/classicBattle/battleEvents.js";

describe("uiHelpers element assertions", () => {
  beforeEach(() => {
    // vi.resetModules(); // Removed to avoid clearing module cache
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns and returns when next round button is missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { setTestMode } = await import("../../../src/helpers/testModeUtils.js");
    setTestMode(true);
    const mod = await import("../../../src/helpers/classicBattle/uiHelpers.js");
    mod.setupNextButton();
    expect(warnSpy).toHaveBeenNthCalledWith(
      1,
      '[test] #next-button missing, falling back to [data-role="next-round"]'
    );
    expect(warnSpy).toHaveBeenNthCalledWith(2, "[test] next round button missing");
  });

  it("falls back to data-role when #next-button is missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const timerSvc = await import("../../../src/helpers/classicBattle/timerService.js");
    const onClick = vi.spyOn(timerSvc, "onNextButtonClick").mockImplementation(() => {});
    const btn = document.createElement("button");
    btn.setAttribute("data-role", "next-round");
    document.body.appendChild(btn);
    const { setTestMode } = await import("../../../src/helpers/testModeUtils.js");
    setTestMode(true);
    const mod = await import("../../../src/helpers/classicBattle/uiHelpers.js");
    mod.setupNextButton();
    btn.click();
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledWith(
      '[test] #next-button missing, falling back to [data-role="next-round"]'
    );
  });

  it("throws when stat buttons container is missing", async () => {
    const resolveSpy = vi.fn();
    window.__resolveStatButtonsReady = resolveSpy;
    const mod = await import("../../../src/helpers/classicBattle/uiHelpers.js");
    expect(() => mod.initStatButtons({})).toThrow("initStatButtons: #stat-buttons missing");
    expect(resolveSpy).not.toHaveBeenCalled();
  });

  it("warns when no stat buttons are found", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const resolveSpy = vi.fn();
    window.__resolveStatButtonsReady = resolveSpy;
    const container = document.createElement("div");
    container.id = "stat-buttons";
    document.body.appendChild(container);
    const mod = await import("../../../src/helpers/classicBattle/uiHelpers.js");
    mod.initStatButtons({});
    expect(warnSpy).toHaveBeenCalledWith("[uiHelpers] #stat-buttons has no buttons");
    expect(resolveSpy).toHaveBeenCalled();
  });
});
