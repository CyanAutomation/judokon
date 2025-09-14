import { readFileSync } from "node:fs";
import { resolve } from "node:path";
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
    // Make round timer short so resolution happens quickly
    const spy = vi.spyOn(timerUtils, "getDefaultTimer").mockImplementation((cat) => {
      if (cat === "roundTimer") return 1;
      // Provide a small but non-zero cooldown to exercise readiness
      if (cat === "coolDownTimer") return 1;
      return 3;
    });
    try {
      const file = resolve(process.cwd(), "src/pages/battleClassic.html");
      const html = readFileSync(file, "utf-8");
      document.documentElement.innerHTML = html;

      const mod = await import("../../src/pages/battleClassic.init.js");
      if (typeof mod.init === "function") mod.init();

      // Start the match via modal
      const waitForBtn = () =>
        new Promise((r) => {
          const loop = () => {
            const el = document.getElementById("round-select-2");
            if (el) return r(el);
            setTimeout(loop, 0);
          };
          loop();
        });
      const btn = await waitForBtn();
      btn.click();

      const { getNextRoundControls } = await import(
        "../../src/helpers/classicBattle/roundManager.js"
      );
      const { onBattleEvent, offBattleEvent } = await import(
        "../../src/helpers/classicBattle/battleEvents.js"
      );

      // Wait for round expiry + deterministic resolution
      vi.useFakeTimers();
      const roundResolvedPromise = new Promise((resolve) => {
        const handler = (e) => {
          offBattleEvent("nextRoundTimerReady", handler);
          resolve(e);
        };
        onBattleEvent("nextRoundTimerReady", handler);
      });
      vi.advanceTimersByTime(1200);
      await roundResolvedPromise;

      // After resolution, cooldown should start and Next becomes ready
      const next = document.getElementById("next-button");
      expect(next).toBeTruthy();
      expect(next.disabled).toBe(false);
      expect(next.getAttribute("data-next-ready")).toBe("true");

      // onNextButtonClick should resolve the ready promise
      const { onNextButtonClick } = await import("../../src/helpers/classicBattle/timerService.js");
      const controls = getNextRoundControls();
      const readyPromise = controls.ready;

      // Click the Next button to advance
      await onNextButtonClick(new MouseEvent("click"), controls);
      // The ready promise should resolve promptly
      await expect(readyPromise).resolves.toBeUndefined();
    } finally {
      spy.mockRestore();
    }
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
