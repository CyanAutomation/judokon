import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI countdown", () => {
  let timers;
  beforeEach(() => {
    timers = useCanonicalTimers();
  });

  afterEach(async () => {
    timers.cleanup();
    await cleanupBattleCLI();
  });

  it("auto-selects a stat when the countdown expires", async () => {
    const mod = await loadBattleCLI({ autoSelect: true });
    await mod.init();
    const { autoSelectStat } = await import("../../src/helpers/classicBattle/autoSelectStat.js");
    const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
    battleEvents.emitBattleEvent("battleStateChange", { to: "waitingForPlayerAction" });

    const countdown = document.getElementById("cli-countdown");
    expect(countdown).toBeTruthy();

    mod.startSelectionCountdown(3);
    expect(countdown.dataset.remainingTime).toBe("3");
    expect(countdown.textContent).toContain("3");
    expect(countdown.dataset.autoSelected).toBeUndefined();

    await timers.advanceTimersByTimeAsync(3000);
    await timers.runOnlyPendingTimersAsync();

    expect(autoSelectStat).toHaveBeenCalledTimes(1);
    expect(countdown.dataset.autoSelected).toBe("true");
    expect(countdown.textContent).toBe("Auto-selected");
  });

  it("emits statSelectionStalled exactly once when auto-select disabled", async () => {
    const mod = await loadBattleCLI({ autoSelect: false });
    await mod.init();
    const { autoSelectStat } = await import("../../src/helpers/classicBattle/autoSelectStat.js");
    const featureFlags = await import("../../src/helpers/featureFlags.js");
    expect(featureFlags.isEnabled("autoSelect")).toBe(false);
    const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
    const emitSpy = vi.spyOn(battleEvents, "emitBattleEvent");
    const battleBus = battleEvents.getBattleEventTarget?.();
    expect(battleBus).toBeDefined();
    const stalledEvents = [];
    const stalledHandler = (event) => {
      stalledEvents.push(event.type);
    };
    battleBus?.addEventListener("statSelectionStalled", stalledHandler);
    battleEvents.emitBattleEvent("battleStateChange", { to: "waitingForPlayerAction" });
    expect(emitSpy).toHaveBeenCalledWith("battleStateChange", { to: "waitingForPlayerAction" });
    expect(emitSpy.mock.calls.map(([type]) => type)).toContain("battleStateChange");

    const countdown = document.getElementById("cli-countdown");
    expect(countdown).toBeTruthy();

    mod.startSelectionCountdown(2);
    expect(countdown.dataset.remainingTime).toBe("2");

    await timers.advanceTimersByTimeAsync(2000);
    await timers.runOnlyPendingTimersAsync();
    await timers.advanceTimersByTimeAsync(1);
    await timers.runOnlyPendingTimersAsync();
    await Promise.resolve();

    const statSelectionCalls = emitSpy.mock.calls.filter(
      ([type]) => type === "statSelectionStalled"
    );
    expect(countdown.dataset.remainingTime).toBeUndefined();
    expect(stalledEvents).toEqual(["statSelectionStalled"]);
    expect(statSelectionCalls).toHaveLength(1);
    expect(autoSelectStat).not.toHaveBeenCalled();
    emitSpy.mockRestore();
    battleBus?.removeEventListener("statSelectionStalled", stalledHandler);
  });

  it("flips countdown colour below five seconds and resets on restart", async () => {
    const mod = await loadBattleCLI({ autoSelect: false });
    await mod.init();
    const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
    battleEvents.emitBattleEvent("battleStateChange", { to: "waitingForPlayerAction" });
    const countdown = document.getElementById("cli-countdown");

    mod.startSelectionCountdown(6);
    expect(countdown.dataset.remainingTime).toBe("6");
    expect(countdown.textContent).toBe("Time remaining: 6");
    expect(countdown.style.color).toBe("");

    await timers.advanceTimersByTimeAsync(1000);
    expect(countdown.dataset.remainingTime).toBe("5");
    expect(countdown.textContent).toBe("Time remaining: 5");
    expect(countdown.style.color).toBe("");

    await timers.advanceTimersByTimeAsync(1000);
    expect(countdown.dataset.remainingTime).toBe("4");
    expect(countdown.textContent).toBe("Time remaining: 4");
    expect(countdown.style.color).toBe("rgb(255, 204, 0)");

    await timers.advanceTimersByTimeAsync(4000);
    await timers.runOnlyPendingTimersAsync();
    expect(countdown.dataset.remainingTime).toBeUndefined();

    mod.startSelectionCountdown(10);
    expect(countdown.dataset.remainingTime).toBe("10");
    expect(countdown.style.color).toBe("");
  });

  it("enables skipRoundCooldown via query param", async () => {
    const mod = await loadBattleCLI({
      autoSelect: true,
      url: "http://localhost/?skipRoundCooldown=1"
    });
    const featureFlags = await import("../../src/helpers/featureFlags.js");
    const changes = [];
    featureFlags.featureFlagsEmitter.addEventListener("change", (event) => {
      changes.push(event.detail);
    });

    await mod.init();

    expect(featureFlags.isEnabled("skipRoundCooldown")).toBe(true);
    expect(
      changes.some((detail) => detail.flag === "skipRoundCooldown" && detail.value === true)
    ).toBe(true);
  });

  it("leaves skipRoundCooldown disabled when query param missing", async () => {
    const mod = await loadBattleCLI({ autoSelect: true });
    const featureFlags = await import("../../src/helpers/featureFlags.js");
    const changes = [];
    featureFlags.featureFlagsEmitter.addEventListener("change", (event) => {
      changes.push(event.detail);
    });

    await mod.init();

    expect(featureFlags.isEnabled("skipRoundCooldown")).toBe(false);
    expect(changes.some((detail) => detail.flag === "skipRoundCooldown")).toBe(false);
  });
});
