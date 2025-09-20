import { vi } from "vitest";
import { setupClassicBattleDom } from "./utils.js";
import { domStateListener } from "../../../src/helpers/classicBattle/stateTransitionListeners.js";

/**
 * @summary Build a Classic Battle DOM harness with state synchronization.
 * @returns {Promise<{
 *   timerSpy: import("vitest").FakeTimers,
 *   fetchJsonMock: import("vitest").Mock,
 *   generateRandomCardMock: import("vitest").Mock,
 *   getRandomJudokaMock: import("vitest").Mock,
 *   renderMock: import("vitest").Mock,
 *   currentFlags: Record<string, any>,
 *   dispatchBattleState: (detail: {from?: string|null, to: string|null, event?: string|null}) => {
 *     from?: string|null,
 *     to: string|null,
 *     event?: string|null
 *   },
 *   cleanup: () => void
 * }>} Harness helpers for Classic Battle tests.
 * @pseudocode
 * create harness
 *   - run setupClassicBattleDom to prepare core nodes and mocks
 *   - import the real battleEvents module with vi.importActual
 *   - reset the event target for isolation and register domStateListener
 * expose helpers
 *   - dispatchBattleState(detail): dispatch CustomEvent via shared target
 *   - cleanup(): remove domStateListener listener
 */
export async function createTestBattleDom() {
  const env = setupClassicBattleDom();
  const battleEvents = await vi.importActual("../../../src/helpers/classicBattle/battleEvents.js");

  if (typeof battleEvents.__resetBattleEventTarget === "function") {
    battleEvents.__resetBattleEventTarget();
  }

  const target = battleEvents.getBattleEventTarget();
  battleEvents.onBattleEvent("battleStateChange", domStateListener);

  const dispatchBattleState = (detail) => {
    const eventDetail = {
      from: detail?.from ?? null,
      to: detail?.to ?? null,
      event: detail?.event ?? null
    };
    target.dispatchEvent(new CustomEvent("battleStateChange", { detail: eventDetail }));
    return eventDetail;
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
