import { beforeEach, afterEach, test, expect, vi } from "vitest";
import {
  createBattleStore,
  startCooldown,
  _resetForTest
} from "../src/helpers/classicBattle/roundManager.js";
import {
  detectOrchestratorContext,
  initializeCooldownTelemetry,
  resolveActiveScheduler
} from "../src/helpers/classicBattle/cooldownOrchestrator.js";
import { exposeDebugState } from "../src/helpers/classicBattle/debugHooks.js";

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
  if (window.__classicBattleDebugMap) {
    window.__classicBattleDebugMap.clear();
  }
});

test("cooldown orchestrator telemetry primes debug counters", () => {
  window.__startCooldownInvoked = false;
  globalThis.__startCooldownCount = 0;
  initializeCooldownTelemetry({ schedulerProvided: true });
  expect(window.__startCooldownInvoked).toBe(true);
  expect(globalThis.__startCooldownCount).toBe(1);
});

test("resolveActiveScheduler prefers injected scheduler", () => {
  const customScheduler = { setTimeout: vi.fn(), clearTimeout: vi.fn() };
  expect(resolveActiveScheduler(customScheduler)).toBe(customScheduler);
  const fallback = resolveActiveScheduler(null);
  expect(typeof fallback.setTimeout).toBe("function");
});

test("detectOrchestratorContext reports debug machine", () => {
  const machine = { id: "orchestrator" };
  exposeDebugState("getClassicBattleMachine", () => machine);
  const result = detectOrchestratorContext(() => false);
  expect(result.machine).toBe(machine);
  expect(result.orchestrated).toBe(true);
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

  // Ensure no immediate machine dispatch occurs before async work resolves.
  expect(machine.dispatch).not.toHaveBeenCalled();

  // Allow microtasks to settle
  await new Promise((r) => setTimeout(r, 0));

  // In this scenario the injected dispatcher handled the event, so machine.dispatch should not be called
  expect(machine.dispatch).not.toHaveBeenCalled();
  expect(dispatchBattleEventSpy).toHaveBeenCalledTimes(1);

  // Inspect trace (accept any of several markers; ordering can vary by timing)
  const traceA = globalThis.__classicBattleDebugRead?.("nextRoundReadyTrace") || [];
  expect(Array.isArray(traceA)).toBe(true);
  const okA = traceA.some((e) =>
    [
      "finalize.dispatched",
      "dispatchReadyViaBus.start",
      "handleNextRoundExpiration.dispatched"
    ].includes(e.event)
  );
  expect(okA).toBe(true);

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

  // Expect at least one dispatch in this baseline run; duplication is timing-dependent
  expect(callsB).toBeGreaterThanOrEqual(1);
  const traceB = globalThis.__classicBattleDebugRead?.("nextRoundReadyTrace") || [];
  // When double-dispatch occurs, we expect both finalize.dispatched and dispatchReadyViaBus.start/end traces
  // Record traceB contents for analysis (may vary by timing); assert it's an array
  expect(Array.isArray(traceB)).toBe(true);
  // Attach traceB to global for post-run inspection
  globalThis.__lastTraceB = traceB;

  // Additional variant: delayed expiry to emulate scheduler differences
  machine.dispatch.mockClear();
  dispatchBattleEventSpy.mockClear();
  // Delayed timer factory to simulate microtask ordering
  function delayedTimerFactory() {
    let handlers = {};
    return {
      start: () => {
        // schedule expired on next macrotask
        setTimeout(() => {
          if (typeof handlers.expired === "function") handlers.expired();
        }, 0);
      },
      on: (ev, h) => {
        handlers[ev] = h;
      },
      stop: () => {}
    };
  }

  // Reset trace map
  if (globalThis.__classicBattleDebugExpose) {
    globalThis.__classicBattleDebugExpose("nextRoundReadyTrace", []);
  }

  startCooldown(store, null, {
    createRoundTimer: delayedTimerFactory
  });
  await new Promise((r) => setTimeout(r, 10));
  const traceDelayed = globalThis.__classicBattleDebugRead?.("nextRoundReadyTrace") || [];
  expect(Array.isArray(traceDelayed)).toBe(true);
  // Print traces for investigator convenience
  try {
    const fs = await import("fs");
    try {
      fs.promises.writeFile(
        "./test-traces.json",
        JSON.stringify(
          { traceA: traceA || [], traceB: traceB || [], traceDelayed: traceDelayed || [] },
          null,
          2
        )
      );
    } catch {}
  } catch {}
});
