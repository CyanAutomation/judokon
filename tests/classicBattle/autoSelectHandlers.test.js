import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";

// Mock all dependencies before any imports
vi.mock("../../src/helpers/showSnackbar.js");
vi.mock("../../src/helpers/classicBattle/autoSelectStat.js");
vi.mock("../../src/helpers/i18n.js");
vi.mock("../../src/helpers/featureFlags.js");
vi.mock("../../src/helpers/timers/computeNextRoundCooldown.js");
vi.mock("../../src/helpers/classicBattle/battleEvents.js");
vi.mock("../../src/helpers/setupScoreboard.js");

describe("handleStatSelectionTimeout", () => {
  let scheduledCallbacks;
  let fakeScheduler;
  let showSnackbar;
  let autoSelectStat;
  let handleStatSelectionTimeout;
  let setScheduler;
  let realScheduler;

  beforeEach(async () => {
    // Clear module cache to ensure fresh imports with mocks applied

    // Set up fake scheduler FIRST, before importing anything that might use it
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

    // Now import scheduler and set the fake one BEFORE importing implementation
    const schedulerModule = await import("../../src/helpers/scheduler.js");
    setScheduler = schedulerModule.setScheduler;
    realScheduler = schedulerModule.realScheduler;
    setScheduler(fakeScheduler);

    // Import and configure mocked modules AFTER scheduler is set up
    const { showSnackbar: mockShowSnackbar } = await import("../../src/helpers/showSnackbar.js");
    showSnackbar = mockShowSnackbar;

    const { autoSelectStat: mockAutoSelectStat } = await import(
      "../../src/helpers/classicBattle/autoSelectStat.js"
    );
    autoSelectStat = mockAutoSelectStat;

    const { t } = await import("../../src/helpers/i18n.js");
    vi.mocked(t).mockImplementation((key) => key);

    const { isEnabled } = await import("../../src/helpers/featureFlags.js");
    vi.mocked(isEnabled).mockReturnValue(true);

    const { computeNextRoundCooldown } = await import(
      "../../src/helpers/timers/computeNextRoundCooldown.js"
    );
    vi.mocked(computeNextRoundCooldown).mockReturnValue(3);

    // Import the module under test LAST, after all mocks and scheduler are configured
    const { handleStatSelectionTimeout: fn } = await import(
      "../../src/helpers/classicBattle/autoSelectHandlers.js"
    );
    handleStatSelectionTimeout = fn;
  });

  afterEach(() => {
    scheduledCallbacks.clear();
    setScheduler(realScheduler);
    vi.clearAllMocks();
  });

  test("should show messages and auto-select in a correct, sequential order", () => {
    const store = { selectionMade: false, roundsPlayed: 3 };
    const onSelect = vi.fn();

    handleStatSelectionTimeout(store, onSelect, 5000);

    // Verify store was modified by handleStatSelectionTimeout
    expect(store.autoSelectId).toBeDefined();
    expect(store.autoSelectRoundToken).toBe(3);
    expect(store.autoSelectCountdownId).toBeNull();
    expect(store.autoSelectExecuteId).toBeNull();

    // 1. The initial timeout should be registered for the provided delay.
    expect(fakeScheduler.setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);
    const mainTimeoutCall = fakeScheduler.setTimeout.mock.calls.find(([, delay]) => delay === 5000);
    expect(mainTimeoutCall).toBeDefined();
    const [mainTimeout] = mainTimeoutCall;

    // Execute the main timeout callback to simulate the timer expiring.
    mainTimeout();

    // 2. The stalled message should be shown and no auto-select should occur yet.
    expect(showSnackbar).toHaveBeenCalledWith("ui.statSelectionStalled");
    expect(autoSelectStat).not.toHaveBeenCalled();

    // 3. The countdown announcement should be scheduled for 800ms later.
    expect(fakeScheduler.setTimeout).toHaveBeenCalledWith(expect.any(Function), 800);
    expect(store.autoSelectCountdownId).toBeDefined();
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
    expect(store.autoSelectExecuteId).toBeDefined();
    const autoSelectCall = fakeScheduler.setTimeout.mock.calls.find(([, delay]) => delay === 250);
    expect(autoSelectCall).toBeDefined();
    const [autoSelectTimeout] = autoSelectCall;

    // 6. Trigger the final callback and verify the auto-select is invoked once.
    autoSelectTimeout();
    expect(autoSelectStat).toHaveBeenCalledTimes(1);
  });

  test("should no-op stale timeout callbacks when round token changes", () => {
    const store = { selectionMade: false, roundsPlayed: 7 };

    handleStatSelectionTimeout(store, vi.fn(), 1000);

    const mainTimeoutCall = fakeScheduler.setTimeout.mock.calls.find(([, delay]) => delay === 1000);
    expect(mainTimeoutCall).toBeDefined();
    const [mainTimeout] = mainTimeoutCall;

    store.roundsPlayed = 8;
    mainTimeout();

    expect(showSnackbar).not.toHaveBeenCalled();
    expect(autoSelectStat).not.toHaveBeenCalled();
    expect(fakeScheduler.setTimeout).toHaveBeenCalledTimes(1);
  });
});
