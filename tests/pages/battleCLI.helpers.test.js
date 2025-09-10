import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

beforeEach(() => {
  document.body.innerHTML = "";
  vi.resetModules();
  vi.clearAllMocks();
  // prevent auto-init side effects during tests
  // @ts-ignore
  window.__TEST__ = true;
});

afterEach(() => {
  vi.unstubAllGlobals();
  // cleanup test flag
  // @ts-ignore
  delete window.__TEST__;
});

describe("battleCLI helper exports", () => {
  it("setupFlags toggles verbose", async () => {
    document.body.innerHTML = `
      <div id="cli-root" data-round="0"></div>
      <section id="cli-verbose-section" hidden></section>
      <input id="verbose-toggle" type="checkbox" />
      <div id="cli-shortcuts"><button id="cli-shortcuts-close"></button></div>
      <div id="cli-verbose-log"></div>`;
    const emitter = new EventTarget();
    const setFlag = vi.fn();
    vi.stubGlobal("location", new URL("http://localhost"));
    vi.doMock("../../src/helpers/featureFlags.js", () => ({
      initFeatureFlags: vi.fn(),
      isEnabled: vi.fn(() => false),
      setFlag,
      featureFlagsEmitter: emitter
    }));
    vi.doMock("../../src/helpers/classicBattle/battleDebug.js", () => ({
      getStateSnapshot: vi.fn(() => ({ state: "idle" }))
    }));
    vi.doMock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
      updateBattleStateBadge: vi.fn(),
      skipRoundCooldownIfEnabled: vi.fn()
    }));
    vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({
      getPointsToWin: vi.fn(() => 5),
      setPointsToWin: vi.fn()
    }));
    vi.doMock("../../src/helpers/classicBattle/orchestratorHandlers.js", () => ({
      setAutoContinue: vi.fn()
    }));
    const mod = await import("../../src/pages/index.js");
    const { toggleVerbose } = await mod.setupFlags();
    await toggleVerbose(true);
    expect(setFlag).toHaveBeenCalledWith("cliVerbose", true);
    expect(document.getElementById("cli-verbose-section").hidden).toBe(false);
  });

  it("wireEvents attaches listeners", async () => {
    const addWin = vi.spyOn(window, "addEventListener");
    const addDoc = vi.spyOn(document, "addEventListener");
    vi.doMock("../../src/helpers/classicBattle/battleEvents.js", () => ({
      onBattleEvent: vi.fn(),
      emitBattleEvent: vi.fn()
    }));
    const mod = await import("../../src/pages/index.js");
    mod.wireEvents();
    expect(addWin).toHaveBeenCalledWith("keydown", expect.any(Function));
    expect(addDoc).toHaveBeenCalledWith("click", expect.any(Function));
  });

  it("subscribeEngine wires engine events", async () => {
    const on = vi.fn();
    vi.doMock("../../src/helpers/battleEngineFacade.js", () => ({ on }));
    const mod = await import("../../src/pages/index.js");
    mod.subscribeEngine();
    expect(on).toHaveBeenCalledWith("timerTick", expect.any(Function));
    expect(on).toHaveBeenCalledWith("matchEnded", expect.any(Function));
  });
});
