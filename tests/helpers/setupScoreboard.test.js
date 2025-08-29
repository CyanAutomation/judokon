import { describe, it, expect, vi, beforeEach } from "vitest";
import { createScoreboardHeader } from "../utils/testUtils.js";
import { createMockScheduler } from "./mockScheduler.js";

vi.mock("../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));
vi.mock("../../src/helpers/showSnackbar.js", () => ({
  showSnackbar: vi.fn(),
  updateSnackbar: vi.fn()
}));

describe("setupScoreboard", () => {
  beforeEach(() => {
    vi.resetModules();
    document.body.innerHTML = "";
    document.body.appendChild(createScoreboardHeader());
  });

  function createControls() {
    return {};
  }

  it("initializes scoreboard and proxies component methods", async () => {
    const scheduler = createMockScheduler();
    const controls = createControls();
    const scoreboard = await import("../../src/components/Scoreboard.js");
    const initSpy = vi.spyOn(scoreboard, "initScoreboard");
    const showSpy = vi.spyOn(scoreboard, "showMessage");
    const clearSpy = vi.spyOn(scoreboard, "clearMessage");
    const tempSpy = vi.spyOn(scoreboard, "showTemporaryMessage");
    const scoreSpy = vi.spyOn(scoreboard, "updateScore");

    const mod = await import("../../src/helpers/setupScoreboard.js");
    mod.setupScoreboard(controls, scheduler);

    expect(initSpy).toHaveBeenCalledWith(
      document.querySelector("header"),
      expect.objectContaining({ scheduler })
    );

    mod.showMessage("Hi");
    expect(showSpy).toHaveBeenCalledWith("Hi");

    mod.clearMessage();
    expect(clearSpy).toHaveBeenCalled();

    const reset = mod.showTemporaryMessage("Temp");
    expect(tempSpy).toHaveBeenCalledWith("Temp");
    expect(typeof reset).toBe("function");

    mod.updateScore(1, 2);
    expect(scoreSpy).toHaveBeenCalledWith(1, 2);
  });

  it("calls initScoreboard with null when header missing", async () => {
    document.body.innerHTML = "";
    const scheduler = createMockScheduler();
    const controls = createControls();
    const scoreboard = await import("../../src/components/Scoreboard.js");
    const initSpy = vi.spyOn(scoreboard, "initScoreboard");
    const mod = await import("../../src/helpers/setupScoreboard.js");
    mod.setupScoreboard(controls, scheduler);
    expect(initSpy).toHaveBeenCalledWith(null, expect.objectContaining({ scheduler }));
  });
});
