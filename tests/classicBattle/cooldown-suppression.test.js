import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSimpleHarness } from "../helpers/integrationHarness.js";
import snackbarManager from "../../src/helpers/SnackbarManager.js";

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
/* eslint-disable no-unused-vars */
describe("Cooldown suppression during opponent prompt", () => {
  let harness;

  beforeEach(async () => {
    harness = createSimpleHarness({
      useFakeTimers: true,
      useRafMock: true
    });
    await harness.setup();
  });

  afterEach(async () => {
    if (harness) {
      harness.cleanup();
    }
    const { resetOpponentPromptTimestamp } = await import(
      "../../src/helpers/classicBattle/opponentPromptTracker.js"
    );
    resetOpponentPromptTimestamp();
  });

  it("suppresses cooldown snackbar during opponent prompt minimum duration window", async () => {
    // Import modules after harness setup
    const { markOpponentPromptNow, DEFAULT_MIN_PROMPT_DURATION_MS } = await import(
      "../../src/helpers/classicBattle/opponentPromptTracker.js"
    );
    const { createRoundTimer } = await import("../../src/helpers/timers/createRoundTimer.js");
    const { attachCooldownRenderer } = await import("../../src/helpers/CooldownRenderer.js");

    // Spy on snackbar functions
    const showSnackbarSpy = vi.spyOn(snackbarManager, "show");
    const updateSnackbarSpy = vi.spyOn(snackbarManager, "update");

    // Step 1: Mark opponent prompt timestamp (simulates statSelected event)
    markOpponentPromptNow({ notify: true });

    // Step 2: Create and start a cooldown timer with a mock starter that emits ticks
    const timer = createRoundTimer({
      starter: (onTick, onExpired, _duration) => {
        // Emit ticks manually during the test
        timer._testTick = onTick;
        timer._testExpired = onExpired;
      }
    });

    const cooldownSeconds = 5;
    attachCooldownRenderer(timer, cooldownSeconds, {
      waitForOpponentPrompt: true,
      maxPromptWaitMs: DEFAULT_MIN_PROMPT_DURATION_MS,
      now: () => performance.now()
    });
    timer.start(cooldownSeconds);

    // Manually emit first tick (this should be suppressed)
    if (timer._testTick) {
      timer._testTick(cooldownSeconds);
    }

    // Step 3: Verify cooldown snackbar is NOT shown immediately (suppressed)
    const showMessageCalls = showSnackbarSpy.mock.calls.map((call) => call[0]?.message);
    const updateMessageCalls = updateSnackbarSpy.mock.calls.map((call) => call[1]);
    expect(showMessageCalls).not.toContainEqual(expect.stringMatching(/Next round in/));
    expect(updateMessageCalls).not.toContainEqual(expect.stringMatching(/Next round in/));

    // Step 4: Advance time but still within prompt window (e.g., 300ms < 600ms)
    await vi.advanceTimersByTimeAsync(300);

    // Emit another tick (still suppressed)
    if (timer._testTick) {
      timer._testTick(cooldownSeconds - 1);
    }

    // Verify still suppressed
    const showMessageCallsAfterDelay = showSnackbarSpy.mock.calls.map((call) => call[0]?.message);
    const updateMessageCallsAfterDelay = updateSnackbarSpy.mock.calls.map((call) => call[1]);
    expect(showMessageCallsAfterDelay).not.toContainEqual(expect.stringMatching(/Next round in/));
    expect(updateMessageCallsAfterDelay).not.toContainEqual(expect.stringMatching(/Next round in/));

    // Step 5: Advance time past the prompt window (total 700ms > 600ms)
    await vi.advanceTimersByTimeAsync(400);

    // Emit a tick now (should NOT be suppressed)
    if (timer._testTick) {
      timer._testTick(cooldownSeconds - 1);
    }

    // Step 6: Verify cooldown snackbar is now visible
    const hasCooldownMessage =
      showSnackbarSpy.mock.calls.some((call) => call[0]?.message?.includes("Next round in")) ||
      updateSnackbarSpy.mock.calls.some((call) => call[1]?.includes("Next round in"));
    expect(hasCooldownMessage).toBe(true);
  });

  it("shows cooldown immediately if opponent prompt window already expired", async () => {
    // Import modules after harness setup
    const { markOpponentPromptNow, DEFAULT_MIN_PROMPT_DURATION_MS } = await import(
      "../../src/helpers/classicBattle/opponentPromptTracker.js"
    );
    const { createRoundTimer } = await import("../../src/helpers/timers/createRoundTimer.js");
    const { attachCooldownRenderer } = await import("../../src/helpers/CooldownRenderer.js");

    // Spy on snackbar functions
    const showSnackbarSpy = vi.spyOn(snackbarManager, "show");

    // Step 1: Mark opponent prompt timestamp
    markOpponentPromptNow({ notify: true });

    // Step 2: Advance time past the minimum duration
    await vi.advanceTimersByTimeAsync(DEFAULT_MIN_PROMPT_DURATION_MS + 100);

    // Step 3: NOW create and start cooldown (after window expired)
    const timer = createRoundTimer({
      starter: (onTick, onExpired, _duration) => {
        timer._testTick = onTick;
        timer._testExpired = onExpired;
      }
    });
    const cooldownSeconds = 5;
    attachCooldownRenderer(timer, cooldownSeconds, {
      waitForOpponentPrompt: true,
      maxPromptWaitMs: 600,
      now: () => performance.now()
    });
    timer.start(cooldownSeconds);

    // Emit first tick
    if (timer._testTick) {
      timer._testTick(cooldownSeconds);
    }

    // Step 4: Verify cooldown shows immediately (no suppression)
    await vi.advanceTimersByTimeAsync(100);

    const hasCooldownMessage = showSnackbarSpy.mock.calls.some((call) =>
      call[0]?.message?.includes("Next round in")
    );
    expect(hasCooldownMessage).toBe(true);
  });

  it("suppresses cooldown during selection phase (waitingForPlayerAction)", async () => {
    // Import modules after harness setup
    const { createRoundTimer } = await import("../../src/helpers/timers/createRoundTimer.js");
    const { attachCooldownRenderer } = await import("../../src/helpers/CooldownRenderer.js");

    // Spy on snackbar functions
    const showSnackbarSpy = vi.spyOn(snackbarManager, "show");
    const updateSnackbarSpy = vi.spyOn(snackbarManager, "update");

    // Step 1: Set battle state to waitingForPlayerAction (selection phase)
    document.body.dataset.battleState = "waitingForPlayerAction";

    // Step 2: Create and start cooldown timer
    const timer = createRoundTimer({
      starter: (onTick, onExpired, duration) => {
        timer._testTick = onTick;
        timer._testExpired = onExpired;
      }
    });
    const cooldownSeconds = 5;
    attachCooldownRenderer(timer, cooldownSeconds);
    timer.start(cooldownSeconds);

    // Emit first tick
    if (timer._testTick) {
      timer._testTick(cooldownSeconds);
    }

    // Step 3: Verify no snackbar shown (suppressed due to battle state)
    const showMessageCalls = showSnackbarSpy.mock.calls.map((call) => call[0]?.message);
    const updateMessageCalls = updateSnackbarSpy.mock.calls.map((call) => call[1]);
    expect(showMessageCalls).not.toContainEqual(expect.stringMatching(/Next round in/));
    expect(updateMessageCalls).not.toContainEqual(expect.stringMatching(/Next round in/));

    // Step 4: Change to cooldown phase
    document.body.dataset.battleState = "cooldown";

    // Step 5: Emit another tick
    await vi.advanceTimersByTimeAsync(100);
    if (timer._testTick) {
      timer._testTick(cooldownSeconds - 1);
    }

    // Step 6: Verify snackbar now shows (no longer suppressed)
    const hasCooldownMessage =
      showSnackbarSpy.mock.calls.some((call) => call[0]?.message?.includes("Next round in")) ||
      updateSnackbarSpy.mock.calls.some((call) => call[1]?.includes("Next round in"));
    expect(hasCooldownMessage).toBe(true);
  });

  it("suppresses cooldown during decision phase (roundDecision)", async () => {
    // Import modules after harness setup
    const { createRoundTimer } = await import("../../src/helpers/timers/createRoundTimer.js");
    const { attachCooldownRenderer } = await import("../../src/helpers/CooldownRenderer.js");

    // Spy on snackbar functions
    const showSnackbarSpy = vi.spyOn(snackbarManager, "show");
    const updateSnackbarSpy = vi.spyOn(snackbarManager, "update");

    // Step 1: Set battle state to roundDecision (decision phase)
    document.body.dataset.battleState = "roundDecision";

    // Step 2: Create and start cooldown timer
    const timer = createRoundTimer({
      starter: (onTick, onExpired, duration) => {
        timer._testTick = onTick;
        timer._testExpired = onExpired;
      }
    });
    const cooldownSeconds = 5;
    attachCooldownRenderer(timer, cooldownSeconds);
    timer.start(cooldownSeconds);

    // Emit first tick
    if (timer._testTick) {
      timer._testTick(cooldownSeconds);
    }

    // Step 3: Verify no snackbar shown (suppressed due to battle state)
    const showMessageCalls = showSnackbarSpy.mock.calls.map((call) => call[0]?.message);
    const updateMessageCalls = updateSnackbarSpy.mock.calls.map((call) => call[1]);
    expect(showMessageCalls).not.toContainEqual(expect.stringMatching(/Next round in/));
    expect(updateMessageCalls).not.toContainEqual(expect.stringMatching(/Next round in/));

    // Step 4: Change to cooldown phase
    document.body.dataset.battleState = "cooldown";

    // Step 5: Emit another tick
    await vi.advanceTimersByTimeAsync(100);
    if (timer._testTick) {
      timer._testTick(cooldownSeconds - 1);
    }

    // Step 6: Verify snackbar now shows (no longer suppressed)
    const hasCooldownMessage =
      showSnackbarSpy.mock.calls.some((call) => call[0]?.message?.includes("Next round in")) ||
      updateSnackbarSpy.mock.calls.some((call) => call[1]?.includes("Next round in"));
    expect(hasCooldownMessage).toBe(true);
  });
});
