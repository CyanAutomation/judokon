import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";

vi.mock("../../src/helpers/domReady.js", () => ({
  onDomReady: vi.fn()
}));

const markBattlePartReady = vi.fn();
vi.mock("../../src/helpers/battleInit.js", () => ({
  markBattlePartReady
}));

const logEvent = vi.fn();
vi.mock("../../src/helpers/telemetry.js", () => ({
  logEvent
}));

vi.mock("../../src/helpers/classicBattle/quitModal.js", () => ({
  quitMatch: vi.fn()
}));

describe("setupClassicBattleHomeLink readiness", () => {
  let timers;

  beforeEach(() => {
    timers = useCanonicalTimers();
    vi.resetModules();
    markBattlePartReady.mockReset();
    logEvent.mockReset();
    document.body.innerHTML = '<a href="/" data-testid="home-link">Home</a>';
    delete window.battleStore;
  });

  afterEach(() => {
    timers.runOnlyPendingTimers();
    timers.cleanup();
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    delete window.battleStore;
  });

  it("marks home ready when store appears during bounded polling", async () => {
    const module = await import("../../src/helpers/setupClassicBattleHomeLink.js");

    module.setupClassicBattleHomeLink();
    expect(markBattlePartReady).not.toHaveBeenCalled();

    window.battleStore = { ready: true };
    await timers.advanceTimersByTimeAsync(module.STORE_POLL_INTERVAL_MS);

    expect(markBattlePartReady).toHaveBeenCalledWith("home");
    expect(logEvent).not.toHaveBeenCalled();
  });

  it("prefers store-ready event when available", async () => {
    const module = await import("../../src/helpers/setupClassicBattleHomeLink.js");

    module.setupClassicBattleHomeLink();
    window.battleStore = { ready: true };
    window.dispatchEvent(new CustomEvent(module.STORE_READY_EVENT));

    expect(markBattlePartReady).toHaveBeenCalledTimes(1);
    await timers.advanceTimersByTimeAsync(module.STORE_POLL_INTERVAL_MS * 5);
    expect(markBattlePartReady).toHaveBeenCalledTimes(1);
  });

  it("stops polling and emits controlled warning + telemetry after timeout", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const module = await import("../../src/helpers/setupClassicBattleHomeLink.js");

    module.setupClassicBattleHomeLink();
    await timers.advanceTimersByTimeAsync(
      module.STORE_POLL_INTERVAL_MS * module.STORE_POLL_MAX_ATTEMPTS
    );

    expect(markBattlePartReady).not.toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledWith(
      "classicBattle.homeLink.storeReadyTimeout",
      expect.objectContaining({
        attempts: module.STORE_POLL_MAX_ATTEMPTS,
        intervalMs: module.STORE_POLL_INTERVAL_MS
      })
    );

    await timers.advanceTimersByTimeAsync(module.STORE_POLL_INTERVAL_MS * 5);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledTimes(1);
  });
});
