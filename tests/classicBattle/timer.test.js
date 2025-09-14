import * as timerUtils from "../../src/helpers/timerUtils.js";

describe("Classic Battle round timer", () => {
  test("starts timer and clears on expire deterministically", async () => {
    const timers = vi.useFakeTimers();
    // Provide a short round timer
    const spy = vi.spyOn(timerUtils, "getDefaultTimer").mockImplementation((cat) => {
      if (cat === "roundTimer") return 2;
      return 3;
    });
    try {
      // Minimal DOM: header with timer node
      const { createBattleHeader } = await import("../utils/testUtils.js");
      const header = createBattleHeader();
      document.body.appendChild(header);

      // Bind scoreboard to header
      const sbHelper = await import("../../src/helpers/setupScoreboard.js");
      sbHelper.setupScoreboard({ pauseTimer: () => {}, resumeTimer: () => {} });
      const updateSpy = vi.spyOn(sbHelper, "updateTimer");
      const clearSpy = vi.spyOn(sbHelper, "clearTimer");

      // Deterministic round timer: tick at start, then after 1s, then expire
      vi.doMock("../../src/helpers/timers/createRoundTimer.js", () => ({
        createRoundTimer: () => {
          const h = { tick: new Set(), expired: new Set() };
          return {
            on: vi.fn((evt, fn) => h[evt]?.add(fn)),
            start: vi.fn((dur) => {
              const d = Math.max(0, Number(dur) || 0);
              h.tick.forEach((fn) => fn(d));
              setTimeout(() => {
                if (d > 1) h.tick.forEach((fn) => fn(d - 1));
                setTimeout(() => h.expired.forEach((fn) => fn()), 1000);
              }, 1000);
            }),
            stop: vi.fn()
          };
        }
      }));

      const { startTimer } = await import("../../src/helpers/classicBattle/timerService.js");
      await startTimer(async () => {}, { selectionMade: false });

      const timerEl = document.getElementById("next-round-timer");
      expect(timerEl).toBeTruthy();

      // Immediately shows starting value
      expect(updateSpy).toHaveBeenCalledWith(2);
      expect(timerEl?.textContent).toBe("Time Left: 2s");

      // Advance to expiry and ensure cleared (2s total)
      await timers.advanceTimersByTimeAsync(2000);
      expect(clearSpy).toHaveBeenCalled();
      expect(timerEl?.textContent).toBe("");
    } finally {
      spy.mockRestore();
      timers.useRealTimers();
    }
  });
});
