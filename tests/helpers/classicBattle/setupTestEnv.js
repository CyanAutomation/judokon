import { beforeEach, afterEach, vi } from "vitest";
import { setupClassicBattleDom } from "./utils.js";
import { applyMockSetup } from "./mockSetup.js";

export function setupClassicBattleHooks() {
  let env = {};
  beforeEach(() => {
    env = setupClassicBattleDom();
    applyMockSetup(env);
  });
  afterEach(() => {
    env.timerSpy?.clearAllTimers();
    vi.restoreAllMocks();
  });
  return () => env;
}
