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

  it("auto-select triggers marker when countdown expires", async () => {
    const mod = await loadBattleCLI({ autoSelect: true });
    await mod.init();

    const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
    battleEvents.emitBattleEvent("battleStateChange", { to: "waitingForPlayerAction" });

    const countdown = document.getElementById("cli-countdown");
    expect(countdown).toBeTruthy();
    expect(countdown.textContent).toContain("30");

    mod.startSelectionCountdown(3);
    expect(countdown.dataset.remainingTime).toBe("3");
    expect(countdown.textContent).toContain("3");

    await timers.advanceTimersByTimeAsync(3000);
    if (typeof timers.runOnlyPendingTimersAsync === "function") {
      await timers.runOnlyPendingTimersAsync();
    }

    const marker = document.getElementById("auto-select-marker");
    expect(marker?.dataset.triggerCount).toBe("1");
    expect(countdown.textContent).toBe("");
    expect(countdown.dataset.remainingTime).toBeUndefined();
  });

  it("emits statSelectionStalled once when auto-select disabled", async () => {
    const mod = await loadBattleCLI({ autoSelect: false });
    await mod.init();

    const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
    const emitSpy = vi.spyOn(battleEvents, "emitBattleEvent");
    battleEvents.emitBattleEvent("battleStateChange", { to: "waitingForPlayerAction" });

    const countdown = document.getElementById("cli-countdown");
    expect(countdown).toBeTruthy();

    mod.startSelectionCountdown(2);

    await timers.advanceTimersByTimeAsync(2000);
    if (typeof timers.runOnlyPendingTimersAsync === "function") {
      await timers.runOnlyPendingTimersAsync();
    }

    const stalledCalls = emitSpy.mock.calls.filter(([eventName]) => eventName === "statSelectionStalled");
    expect(stalledCalls).toHaveLength(1);
    emitSpy.mockRestore();
  });

  it("flips countdown colour below five seconds and resets on restart", async () => {
    const mod = await loadBattleCLI({ autoSelect: false });
    await mod.init();

    const battleEvents = await import("../../src/helpers/classicBattle/battleEvents.js");
    battleEvents.emitBattleEvent("battleStateChange", { to: "waitingForPlayerAction" });

    const countdown = document.getElementById("cli-countdown");
    expect(countdown).toBeTruthy();
    expect(countdown.textContent).toContain("30");

    mod.startSelectionCountdown(6);
    expect(countdown.dataset.remainingTime).toBe("6");
    expect(countdown.textContent).toContain("6");
    expect(countdown.style.color).toBe("");

    await timers.advanceTimersByTimeAsync(2000);
    expect(countdown.dataset.remainingTime).toBe("4");
    expect(countdown.textContent).toContain("4");
    expect(countdown.style.color).toBe("rgb(255, 204, 0)");

    await timers.advanceTimersByTimeAsync(4000);
    if (typeof timers.runOnlyPendingTimersAsync === "function") {
      await timers.runOnlyPendingTimersAsync();
    }

    expect(countdown.textContent).toBe("");
    expect(countdown.dataset.remainingTime).toBeUndefined();

    mod.startSelectionCountdown(10);
    expect(countdown.dataset.remainingTime).toBe("10");
    expect(countdown.textContent).toContain("10");
    expect(countdown.style.color).toBe("");
  });

  it("parses skipRoundCooldown query param", async () => {
    const mod = await loadBattleCLI({
      autoSelect: true,
      url: "http://localhost/?skipRoundCooldown=1"
    });
    const flagEvents = [];
    mod.featureFlagsEmitter.addEventListener("change", (event) => {
      flagEvents.push(event.detail);
    });

    await mod.init();

    const featureFlags = await import("../../src/helpers/featureFlags.js");
    const skipRoundEvents = flagEvents.filter((event) => event.flag === "skipRoundCooldown");
    expect(skipRoundEvents.some((event) => event.value === true)).toBe(true);
    expect(featureFlags.isEnabled("skipRoundCooldown")).toBe(true);
  });

  it("does not override skipRoundCooldown flag when query param missing", async () => {
    const mod = await loadBattleCLI({ autoSelect: true });
    const flagEvents = [];
    mod.featureFlagsEmitter.addEventListener("change", (event) => {
      flagEvents.push(event.detail);
    });

    await mod.init();

    const featureFlags = await import("../../src/helpers/featureFlags.js");
    const skipRoundEvents = flagEvents.filter((event) => event.flag === "skipRoundCooldown");
    expect(skipRoundEvents).toHaveLength(0);
    expect(featureFlags.isEnabled("skipRoundCooldown")).toBe(false);
  });
});
