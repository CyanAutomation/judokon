import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("battleCLI onKeyDown", () => {
  let onKeyDown, __test;

  beforeEach(async () => {
    window.__TEST__ = true;
    ({ onKeyDown, __test } = await import("../../src/pages/battleCLI.js"));
    document.body.innerHTML = `
      <div id="cli-shortcuts" hidden></div>
      <div id="snackbar-container"></div>
    `;
    document.body.className = "";
    document.body.dataset.battleState = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
    document.body.className = "";
    delete document.body.dataset.battleState;
    delete window.__getClassicBattleMachine;
    delete window.__TEST__;
    vi.resetModules();
  });

  it("toggles shortcuts with H key", () => {
    onKeyDown(new KeyboardEvent("keydown", { key: "h" }));
    expect(document.getElementById("cli-shortcuts").hidden).toBe(false);
  });

  it("toggles retro mode with R key", () => {
    onKeyDown(new KeyboardEvent("keydown", { key: "r" }));
    expect(document.body.classList.contains("retro")).toBe(true);
  });

  it("quits on Q key", () => {
    const dispatch = vi.fn();
    window.__getClassicBattleMachine = () => ({ dispatch });
    onKeyDown(new KeyboardEvent("keydown", { key: "q" }));
    expect(dispatch).toHaveBeenCalledWith("interrupt", { reason: "quit" });
  });

  it("clears timers when quitting", () => {
    const dispatch = vi.fn();
    window.__getClassicBattleMachine = () => ({ dispatch });
    const cooldownT = setTimeout(() => {}, 1000);
    const cooldownI = setInterval(() => {}, 1000);
    const selT = setTimeout(() => {}, 1000);
    const selI = setInterval(() => {}, 1000);
    const spyTimeout = vi.spyOn(globalThis, "clearTimeout");
    const spyInterval = vi.spyOn(globalThis, "clearInterval");
    __test.setCooldownTimers(cooldownT, cooldownI);
    __test.setSelectionTimers(selT, selI);
    onKeyDown(new KeyboardEvent("keydown", { key: "q" }));
    expect(spyTimeout).toHaveBeenCalledWith(cooldownT);
    expect(spyInterval).toHaveBeenCalledWith(cooldownI);
    expect(spyTimeout).toHaveBeenCalledWith(selT);
    expect(spyInterval).toHaveBeenCalledWith(selI);
    expect(__test.getCooldownTimers()).toEqual({ cooldownTimer: null, cooldownInterval: null });
    expect(__test.getSelectionTimers()).toEqual({ selectionTimer: null, selectionInterval: null });
    spyTimeout.mockRestore();
    spyInterval.mockRestore();
  });

  it("dispatches statSelected in waitingForPlayerAction state", () => {
    const dispatch = vi.fn();
    window.__getClassicBattleMachine = () => ({ dispatch });
    document.body.dataset.battleState = "waitingForPlayerAction";
    onKeyDown(new KeyboardEvent("keydown", { key: "1" }));
    expect(dispatch).toHaveBeenCalledWith("statSelected");
  });

  it("dispatches continue in roundOver state", () => {
    const dispatch = vi.fn();
    window.__getClassicBattleMachine = () => ({ dispatch });
    document.body.dataset.battleState = "roundOver";
    onKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(dispatch).toHaveBeenCalledWith("continue");
  });

  it("dispatches ready in cooldown state", () => {
    const dispatch = vi.fn();
    window.__getClassicBattleMachine = () => ({ dispatch });
    document.body.dataset.battleState = "cooldown";
    onKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(dispatch).toHaveBeenCalledWith("ready");
  });
});
