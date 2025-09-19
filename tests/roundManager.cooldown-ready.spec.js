import { beforeEach, afterEach, test, expect, vi } from "vitest";
import {
  createBattleStore,
  startCooldown,
  _resetForTest
} from "../src/helpers/classicBattle/roundManager.js";

beforeEach(() => {
  // Ensure clean DOM and test env
  document.body.innerHTML = "";
  // Reset any debug dataset
  delete document.body.dataset.battleState;
});

afterEach(() => {
  try {
    _resetForTest();
  } catch {}
});

test("roundManager - cooldown expiry: observe ready dispatch count (baseline)", async () => {
  // Simulate orchestrated environment so setupOrchestratedReady is installed
  document.body.innerHTML = '<button id="next-button"></button>';
  document.body.dataset.battleState = "orchestrated";

  const store = createBattleStore();

  // Machine spy which will be returned by getClassicBattleMachine
  const machine = {
    dispatch: vi.fn(() => true),
    getState: () => "cooldown"
  };

  // Central dispatcher spy
  const dispatchBattleEventSpy = vi.fn(async () => true);

  // Fake timer that immediately triggers expiration when started
  function fakeTimerFactory() {
    let handlers = {};
    return {
      start: () => {
        // Synchronously invoke expired to reproduce immediate expiry path
        if (typeof handlers.expired === "function") handlers.expired();
      },
      on: (ev, h) => {
        handlers[ev] = h;
      },
      stop: () => {}
    };
  }

  // Scenario A: with injected dispatcher override -> finalize should call the injected dispatcher
  startCooldown(store, null, {
    createRoundTimer: fakeTimerFactory,
    dispatchBattleEvent: dispatchBattleEventSpy,
    getClassicBattleMachine: () => machine
  });

  // Allow microtasks to settle
  await new Promise((r) => setTimeout(r, 0));

  // In this scenario the injected dispatcher handled the event, so machine.dispatch should not be called
  const callsA = machine.dispatch.mock ? machine.dispatch.mock.calls.length : 0;
  expect(callsA).toBe(0);

  // Reset mocks and environment for scenario B
  machine.dispatch.mockClear();
  dispatchBattleEventSpy.mockClear();
  delete document.body.dataset.battleState;
  document.body.dataset.battleState = "orchestrated";

  // Provide a global getter so the centralized dispatcher can locate our machine
  globalThis.__classicBattleDebugRead = (key) => {
    if (key === "getClassicBattleMachine") return () => machine;
    return undefined;
  };

  // Scenario B: no injected dispatcher -> finalize will call machine.dispatch directly
  startCooldown(store, null, {
    createRoundTimer: fakeTimerFactory
  });

  // Allow microtasks to settle
  await new Promise((r) => setTimeout(r, 0));

  const callsB = machine.dispatch.mock ? machine.dispatch.mock.calls.length : 0;

  // Expect duplicates (finalize + centralized dispatch) in the current baseline
  expect(callsB).toBeGreaterThanOrEqual(2);
});
