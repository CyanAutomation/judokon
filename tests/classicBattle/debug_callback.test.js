import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";

// Mock dependencies FIRST
vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn()
}));
vi.mock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({
  autoSelectStat: vi.fn()
}));
vi.mock("../../src/helpers/i18n.js", () => ({
  t: (key) => key
}));
vi.mock("../../src/helpers/featureFlags.js", () => ({
  isEnabled: () => true
}));
vi.mock("../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
  computeNextRoundCooldown: () => 3
}));
vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  emitBattleEvent: vi.fn()
}));

// Then import
import { handleStatSelectionTimeout } from "../../src/helpers/classicBattle/autoSelectHandlers.js";
import { showSnackbar } from "../../src/helpers/showSnackbar.js";
import { setScheduler, realScheduler } from "../../src/helpers/scheduler.js";

describe("Debug handleStatSelectionTimeout", () => {
  let fakeScheduler;

  beforeEach(() => {
    fakeScheduler = {
      setTimeout: vi.fn((callback, delay) => {
        console.log("fakeScheduler.setTimeout called with delay:", delay);
        return { callback, delay, id: Math.random() };
      }),
      clearTimeout: vi.fn()
    };

    setScheduler(fakeScheduler);
  });

  afterEach(() => {
    setScheduler(realScheduler);
    vi.clearAllMocks();
  });

  test("callback from handleStatSelectionTimeout executes correctly", () => {
    const store = { selectionMade: false };
    const onSelect = vi.fn();

    console.log("Calling handleStatSelectionTimeout...");
    handleStatSelectionTimeout(store, onSelect, 5000);

    console.log("fakeScheduler.setTimeout call count:", fakeScheduler.setTimeout.mock.calls.length);
    console.log("Calls:", fakeScheduler.setTimeout.mock.calls);

    // Extract the main timeout callback
    const mainTimeoutCall = fakeScheduler.setTimeout.mock.calls.find(([, delay]) => delay === 5000);
    expect(mainTimeoutCall).toBeDefined();
    const [mainTimeout] = mainTimeoutCall;

    console.log("mainTimeout is function:", typeof mainTimeout === "function");
    console.log("showSnackbar before callback:", showSnackbar.mock.calls.length);

    // Call the callback
    mainTimeout();

    console.log("showSnackbar after callback:", showSnackbar.mock.calls.length);
    console.log("showSnackbar calls:", showSnackbar.mock.calls);

    expect(showSnackbar).toHaveBeenCalledWith("ui.statSelectionStalled");
  });
});
