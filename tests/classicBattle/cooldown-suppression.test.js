import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSimpleHarness } from "../helpers/integrationHarness.js";

/**
 * Integration tests for cooldown snackbar suppression during opponent prompt window.
 *
 * This test suite validates that the cooldown countdown snackbar is properly suppressed
 * during the opponent prompt minimum duration window (DEFAULT_MIN_PROMPT_DURATION_MS = 600ms).
 *
 * Key behavior:
 * 1. When opponent prompt is shown, timestamp is recorded
 * 2. Cooldown renderer checks isOpponentPromptWindowActive()
 * 3. Snackbar is suppressed while within the minimum duration window
 * 4. After window expires, cooldown snackbar becomes visible
 */
describe("Cooldown suppression during opponent prompt", () => {
  let harness;

  beforeEach(async () => {
    harness = createSimpleHarness({
      useFakeTimers: true,
      useRafMock: true
    });
    await harness.setup();
  });

  afterEach(() => {
    if (harness) {
      harness.cleanup();
    }
  });

  it("suppresses cooldown snackbar during opponent prompt minimum duration window", async () => {
    // Import modules after harness setup
    const { emitBattleEvent } = await import(
      "../../src/helpers/classicBattle/battleEvents.js"
    );
    const { markOpponentPromptNow, DEFAULT_MIN_PROMPT_DURATION_MS } = await import(
      "../../src/helpers/classicBattle/opponentPromptTracker.js"
    );
    const { createRoundTimer } = await import("../../src/helpers/timers/createRoundTimer.js");
    const { attachCooldownRenderer } = await import("../../src/helpers/CooldownRenderer.js");
    const snackbar = await import("../../src/helpers/showSnackbar.js");

    // Spy on snackbar functions
    const showSnackbarSpy = vi.spyOn(snackbar, "showSnackbar");
    const updateSnackbarSpy = vi.spyOn(snackbar, "updateSnackbar");

    // Step 1: Mark opponent prompt timestamp (simulates statSelected event)
    markOpponentPromptNow({ notify: true });

    // Step 2: Create and start a cooldown timer with a mock starter that emits ticks
    const timer = createRoundTimer({
      starter: (onTick, onExpired, duration) => {
        // Emit ticks manually during the test
        timer._testTick = onTick;
        timer._testExpired = onExpired;
      }
    });
    
    const cooldownSeconds = 5;
    attachCooldownRenderer(timer, cooldownSeconds, {
      waitForOpponentPrompt: true,
      maxPromptWaitMs: DEFAULT_MIN_PROMPT_DURATION_MS
    });
    timer.start(cooldownSeconds);

    // Manually emit first tick (this should be suppressed)
    if (timer._testTick) {
      timer._testTick(cooldownSeconds);
    }

    // Step 3: Verify cooldown snackbar is NOT shown immediately (suppressed)
    expect(showSnackbarSpy).not.toHaveBeenCalledWith(
      expect.stringMatching(/Next round in/)
    );
    expect(updateSnackbarSpy).not.toHaveBeenCalledWith(
      expect.stringMatching(/Next round in/)
    );

    // Step 4: Advance time but still within prompt window (e.g., 300ms < 600ms)
    await vi.advanceTimersByTimeAsync(300);
    
    // Emit another tick (still suppressed)
    if (timer._testTick) {
      timer._testTick(cooldownSeconds - 1);
    }

    // Verify still suppressed
    expect(showSnackbarSpy).not.toHaveBeenCalledWith(
      expect.stringMatching(/Next round in/)
    );
    expect(updateSnackbarSpy).not.toHaveBeenCalledWith(
      expect.stringMatching(/Next round in/)
    );

    // Step 5: Advance time past the prompt window (total 700ms > 600ms)
    await vi.advanceTimersByTimeAsync(400);

    // Emit a tick now (should NOT be suppressed)
    if (timer._testTick) {
      timer._testTick(cooldownSeconds - 1);
    }

    // Step 6: Verify cooldown snackbar is now visible
    const cooldownCalls = [
      ...showSnackbarSpy.mock.calls,
      ...updateSnackbarSpy.mock.calls
    ];
    const hasCooldownMessage = cooldownCalls.some((call) =>
      call[0]?.includes("Next round in")
    );
    expect(hasCooldownMessage).toBe(true);
  });

  it("suppresses cooldown when opponent prompt ready event not yet fired", async () => {
    // Import modules after harness setup
    const { createRoundTimer } = await import("../../src/helpers/timers/createRoundTimer.js");
    const { attachCooldownRenderer } = await import("../../src/helpers/CooldownRenderer.js");
    const { recordOpponentPromptTimestamp } = await import(
      "../../src/helpers/classicBattle/opponentPromptTracker.js"
    );
    const snackbar = await import("../../src/helpers/showSnackbar.js");

    // Spy on snackbar functions
    const showSnackbarSpy = vi.spyOn(snackbar, "showSnackbar");
    const updateSnackbarSpy = vi.spyOn(snackbar, "updateSnackbar");

    // Step 1: Record timestamp but DON'T notify (simulates delayed notification)
    const timestamp = Date.now();
    recordOpponentPromptTimestamp(timestamp, { notify: false });

    // Step 2: Create and start a cooldown timer
    const timer = createRoundTimer({
      starter: (onTick, onExpired, duration) => {
        timer._testTick = onTick;
        timer._testExpired = onExpired;
      }
    });
    const cooldownSeconds = 5;
    attachCooldownRenderer(timer, cooldownSeconds, {
      waitForOpponentPrompt: true,
      maxPromptWaitMs: 600
    });
    timer.start(cooldownSeconds);

    // Emit first tick
    if (timer._testTick) {
      timer._testTick(cooldownSeconds);
    }

    // Step 3: Advance some time
    await vi.advanceTimersByTimeAsync(200);

    // Step 4: Verify cooldown is suppressed (prompt not ready yet)
    expect(showSnackbarSpy).not.toHaveBeenCalledWith(
      expect.stringMatching(/Next round in/)
    );
    expect(updateSnackbarSpy).not.toHaveBeenCalledWith(
      expect.stringMatching(/Next round in/)
    );

    // Step 5: Now notify prompt is ready
    recordOpponentPromptTimestamp(timestamp, { notify: true });

    // Step 6: Advance more time to get past the window
    await vi.advanceTimersByTimeAsync(500);

    // Emit a tick after window expired
    if (timer._testTick) {
      timer._testTick(cooldownSeconds - 1);
    }

    // Step 7: Verify cooldown now shows (prompt window expired)
    const cooldownCalls = [
      ...showSnackbarSpy.mock.calls,
      ...updateSnackbarSpy.mock.calls
    ];
    const hasCooldownMessage = cooldownCalls.some((call) =>
      call[0]?.includes("Next round in")
    );
    expect(hasCooldownMessage).toBe(true);
  });

  it("shows cooldown immediately if opponent prompt window already expired", async () => {
    // Import modules after harness setup
    const { markOpponentPromptNow } = await import(
      "../../src/helpers/classicBattle/opponentPromptTracker.js"
    );
    const { createRoundTimer } = await import("../../src/helpers/timers/createRoundTimer.js");
    const { attachCooldownRenderer } = await import("../../src/helpers/CooldownRenderer.js");
    const snackbar = await import("../../src/helpers/showSnackbar.js");

    // Spy on snackbar functions
    const showSnackbarSpy = vi.spyOn(snackbar, "showSnackbar");

    // Step 1: Mark opponent prompt timestamp
    markOpponentPromptNow({ notify: true });

    // Step 2: Advance time past the minimum duration (> 600ms)
    await vi.advanceTimersByTimeAsync(700);

    // Step 3: NOW create and start cooldown (after window expired)
    const timer = createRoundTimer();
    const cooldownSeconds = 5;
    attachCooldownRenderer(timer, cooldownSeconds, {
      waitForOpponentPrompt: true,
      maxPromptWaitMs: 600
    });
    timer.start(cooldownSeconds);

    // Step 4: Verify cooldown shows immediately (no suppression)
    await vi.advanceTimersByTimeAsync(100);

    const cooldownCalls = showSnackbarSpy.mock.calls;
    const hasCooldownMessage = cooldownCalls.some((call) =>
      call[0]?.includes("Next round in")
    );
    expect(hasCooldownMessage).toBe(true);
  });
});
