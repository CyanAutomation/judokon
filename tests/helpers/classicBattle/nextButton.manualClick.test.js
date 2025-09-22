import { describe, it, vi, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import { __setStateSnapshot } from "../../../src/helpers/classicBattle/battleDebug.js";
import { createBattleHeader } from "../../utils/testUtils.js";

vi.mock("../../../src/helpers/classicBattle/skipHandler.js", () => ({
  setSkipHandler: vi.fn()
}));

describe("Next button manual click", () => {
  let timers;
  afterEach(() => {
    vi.restoreAllMocks();
    timers.cleanup();
    document.body.innerHTML = "";
  });

  it("dispatches ready when manually clicked", async () => {
    timers = useCanonicalTimers();
    const header = createBattleHeader();
    const button = document.createElement("button");
    button.id = "next-button";
    button.dataset.role = "next-round";
    header.appendChild(button);
    document.body.appendChild(header);

    const dispatcher = await import("../../../src/helpers/classicBattle/eventDispatcher.js");
    const mod = await import("../../../src/helpers/classicBattle/timerService.js");
    __setStateSnapshot({ state: "cooldown" });

    const spy = vi.spyOn(dispatcher, "dispatchBattleEvent").mockResolvedValue(undefined);
    const resolveReady = vi.fn();

    await mod.onNextButtonClick(new MouseEvent("click"), { timer: null, resolveReady });
    await vi.advanceTimersByTimeAsync(0);

    expect(spy).toHaveBeenCalledWith("ready");
    expect(spy).toHaveBeenCalledTimes(1);
    expect(resolveReady).toHaveBeenCalledTimes(1);
  });
});
