import { setupClassicBattleDom } from "./utils.js";
import { domStateListener } from "../../../src/helpers/classicBattle/stateTransitionListeners.js";
import * as battleEvents from "../../../src/helpers/classicBattle/battleEvents.js";

/**
 * @summary Build a Classic Battle DOM harness with state synchronization.
 * @returns {Promise<{
 *   timerSpy: import("vitest").FakeTimers,
 *   fetchJsonMock: import("vitest").Mock,
 *   generateRandomCardMock: import("vitest").Mock,
 *   getRandomJudokaMock: import("vitest").Mock,
 *   renderMock: import("vitest").Mock,
 *   currentFlags: Record<string, any>,
 *   dispatchBattleState: (detail: {from?: string|null, to: string|null, event?: string|null}) => void,
 *   cleanup: () => void
 * }>} Harness helpers for Classic Battle tests.
 * @pseudocode
 * create harness
 *   - run setupClassicBattleDom to prepare core nodes and mocks
 *   - ensure the shared battleEvents target is reset for isolation
 *   - register domStateListener on the refreshed event target
 * expose helpers
 *   - dispatchBattleState(detail): dispatch CustomEvent via shared target
 *   - cleanup(): remove domStateListener listener
 */
export async function createTestBattleDom() {
  const env = setupClassicBattleDom();
  if (typeof battleEvents.__resetBattleEventTarget !== "function") {
    throw new Error("__resetBattleEventTarget is required for test isolation but not available");
  }
  battleEvents.__resetBattleEventTarget();

  const target = battleEvents.getBattleEventTarget();
  battleEvents.onBattleEvent("battleStateChange", domStateListener);

  const dispatchBattleState = (detail) => {
    const eventDetail = {
      from: detail?.from ?? null,
      to: detail?.to ?? null,
      event: detail?.event ?? null
    };
    target.dispatchEvent(new CustomEvent("battleStateChange", { detail: eventDetail }));
  };

  const cleanup = () => {
    battleEvents.offBattleEvent("battleStateChange", domStateListener);
  };

  return {
    ...env,
    dispatchBattleState,
    cleanup
  };
}
