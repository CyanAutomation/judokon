import { dispatchBattleEvent, getBattleStateMachine } from "./orchestrator.js";

/**
 * Confirm orchestrator readiness.
 *
 * @pseudocode
 * 1. Dispatch the `"ready"` event via the battle machine.
 * 2. Let the orchestrator emit `control.readiness.confirmed` on transition.
 *
 * @param {"match"|"round"} [forWhat] Optional hint; currently informational.
 * @returns {Promise<void>}
 */
export async function confirmReadiness(forWhat) {
  // `forWhat` reserved for telemetry; transition emissions happen in onTransition
  await dispatchBattleEvent("ready", { for: forWhat });
}

/**
 * Request an interrupt from the orchestrator.
 *
 * @pseudocode
 * 1. Dispatch `"interrupt"` with `{ scope, reason }` payload.
 *
 * @param {"round"|"match"} scope Interrupt scope.
 * @param {string} [reason]
 * @returns {Promise<void>}
 */
export async function requestInterrupt(scope = "round", reason = "") {
  await dispatchBattleEvent("interrupt", { scope, reason });
}

/**
 * Get orchestrator state and minimal context.
 *
 * @pseudocode
 * 1. Read `machine` via `getBattleStateMachine()`.
 * 2. Return `{ node, context }` with `{ roundIndex, seed, timerState }`.
 *
 * @returns {{ node: string|null, context: { roundIndex: number, seed?: number, timerState?: any } }}
 */
export function getState() {
  const machine = getBattleStateMachine?.();
  const node = machine?.getState?.() ?? null;
  const engine = machine?.context?.engine;
  return {
    node,
    context: {
      roundIndex: Number(engine?.getRoundsPlayed?.() || 0),
      seed: engine?.getSeed?.(),
      timerState: engine?.getTimerState?.() || null
    }
  };
}

/**
 * Inject a fake timers API reference into the orchestrator context for tests.
 *
 * @pseudocode
 * 1. If a battle machine exists, store `fakeTimersApi` on its context.
 * 2. Return `true` when stored; otherwise `false`.
 *
 * @param {any} fakeTimersApi
 * @returns {boolean}
 */
export function injectFakeTimers(fakeTimersApi) {
  const machine = getBattleStateMachine?.();
  if (machine && machine.context) {
    machine.context.fakeTimers = fakeTimersApi;
    return true;
  }
  return false;
}

