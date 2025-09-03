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
    const mod = await import("../../../src/helpers/classicBattle/uiHelpers.js");
    expect(() => mod.initStatButtons({})).toThrow("initStatButtons: #stat-buttons missing");
    await expect(window.statButtonsReadyPromise).resolves.toBeUndefined();
  });

  it("warns when no stat buttons are found", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const container = document.createElement("div");
    container.id = "stat-buttons";
    document.body.appendChild(container);
    const mod = await import("../../../src/helpers/classicBattle/uiHelpers.js");
    mod.initStatButtons({});
    expect(warnSpy).toHaveBeenCalledWith("[uiHelpers] #stat-buttons has no buttons");
  });

  it("resolves stat button promise when resolver missing", async () => {
    window.statButtonsReadyPromise = new Promise(() => {});
    delete window.__resolveStatButtonsReady;
    const mod = await import("../../../src/helpers/classicBattle/uiHelpers.js");
    expect(() => mod.initStatButtons({})).toThrow("initStatButtons: #stat-buttons missing");
    await expect(window.statButtonsReadyPromise).resolves.toBeUndefined();
  });
});
