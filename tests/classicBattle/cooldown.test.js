import * as timerUtils from "../../src/helpers/timerUtils.js";

describe("Classic Battle inter-round cooldown + Next", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.resetModules();
    [
      "../../src/helpers/setupScoreboard.js",
      "../../src/helpers/showSnackbar.js",
      "../../src/helpers/classicBattle/debugPanel.js",
      "../../src/helpers/classicBattle/eventDispatcher.js",
      "../../src/helpers/classicBattle/battleEvents.js",
      "../../src/helpers/timers/createRoundTimer.js",
      "../../src/helpers/CooldownRenderer.js",
      "../../src/helpers/timers/computeNextRoundCooldown.js"
    ].forEach((m) => vi.doUnmock(m));
  });
  test("enables Next during cooldown and advances on click", async () => {
    // Deterministic: no real waits, no full-page DOM. Use fake timers and
    // wire minimal DOM nodes that the cooldown logic expects.
    const timers = vi.useFakeTimers();

    // Minimal DOM: header + next button + timer node
    const { createBattleHeader } = await import("../utils/testUtils.js");
    const header = createBattleHeader();
    document.body.appendChild(header);
    const nextBtn = document.createElement("button");
    nextBtn.id = "next-button";
    nextBtn.setAttribute("data-role", "next-round");
    document.body.appendChild(nextBtn);

    // Quiet UI adapters; we assert observable DOM state only
    vi.doMock("../../src/helpers/setupScoreboard.js", () => ({
      clearTimer: vi.fn(),
      showMessage: vi.fn(),
      showAutoSelect: vi.fn(),
      showTemporaryMessage: () => () => {},
      updateTimer: vi.fn()
    }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: vi.fn(),
      updateSnackbar: vi.fn()
    }));

    // Keep engine timers out of the path; use pure-JS timer implementation
    vi.doMock("../../src/helpers/timers/createRoundTimer.js", () => ({
      createRoundTimer: () => {
        let expiredHandler = null;
        let tickHandler = null;
        return {
          on: vi.fn((event, handler) => {
            if (event === "expired") expiredHandler = handler;
            if (event === "tick") tickHandler = handler;
          }),
          start: vi.fn((dur) => {
            // Render initial remaining synchronously when provided
            if (typeof dur === "number" && dur > 0 && tickHandler) tickHandler(dur);
            // Do not auto-expire; the test advances via Next click
          }),
          stop: vi.fn()
        };
      }
    }));

    // Initialize cooldown directly via the public API
    const { startCooldown, getNextRoundControls } = await import(
      "../../src/helpers/classicBattle/roundManager.js"
    );
    startCooldown({}, { setTimeout: (cb, ms) => setTimeout(cb, ms) });

    // Next should be immediately marked ready during cooldown
    const next = document.getElementById("next-button");
    expect(next).toBeTruthy();
    expect(next?.disabled).toBe(false);
    expect(next?.getAttribute("data-next-ready")).toBe("true");

    // Clicking Next resolves the readiness promise and advances
    const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
    const controls = getNextRoundControls();
    const readyPromise = controls?.ready;
    await onNextButtonClick(new MouseEvent("click"), controls);
    await expect(readyPromise).resolves.toBeUndefined();

    timers.useRealTimers();
  });

  test("re-enables Next if a callback disables it", async () => {
    vi.useFakeTimers();
    document.body.innerHTML = '<button id="next-button" disabled></button>';
    document.body.dataset.battleState = "cooldown";
    vi.doMock("../../src/helpers/setupScoreboard.js", () => ({
      clearTimer: vi.fn(),
      showMessage: () => {},
      showAutoSelect: () => {},
      showTemporaryMessage: () => () => {},
      updateTimer: vi.fn()
    }));
    vi.doMock("../../src/helpers/showSnackbar.js", () => ({
      showSnackbar: vi.fn(),
      updateSnackbar: vi.fn()
    }));
    vi.doMock("../../src/helpers/classicBattle/debugPanel.js", () => ({
      updateDebugPanel: vi.fn()
    }));
    vi.doMock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
      dispatchBattleEvent: vi.fn().mockResolvedValue(undefined)
    }));
    vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
      onBattleEvent: vi.fn(),
      offBattleEvent: vi.fn(),
      emitBattleEvent: vi.fn()
    }));
    vi.doMock("../../src/helpers/timers/createRoundTimer.js", () => ({
      createRoundTimer: () => ({ on: vi.fn(), start: vi.fn(), stop: vi.fn() })
    }));
    vi.doMock("../../src/helpers/CooldownRenderer.js", () => ({
      attachCooldownRenderer: vi.fn()
    }));
    vi.doMock("../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
      computeNextRoundCooldown: () => 0
    }));

    const { startCooldown } = await import("../../src/helpers/classicBattle/roundManager.js");
    startCooldown({}, { setTimeout: (cb, ms) => setTimeout(cb, ms) });
    setTimeout(() => {
      const btn = document.getElementById("next-button");
      if (btn) {
        btn.disabled = true;
        btn.dataset.nextReady = "false";
      }
    }, 5);

    await vi.advanceTimersByTimeAsync(50);
    const next = document.getElementById("next-button");
    expect(next?.disabled).toBe(false);
    expect(next?.getAttribute("data-next-ready")).toBe("true");
  });
});
