import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("uiHelpers missing element warnings", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("warns when next button is missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mod = await import("../../../src/helpers/classicBattle/uiHelpers.js");
    mod.setupNextButton();
    expect(warnSpy).toHaveBeenCalledWith("[uiHelpers] #next-button not found");
  });

  it("warns when stat buttons container is missing", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const mod = await import("../../../src/helpers/classicBattle/uiHelpers.js");
    mod.initStatButtons({});
    expect(warnSpy).toHaveBeenCalledWith("[uiHelpers] #stat-buttons container not found");
    await expect(window.statButtonsReadyPromise).resolves.toBeUndefined();
  });
});
