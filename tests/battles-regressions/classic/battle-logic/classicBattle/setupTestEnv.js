import { beforeEach, afterEach, vi } from "vitest";
import { setupClassicBattleDom } from "./utils.js";
import { applyMockSetup } from "./mockSetup.js";

/**
 * @pseudocode
 * set up classic battle env for tests
 *   - before each: build DOM and register mocks
 *   - after each: clear timers and restore mocks
 * expose getter to access timerSpy, currentFlags, and mocks
 */
export function setupClassicBattleHooks() {
  let env = {};
  beforeEach(() => {
    const domEnv = setupClassicBattleDom();
    const mocks = applyMockSetup(domEnv);
    env = { ...domEnv, ...mocks };
  });
  afterEach(() => {
    env.timerSpy?.clearAllTimers();
    vi.restoreAllMocks();
  });
  return () => env;
}
