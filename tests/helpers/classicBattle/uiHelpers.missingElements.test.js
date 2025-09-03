import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("uiHelpers element assertions", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("throws when next button is missing", async () => {
    const mod = await import("../../../src/helpers/classicBattle/uiHelpers.js");
    expect(() => mod.setupNextButton()).toThrow("setupNextButton: #next-button missing");
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
