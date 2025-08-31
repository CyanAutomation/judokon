import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

async function loadBattleCLI(autoSelect = true, withSkip = false) {
  const emitter = new EventTarget();
  const autoSelectStat = vi.fn();
  const emitBattleEvent = vi.fn();
  const setFlag = vi.fn();
  vi.doMock("../../src/helpers/featureFlags.js", () => ({
    initFeatureFlags: vi.fn(),
    isEnabled: vi.fn((flag) => (flag === "autoSelect" ? autoSelect : false)),
    setFlag,
    featureFlagsEmitter: emitter
  }));
  vi.doMock("../../src/helpers/classicBattle/roundManager.js", () => ({
    createBattleStore: vi.fn(() => ({})),
    startRound: vi.fn()
  }));
  vi.doMock("../../src/helpers/classicBattle/orchestrator.js", () => ({
    initClassicBattleOrchestrator: vi.fn()
  }));
  vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
    onBattleEvent: vi.fn(),
    emitBattleEvent
  }));
  vi.doMock("../../src/helpers/BattleEngine.js", () => ({ STATS: ["speed"] }));
  vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({ setPointsToWin: vi.fn() }));
  vi.doMock("../../src/helpers/dataUtils.js", () => ({
    fetchJson: vi.fn().mockResolvedValue([{ statIndex: 1, name: "Speed" }])
  }));
  vi.doMock("../../src/helpers/constants.js", () => ({ DATA_DIR: "" }));
  vi.doMock("../../src/helpers/classicBattle/autoSelectStat.js", () => ({ autoSelectStat }));
  const url = new URL(window.location.href);
  if (withSkip) {
    url.search = "?skipRoundCooldown=1";
  } else {
    url.search = "";
  }
  window.history.replaceState({}, "", url);
  const mod = await import("../../src/pages/battleCLI.js");
  await mod.__test.init();
  return { __test: mod.__test, autoSelectStat, emitBattleEvent, setFlag };
}

describe("battleCLI countdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.__TEST__ = true;
    document.body.innerHTML = `
      <div id="cli-countdown"></div>
      <div id="cli-stats"></div>
      <div id="cli-help"></div>
      <select id="points-select"></select>
      <section id="cli-verbose-section" hidden>
        <pre id="cli-verbose-log"></pre>
      </section>
      <input id="verbose-toggle" type="checkbox" />
      <div id="snackbar-container"></div>
    `;
    const machine = { dispatch: vi.fn() };
    window.__getClassicBattleMachine = vi.fn(() => machine);
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
    delete window.__TEST__;
    delete window.__getClassicBattleMachine;
    vi.resetModules();
    vi.clearAllMocks();
    vi.doUnmock("../../src/helpers/featureFlags.js");
    vi.doUnmock("../../src/helpers/classicBattle/roundManager.js");
    vi.doUnmock("../../src/helpers/classicBattle/orchestrator.js");
    vi.doUnmock("../../src/helpers/classicBattle/battleEvents.js");
    vi.doUnmock("../../src/helpers/BattleEngine.js");
    vi.doUnmock("../../src/helpers/battleEngineFacade.js");
    vi.doUnmock("../../src/helpers/dataUtils.js");
    vi.doUnmock("../../src/helpers/constants.js");
    vi.doUnmock("../../src/helpers/classicBattle/autoSelectStat.js");
  });

  it("updates countdown and auto-selects on expiry", async () => {
    const { autoSelectStat } = await loadBattleCLI(true);
    document.dispatchEvent(
      new CustomEvent("battle:state", { detail: { to: "waitingForPlayerAction" } })
    );
    const cd = document.getElementById("cli-countdown");
    expect(cd.dataset.remainingTime).toBe("30");
    vi.advanceTimersByTime(1000);
    expect(cd.dataset.remainingTime).toBe("29");
    vi.advanceTimersByTime(29000);
    expect(autoSelectStat).toHaveBeenCalled();
  });

  it("emits statSelectionStalled when auto-select disabled", async () => {
    const { autoSelectStat, emitBattleEvent } = await loadBattleCLI(false);
    document.dispatchEvent(
      new CustomEvent("battle:state", { detail: { to: "waitingForPlayerAction" } })
    );
    vi.advanceTimersByTime(30000);
    expect(autoSelectStat).not.toHaveBeenCalled();
    expect(emitBattleEvent).toHaveBeenCalledWith("statSelectionStalled");
  });

  it("parses skipRoundCooldown query param", async () => {
    const { setFlag } = await loadBattleCLI(true, true);
    expect(setFlag).toHaveBeenCalledWith("skipRoundCooldown", true);
  });

  it("resets skipRoundCooldown flag when query param missing", async () => {
    const { setFlag } = await loadBattleCLI(true, false);
    expect(setFlag).toHaveBeenCalledWith("skipRoundCooldown", false);
  });
});
