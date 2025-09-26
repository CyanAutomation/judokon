import { describe, it, expect, vi, beforeEach } from "vitest";
import * as roundManager from "/workspaces/judokon/src/helpers/classicBattle/roundManager.js";

describe("cooldown auto-advance wiring", () => {
  beforeEach(() => {
    // jsdom body for dataset checks used by cooldown
    if (typeof document !== "undefined") {
      document.body.innerHTML = '<button id="next-button" disabled data-role="next-round">Next</button>';
      delete document.body.dataset.battleState;
    }
  });

  it("emits countdown started and resolves ready at expiry", async () => {
    const bus = { emit: vi.fn() };
    const scheduler = { setTimeout: (fn, ms) => setTimeout(fn, ms) };
    const showSnackbar = vi.fn();
    const dispatchBattleEvent = vi.fn();

    const controls = roundManager.startCooldown({}, scheduler, {
      eventBus: bus,
      showSnackbar,
      dispatchBattleEvent,
      // Force non-orchestrated path to mark button ready too
      isOrchestrated: () => false
    });

    // Countdown should be announced
    expect(bus.emit).toHaveBeenCalledWith("control.countdown.started", expect.any(Object));

    // Fast-forward timers to ensure expiry triggers
    await new Promise((r) => setTimeout(r, 10));
    // Ready promise should be present
    expect(controls).toBeTruthy();
    expect(typeof controls.ready?.then).toBe("function");
  });
});
