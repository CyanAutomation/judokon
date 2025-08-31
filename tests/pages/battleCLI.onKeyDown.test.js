import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  emitBattleEvent,
  __resetBattleEventTarget
} from "../../src/helpers/classicBattle/battleEvents.js";

describe("battleCLI onKeyDown", () => {
  let onKeyDown, __test;

  beforeEach(async () => {
    __resetBattleEventTarget();
    window.__TEST__ = true;
    vi.doMock("../../src/components/Button.js", () => ({
      createButton: (label, opts = {}) => {
        const btn = document.createElement("button");
        if (opts.id) btn.id = opts.id;
        if (opts.className) btn.className = opts.className;
        btn.textContent = label;
        return btn;
      }
    }));
    ({ onKeyDown, __test } = await import("../../src/pages/battleCLI.js"));
    document.body.innerHTML = `
      <div id="cli-root">
        <div id="cli-main"></div>
      </div>
      <div id="cli-shortcuts" hidden><button id="cli-shortcuts-close"></button></div>
      <div id="cli-countdown" aria-live="polite"></div>
      <div id="snackbar-container"></div>
      <div id="modal-container"></div>
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
    vi.doUnmock("../../src/components/Button.js");
    vi.restoreAllMocks();
  });

  it("toggles shortcuts with H key", () => {
    onKeyDown(new KeyboardEvent("keydown", { key: "h" }));
    const sec = document.getElementById("cli-shortcuts");
    expect(sec.hidden).toBe(false);
    onKeyDown(new KeyboardEvent("keydown", { key: "h" }));
    expect(sec.hidden).toBe(true);
  });

  // Retro mode was removed; no longer handles 'R'.

  it("shows an invalid key message and clears on next valid key", () => {
    const countdown = document.getElementById("cli-countdown");
    onKeyDown(new KeyboardEvent("keydown", { key: "x" }));
    expect(countdown.textContent).toBe("Invalid key, press H for help");
    onKeyDown(new KeyboardEvent("keydown", { key: "h" }));
    expect(countdown.textContent).toBe("");
  });

  it("ignores tab navigation", () => {
    const countdown = document.getElementById("cli-countdown");
    onKeyDown(new KeyboardEvent("keydown", { key: "Tab" }));
    expect(countdown.textContent).toBe("");
    onKeyDown(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true }));
    expect(countdown.textContent).toBe("");
  });

  it("confirms quit via modal", () => {
    const dispatch = vi.fn();
    window.__getClassicBattleMachine = () => ({ dispatch });
    onKeyDown(new KeyboardEvent("keydown", { key: "q" }));
    const confirm = document.getElementById("confirm-quit-button");
    expect(confirm).toBeTruthy();
    expect(dispatch).not.toHaveBeenCalled();
    confirm.click();
    expect(dispatch).toHaveBeenCalledWith("interrupt", { reason: "quit" });
  });

  it("resumes timers when quit is canceled", () => {
    const dispatch = vi.fn();
    window.__getClassicBattleMachine = () => ({ dispatch });
    document.body.dataset.battleState = "waitingForPlayerAction";
    const selT = setTimeout(() => {}, 1000);
    const selI = setInterval(() => {}, 1000);
    __test.setSelectionTimers(selT, selI);
    const countdown = document.getElementById("cli-countdown");
    countdown.dataset.remainingTime = "3";
    onKeyDown(new KeyboardEvent("keydown", { key: "q" }));
    document.getElementById("cancel-quit-button").click();
    expect(__test.getSelectionTimers().selectionTimer).not.toBeNull();
  });

  it("resumes timers when quit modal dismissed with Escape", () => {
    const dispatch = vi.fn();
    window.__getClassicBattleMachine = () => ({ dispatch });
    document.body.dataset.battleState = "waitingForPlayerAction";
    const selT = setTimeout(() => {}, 1000);
    const selI = setInterval(() => {}, 1000);
    __test.setSelectionTimers(selT, selI);
    const countdown = document.getElementById("cli-countdown");
    countdown.dataset.remainingTime = "3";
    onKeyDown(new KeyboardEvent("keydown", { key: "q" }));
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(__test.getSelectionTimers().selectionTimer).not.toBeNull();
  });

  it("resumes timers when backdrop is clicked", () => {
    const dispatch = vi.fn();
    window.__getClassicBattleMachine = () => ({ dispatch });
    document.body.dataset.battleState = "waitingForPlayerAction";
    const selT = setTimeout(() => {}, 1000);
    const selI = setInterval(() => {}, 1000);
    __test.setSelectionTimers(selT, selI);
    const countdown = document.getElementById("cli-countdown");
    countdown.dataset.remainingTime = "3";
    onKeyDown(new KeyboardEvent("keydown", { key: "q" }));
    document.querySelector(".modal-backdrop").click();
    expect(__test.getSelectionTimers().selectionTimer).not.toBeNull();
  });

  it("clears timers when confirming quit", () => {
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
    document.getElementById("confirm-quit-button").click();
    expect(spyTimeout).toHaveBeenCalledWith(cooldownT);
    expect(spyInterval).toHaveBeenCalledWith(cooldownI);
    expect(spyTimeout).toHaveBeenCalledWith(selT);
    expect(spyInterval).toHaveBeenCalledWith(selI);
    expect(__test.getCooldownTimers()).toEqual({ cooldownTimer: null, cooldownInterval: null });
    expect(__test.getSelectionTimers()).toEqual({ selectionTimer: null, selectionInterval: null });
    spyTimeout.mockRestore();
    spyInterval.mockRestore();
  });

  it("handles match over event", () => {
    __test.installEventBindings();
    expect(() => emitBattleEvent("matchOver")).not.toThrow();
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

  it("allows quitting with Q when cliShortcuts flag is disabled", async () => {
    const featureFlags = await import("../../src/helpers/featureFlags.js");
    vi.spyOn(featureFlags, "isEnabled").mockImplementation((flag) =>
      flag === "cliShortcuts" ? false : featureFlags.isEnabled(flag)
    );
    const dispatch = vi.fn();
    window.__getClassicBattleMachine = () => ({ dispatch });
    onKeyDown(new KeyboardEvent("keydown", { key: "q" }));
    expect(document.getElementById("confirm-quit-button")).toBeTruthy();
  });
});
