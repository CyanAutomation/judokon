import { describe, it, vi, afterEach } from "vitest";
import { __setStateSnapshot } from "../../../src/helpers/classicBattle/battleDebug.js";

vi.mock("../../../src/helpers/classicBattle/skipHandler.js", () => ({
  setSkipHandler: vi.fn()
}));

describe("Next button manual click", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("dispatches ready within 50ms", async () => {
    document.body.innerHTML = '<button id="next-button" data-role="next-round"></button>';
    const dispatcher = await import("../../../src/helpers/classicBattle/orchestrator.js");
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    __setStateSnapshot({ state: "cooldown" });

    const readyPromise = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("ready not dispatched")), 50);
      vi.spyOn(dispatcher, "dispatchBattleEvent").mockImplementation(async (evt) => {
        if (evt === "ready") {
          clearTimeout(timer);
          resolve();
        }
      });
    });

    await mod.onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady: null });
    await readyPromise;
  });
});
