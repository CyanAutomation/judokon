import { describe, it, expect, vi } from "vitest";
import { attachCountdownCoordinator } from "../../../src/helpers/classicBattle/countdownCoordinator.js";

function createMockRoundTimer() {
  const handlers = new Map();
  return {
    on: vi.fn((event, handler) => {
      handlers.set(event, handler);
    }),
    off: vi.fn((event, handler) => {
      if (handlers.get(event) === handler) {
        handlers.delete(event);
      }
    }),
    start: vi.fn(),
    stop: vi.fn(),
    emit: (event, payload) => {
      handlers.get(event)?.(payload);
    }
  };
}

describe("countdownCoordinator boundary expiry", () => {
  it("emits canonical tick then single finish when expiry hits boundary", () => {
    const timer = createMockRoundTimer();
    const emitEvent = vi.fn();

    attachCountdownCoordinator({ timer, duration: 1, emitEvent });

    timer.emit("tick", 0);
    timer.emit("expired");

    expect(emitEvent).toHaveBeenCalledWith("countdownTick", { remaining: 0 });
    expect(emitEvent).toHaveBeenCalledWith("nextRoundCountdownTick", { remaining: 0 });

    const finishedCalls = emitEvent.mock.calls.filter(([name]) => name === "countdownFinished");
    expect(finishedCalls).toHaveLength(1);
  });
});
