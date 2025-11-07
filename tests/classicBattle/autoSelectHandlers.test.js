import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";

// Use vi.hoisted to ensure mocks are set up before any module loading
const mocks = vi.hoisted(() => ({
  showSnackbar: vi.fn(),
  autoSelectStat: vi.fn(),
  t: (key) => key,
  isEnabled: () => true,
  computeNextRoundCooldown: () => 3,
  emitBattleEvent: vi.fn(),
  showMessage: vi.fn()
}));

// Mock dependencies FIRST before importing modules that use them
vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: mocks.showSnackbar
}));
vi.mock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({
  autoSelectStat: mocks.autoSelectStat
}));
vi.mock("../../src/helpers/i18n.js", () => ({
  t: mocks.t
}));
vi.mock("../../src/helpers/featureFlags.js", () => ({
  isEnabled: mocks.isEnabled
}));
vi.mock("../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
  computeNextRoundCooldown: mocks.computeNextRoundCooldown
}));
vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: mocks.emitBattleEvent
}));
vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  showMessage: mocks.showMessage
}));

// Import modules AFTER mocks are set up
import { handleStatSelectionTimeout } from "../../src/helpers/classicBattle/autoSelectHandlers.js";
import { setScheduler, realScheduler } from "../../src/helpers/scheduler.js";

// Access mocked functions via the mocks object
const { showSnackbar, autoSelectStat } = mocks;

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

    console.log("Initial store:", JSON.stringify(store));

    handleStatSelectionTimeout(store, onSelect, 5000);

    console.log("After handleStatSelectionTimeout, store:", JSON.stringify(store));

    // Verify store was modified by handleStatSelectionTimeout
    expect(store.autoSelectId).toBeDefined();

    // 1. The initial timeout should be registered for the provided delay.
    expect(fakeScheduler.setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);

    // Debug: log all setTimeout calls
    console.log("All setTimeout calls:");
    fakeScheduler.setTimeout.mock.calls.forEach((call, idx) => {
      console.log(`  [${idx}] delay=${call[1]}, callback=${typeof call[0]}`);
    });

    const mainTimeoutCall = fakeScheduler.setTimeout.mock.calls.find(([, delay]) => delay === 5000);
    expect(mainTimeoutCall).toBeDefined();
    const [mainTimeout] = mainTimeoutCall;

    // Verify the callback is a function
    expect(typeof mainTimeout).toBe("function");

    // Add a tracer to the callback
    let callbackWasCalled = false;
    const tracedCallback = () => {
      callbackWasCalled = true;
      return mainTimeout();
    };

    // Execute the traced callback
    tracedCallback();

    console.log("Callback was called:", callbackWasCalled);
    console.log("showSnackbar call count:", showSnackbar.mock.calls.length);
    console.log("showSnackbar calls:", JSON.stringify(showSnackbar.mock.calls));

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
