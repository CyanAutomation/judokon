import { beforeEach, describe, expect, it, vi } from "vitest";

const state = {};

vi.mock("../../../src/helpers/classicBattle/debugHooks.js", () => ({
  readDebugState: vi.fn((key) => state[key]),
  exposeDebugState: vi.fn((key, value) => {
    state[key] = value;
  })
}));

vi.mock("../../../src/helpers/classicBattle/debugLog.js", () => ({
  debugLog: vi.fn()
}));

import { cancelRoundResolveGuard } from "../../../src/helpers/classicBattle/stateHandlers/guardCancellation.js";

beforeEach(() => {
  Object.keys(state).forEach((key) => delete state[key]);
});

describe("cancelRoundResolveGuard", () => {
  it("cancels both selection guard and post-resolve watchdog", () => {
    const cancelSelectionGuard = vi.fn();
    const cancelWatchdog = vi.fn();

    state.roundResolveGuard = cancelSelectionGuard;
    state.roundResolveWatchdogCancel = cancelWatchdog;
    state.roundResolveWatchdogToken = "round-1";

    cancelRoundResolveGuard();

    expect(cancelSelectionGuard).toHaveBeenCalledOnce();
    expect(cancelWatchdog).toHaveBeenCalledOnce();
    expect(state.roundResolveGuard).toBeNull();
    expect(state.roundResolveWatchdogCancel).toBeNull();
    expect(state.roundResolveWatchdogToken).toBeNull();
  });
});
