import { vi, describe, test, expect, beforeEach, afterEach } from "vitest";
import { setScheduler, realScheduler } from "../../src/helpers/scheduler.js";

// Set up mocks
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

  beforeEach(async () => {
    // Import mocked modules
    const snackbarMod = await import("../../src/helpers/showSnackbar.js");
    showSnackbar = snackbarMod.showSnackbar;
    
    const autoSelectMod = await import("../../src/helpers/classicBattle/autoSelectStat.js");
    autoSelectStat = autoSelectMod.autoSelectStat;
    
    const i18nMod = await import("../../src/helpers/i18n.js");
    vi.mocked(i18nMod.t).mockImplementation((key) => key);
    
    const featureMod = await import("../../src/helpers/featureFlags.js");
    vi.mocked(featureMod.isEnabled).mockReturnValue(true);
    
    const cooldownMod = await import("../../src/helpers/timers/computeNextRoundCooldown.js");
    vi.mocked(cooldownMod.computeNextRoundCooldown).mockReturnValue(3);
    
    const handlersMod = await import("../../src/helpers/classicBattle/autoSelectHandlers.js");
    handleStatSelectionTimeout = handlersMod.handleStatSelectionTimeout;
    
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

    expect(fakeScheduler.setTimeout).toHaveBeenCalledWith(expect.any(Function), 5000);
    const mainTimeoutCall = fakeScheduler.setTimeout.mock.calls.find(([, delay]) => delay === 5000);
    expect(mainTimeoutCall).toBeDefined();
    const [mainTimeout] = mainTimeoutCall;

    mainTimeout();

    expect(showSnackbar).toHaveBeenCalledWith("ui.statSelectionStalled");
    expect(autoSelectStat).not.toHaveBeenCalled();
  });
});
