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

      // Deterministic round timer via shared helper
      const { mockCreateRoundTimer } = await import("../helpers/roundTimerMock.js");
      mockCreateRoundTimer({ scheduled: true, tickCount: 2, intervalMs: 1000 });

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
