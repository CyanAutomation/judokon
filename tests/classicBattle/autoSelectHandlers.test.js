import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";
import { handleStatSelectionTimeout } from "../../src/helpers/classicBattle/autoSelectHandlers.js";
import { setScheduler, realScheduler } from "../../src/helpers/scheduler.js";
import { showSnackbar } from "../../src/helpers/showSnackbar.js";
import { autoSelectStat } from "../../src/helpers/classicBattle/autoSelectStat.js";

// Mock dependencies
vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn()
}));
vi.mock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({
  autoSelectStat: vi.fn()
}));
vi.mock("../../src/helpers/i18n.js", () => ({
  t: (key) => key // Simple mock for translation
}));
vi.mock("../../src/helpers/featureFlags.js", () => ({
  isEnabled: () => true // Assume autoSelect is enabled
}));
vi.mock("../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
  computeNextRoundCooldown: () => 3 // Mock cooldown
}));
vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn()
}));

describe("handleStatSelectionTimeout", () => {
  let scheduledCallbacks;
  let fakeScheduler;

  beforeEach(() => {
    scheduledCallbacks = new Map();
    let nextId = 1;

    fakeScheduler = {
      setTimeout: vi.fn((callback, delay) => {
        const id = nextId++;
        scheduledCallbacks.set(id, { callback, delay });
        return id;
      }),
      clearTimeout: vi.fn((id) => scheduledCallbacks.delete(id))
    };

    setScheduler(fakeScheduler);
  });

  afterEach(() => {
    scheduledCallbacks.clear();
    setScheduler(realScheduler);
    vi.clearAllMocks();
  });

  test("should show messages and auto-select in a correct, sequential order", () => {
    const store = { selectionMade: false };
    const onSelect = vi.fn();

    handleStatSelectionTimeout(store, onSelect, 5000);

    // 1. The initial timeout should be registered for the provided delay.
    expect(fakeScheduler.setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);
    const mainTimeoutCall = fakeScheduler.setTimeout.mock.calls.find(([, delay]) => delay === 5000);
    expect(mainTimeoutCall).toBeDefined();
    const [mainTimeout] = mainTimeoutCall;

    // Debug: Check showSnackbar calls before execution
    console.log("Before mainTimeout() execution:");
    console.log("  showSnackbar mock:", showSnackbar);
    console.log("  showSnackbar call count:", showSnackbar.mock.calls.length);

    // Execute the main timeout callback to simulate the timer expiring.
    mainTimeout();
    
    // Debug: Check showSnackbar calls after execution
    console.log("After mainTimeout() execution:");
    console.log("  showSnackbar call count:", showSnackbar.mock.calls.length);
    console.log("  showSnackbar call args:", showSnackbar.mock.calls);

    // 2. The stalled message should be shown and no auto-select should occur yet.
    expect(showSnackbar).toHaveBeenCalledWith("ui.statSelectionStalled");
    expect(autoSelectStat).not.toHaveBeenCalled();

    // 3. The countdown announcement should be scheduled for 800ms later.
    expect(fakeScheduler.setTimeout).toHaveBeenCalledWith(expect.any(Function), 800);
    const countdownCall = fakeScheduler.setTimeout.mock.calls.find(([, delay]) => delay === 800);
    expect(countdownCall).toBeDefined();
    const [countdownTimeout] = countdownCall;

    // Execute the countdown callback.
    countdownTimeout();

    // 4. The next-round message should be shown, still without auto-select.
    expect(showSnackbar).toHaveBeenCalledWith("ui.nextRoundIn");
    expect(autoSelectStat).not.toHaveBeenCalled();

    // 5. Auto-select should be scheduled 250ms after the countdown announcement.
    expect(fakeScheduler.setTimeout).toHaveBeenCalledWith(expect.any(Function), 250);
    const autoSelectCall = fakeScheduler.setTimeout.mock.calls.find(([, delay]) => delay === 250);
    expect(autoSelectCall).toBeDefined();
    const [autoSelectTimeout] = autoSelectCall;

    // 6. Trigger the final callback and verify the auto-select is invoked once.
    autoSelectTimeout();
    expect(autoSelectStat).toHaveBeenCalledTimes(1);
  });
});
