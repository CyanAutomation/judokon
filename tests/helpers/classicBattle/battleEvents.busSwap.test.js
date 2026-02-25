import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetBattleEventTarget,
  createBattleEventBus,
  emitBattleEvent,
  offBattleEvent,
  onBattleEvent,
  setActiveBattleEventBus
} from "../../../src/helpers/classicBattle/battleEvents.js";

describe("battleEvents bus swap safety", () => {
  beforeEach(() => {
    __resetBattleEventTarget();
  });

  it("detaches old listeners when resetting the active bus", () => {
    const oldBus = __resetBattleEventTarget();
    const oldListener = vi.fn();

    oldBus.on("legacy:event", oldListener);
    oldBus.emit("legacy:event", { round: 1 });
    expect(oldListener).toHaveBeenCalledTimes(1);

    const newBus = __resetBattleEventTarget();
    expect(newBus).not.toBe(oldBus);

    oldBus.emit("legacy:event", { round: 2 });
    expect(oldListener).toHaveBeenCalledTimes(1);
  });

  it("keeps the new active bus functional for on/emit/off", () => {
    __resetBattleEventTarget();
    const handler = vi.fn();

    onBattleEvent("active:event", handler);
    emitBattleEvent("active:event", { value: 1 });
    expect(handler).toHaveBeenCalledTimes(1);

    offBattleEvent("active:event", handler);
    emitBattleEvent("active:event", { value: 2 });
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it("disposes replaced buses during explicit active bus swaps", () => {
    const oldBus = createBattleEventBus();
    const listener = vi.fn();
    oldBus.on("swap:event", listener);

    setActiveBattleEventBus(oldBus);
    const replacement = createBattleEventBus();
    setActiveBattleEventBus(replacement);

    oldBus.emit("swap:event", { replaced: true });
    expect(listener).not.toHaveBeenCalled();
  });
});
