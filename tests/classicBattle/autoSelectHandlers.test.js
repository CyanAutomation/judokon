import { vi, describe, test, expect, beforeEach, afterEach } from 'vitest';
import { handleStatSelectionTimeout } from '../../src/helpers/classicBattle/autoSelectHandlers.js';
import { setScheduler, realScheduler } from '../../src/helpers/scheduler.js';

// Mock dependencies
vi.mock('../../src/helpers/showSnackbar.js', () => ({
  showSnackbar: vi.fn(),
}));
vi.mock('../../src/helpers/classicBattle/autoSelectStat.js', () => ({
  autoSelectStat: vi.fn(),
}));
vi.mock('../../src/helpers/i18n.js', () => ({
  t: (key) => key, // Simple mock for translation
}));
vi.mock('../../src/helpers/featureFlags.js', () => ({
  isEnabled: () => true, // Assume autoSelect is enabled
}));
vi.mock('../../src/helpers/timers/computeNextRoundCooldown.js', () => ({
    computeNextRoundCooldown: () => 3, // Mock cooldown
}));
vi.mock('../../src/helpers/classicBattle/battleEvents.js', () => ({
    emitBattleEvent: vi.fn(),
}));

describe('handleStatSelectionTimeout', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setScheduler({ setTimeout, clearTimeout });
  });

  afterEach(() => {
    vi.useRealTimers();
    setScheduler(realScheduler);
    vi.clearAllMocks();
  });

  test('should show messages and auto-select in a correct, sequential order', async () => {
    const { showSnackbar } = await import('../../src/helpers/showSnackbar.js');
    const { autoSelectStat } = await import('../../src/helpers/classicBattle/autoSelectStat.js');

    const store = { selectionMade: false };
    const onSelect = vi.fn();

    handleStatSelectionTimeout(store, onSelect, 5000);

    // 1. Advance past the main timeout
    await vi.advanceTimersByTimeAsync(5000);

    // 2. Check for the "stalled" message
    expect(showSnackbar).toHaveBeenCalledWith('ui.statSelectionStalled');
    expect(autoSelectStat).not.toHaveBeenCalled();

    // 3. Advance past the first nested timeout
    await vi.advanceTimersByTimeAsync(800);

    // 4. Check for the "next round" message
    expect(showSnackbar).toHaveBeenCalledWith('ui.nextRoundIn');
    expect(autoSelectStat).not.toHaveBeenCalled();

    // 5. Advance past the final timeout
    await vi.advanceTimersByTimeAsync(250);

    // 6. Check that autoSelectStat was finally called
    expect(autoSelectStat).toHaveBeenCalledTimes(1);
  });
});
