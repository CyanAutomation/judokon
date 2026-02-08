import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { __setStateSnapshot } from "../../src/helpers/classicBattle/battleDebug.js";
import { mount } from "./domUtils.js";
import { runWithFakeTimers } from "./timerUtils.js";

vi.mock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: vi.fn(() => Promise.resolve())
}));

vi.mock("../../src/helpers/classicBattle/skipHandler.js", () => ({
  setSkipHandler: vi.fn()
}));
vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn()
}));
vi.mock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
  skipRoundCooldownIfEnabled: vi.fn(() => false)
}));

describe("onNextButtonClick", () => {
  let btn;
  let warnSpy;
  let priorSelectionFinalized;

  let rootCleanup;
  beforeEach(() => {
    priorSelectionFinalized = window.__classicBattleSelectionFinalized;
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const { query, cleanup } = mount('<button id="next-button" data-role="next-round"></button>');
    rootCleanup = cleanup;
    btn = query('[data-role="next-round"]');
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (typeof priorSelectionFinalized === "undefined") {
      delete window.__classicBattleSelectionFinalized;
    } else {
      window.__classicBattleSelectionFinalized = priorSelectionFinalized;
    }
    warnSpy.mockRestore();
    if (typeof rootCleanup === "function") rootCleanup();
  });

  it("emits skipCooldown when button is marked ready", async () => {
    await runWithFakeTimers(async () => {
      const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
      btn.dataset.nextReady = "true";
      __setStateSnapshot({ state: "roundWait" });
      await onNextButtonClick(
        new MouseEvent("click"),
        { timer: null, resolveReady: vi.fn() },
        { root: document }
      );
    });
    const events = await import("../../src/helpers/classicBattle/battleEvents.js");
    expect(events.emitBattleEvent).toHaveBeenCalledWith("skipCooldown", {
      source: "next-button"
    });
  });

  it("emits skipCooldown even when the button is not marked ready", async () => {
    await runWithFakeTimers(async () => {
      const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
      __setStateSnapshot({ state: "roundResolve" });
      await onNextButtonClick(
        new MouseEvent("click"),
        { timer: { stop: vi.fn() }, resolveReady: null },
        { root: document }
      );
    });
    const events = await import("../../src/helpers/classicBattle/battleEvents.js");
    expect(events.emitBattleEvent).toHaveBeenCalledWith("skipCooldown", {
      source: "next-button"
    });
  });

  it("emits skipCooldown immediately when no timer and in cooldown", async () => {
    await runWithFakeTimers(async () => {
      const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
      __setStateSnapshot({ state: "roundWait" });
      await onNextButtonClick(
        new MouseEvent("click"),
        { timer: null, resolveReady: vi.fn() },
        { root: document }
      );
    });
    const events = await import("../../src/helpers/classicBattle/battleEvents.js");
    expect(events.emitBattleEvent).toHaveBeenCalledWith("skipCooldown", {
      source: "next-button"
    });
  });

  it("still emits skipCooldown when skip flag is active", async () => {
    let uiHelpers;
    await runWithFakeTimers(async () => {
      uiHelpers = await import("../../src/helpers/classicBattle/uiHelpers.js");
      const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
      btn.dataset.nextReady = "true";
      __setStateSnapshot({ state: "roundWait" });
      await onNextButtonClick(
        new MouseEvent("click"),
        { timer: null, resolveReady: vi.fn() },
        { root: document }
      );
    });
    const events = await import("../../src/helpers/classicBattle/battleEvents.js");
    expect(uiHelpers.skipRoundCooldownIfEnabled).not.toHaveBeenCalled();
    expect(events.emitBattleEvent).toHaveBeenCalledWith("skipCooldown", {
      source: "next-button"
    });
  });

  it("suppresses concurrent clicks while an advance is in flight", async () => {
    await runWithFakeTimers(async () => {
      const events = await import("../../src/helpers/classicBattle/battleEvents.js");
      const mod = await import("../../src/helpers/classicBattle/timerService.js");

      btn.dataset.nextReady = "true";
      __setStateSnapshot({ state: "roundWait" });

      const firstCall = mod.onNextButtonClick(new MouseEvent("click"), {
        timer: null,
        resolveReady: null
      });

      const secondCall = mod.onNextButtonClick(new MouseEvent("click"), {
        timer: null,
        resolveReady: null
      });

      // Ensure the guard short-circuits the second attempt while the first is pending.
      await expect(secondCall).resolves.toBeUndefined();
      await firstCall;
      expect(events.emitBattleEvent).toHaveBeenCalledTimes(1);
    });
  });

  it("resets store and global selection finalized state after click handling", async () => {
    await runWithFakeTimers(async () => {
      const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
      const events = await import("../../src/helpers/classicBattle/battleEvents.js");
      const store = { selectionMade: true };
      window.__classicBattleSelectionFinalized = true;

      await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady: null }, store);

      expect(events.emitBattleEvent).toHaveBeenCalledWith("skipCooldown", {
        source: "next-button"
      });
      expect(store.selectionMade).toBe(false);
      expect(window.__classicBattleSelectionFinalized).toBe(false);
    });
  });

  it("ignores clicks when button is disabled", async () => {
    const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
    const events = await import("../../src/helpers/classicBattle/battleEvents.js");

    btn.disabled = true;

    await onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady: null });

    expect(events.emitBattleEvent).not.toHaveBeenCalled();
  });
});
