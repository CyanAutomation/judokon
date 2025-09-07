import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  emitBattleEvent,
  __resetBattleEventTarget
} from "../../src/helpers/classicBattle/battleEvents.js";
import * as debugHooks from "../../src/helpers/classicBattle/debugHooks.js";

describe("battleCLI onKeyDown", () => {
  let onKeyDown, __test, getEscapeHandledPromise, store, dispatchSpy;

  beforeEach(async () => {
    vi.resetModules();
    __resetBattleEventTarget();
    window.__TEST__ = true;
    store = {};
    vi.spyOn(debugHooks, "exposeDebugState").mockImplementation((k, v) => {
      store[k] = v;
    });
    vi.spyOn(debugHooks, "readDebugState").mockImplementation((k) => store[k]);
    dispatchSpy = vi.fn();
    vi.doMock("../../src/helpers/classicBattle/orchestrator.js", () => ({
      dispatchBattleEvent: dispatchSpy
    }));
    vi.doMock("../../src/components/Button.js", () => ({
      createButton: (label, opts = {}) => {
        const btn = document.createElement("button");
        if (opts.id) btn.id = opts.id;
        if (opts.className) btn.className = opts.className;
        btn.textContent = label;
        return btn;
      }
    }));
    ({
      onKeyDown,
      battleCLI: __test,
      getEscapeHandledPromise
    } = await import("../../src/pages/index.js"));
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
    debugHooks.exposeDebugState("getClassicBattleMachine", undefined);
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

  it("closes shortcuts with Escape and restores focus", async () => {
    const focusBtn = document.createElement("button");
    document.getElementById("cli-main").appendChild(focusBtn);
    focusBtn.focus();
    onKeyDown(new KeyboardEvent("keydown", { key: "h" }));
    const sec = document.getElementById("cli-shortcuts");
    expect(sec.hidden).toBe(false);
    const handled = getEscapeHandledPromise();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await handled;
    expect(sec.hidden).toBe(true);
    expect(document.activeElement).toBe(focusBtn);
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

  it("routes arrow keys to stat list navigation", async () => {
    const list = document.createElement("ul");
    list.id = "cli-stats";
    const li = document.createElement("li");
    list.appendChild(li);
    document.getElementById("cli-main").appendChild(list);
    li.focus();
    const battleHandlers = await import("../../src/pages/battleCLI/battleHandlers.js");
    const spy = vi.spyOn(battleHandlers, "handleStatListArrowKey");
    onKeyDown(new KeyboardEvent("keydown", { key: "ArrowDown" }));
    expect(spy).toHaveBeenCalledWith("ArrowDown");
    const countdown = document.getElementById("cli-countdown");
    expect(countdown.textContent).toBe("");
    spy.mockRestore();
  });

  it("ignores non-quit shortcuts when flag disabled", async () => {
    const featureFlags = await import("../../src/helpers/featureFlags.js");
    const originalIsEnabled = featureFlags.isEnabled;
    vi
      .spyOn(featureFlags, "isEnabled")
      .mockImplementation((flag) =>
        flag === "cliShortcuts" ? false : originalIsEnabled(flag)
      );
    const shortcuts = document.getElementById("cli-shortcuts");
    const countdown = document.getElementById("cli-countdown");
    onKeyDown(new KeyboardEvent("keydown", { key: "h" }));
    expect(shortcuts.hidden).toBe(true);
    expect(countdown.textContent).toBe("");
  });

  it("confirms quit via modal", () => {
    onKeyDown(new KeyboardEvent("keydown", { key: "q" }));
    const confirm = document.getElementById("confirm-quit-button");
    expect(confirm).toBeTruthy();
    expect(dispatchSpy).not.toHaveBeenCalled();
    confirm.click();
    expect(dispatchSpy).toHaveBeenCalledWith("interrupt", { reason: "quit" });
  });

  const cancelActions = ["cancel", "escape", "backdrop"];
  it.each(cancelActions)(
    "resumes timers and closes modal when quit is canceled via %s",
    async (action) => {
      document.body.dataset.battleState = "waitingForPlayerAction";
      const selT = setTimeout(() => {}, 1000);
      const selI = setInterval(() => {}, 1000);
      __test.setSelectionTimers(selT, selI);
      const countdown = document.getElementById("cli-countdown");
      countdown.dataset.remainingTime = "3";
      onKeyDown(new KeyboardEvent("keydown", { key: "q" }));
      if (action === "cancel") {
        document.getElementById("cancel-quit-button").click();
      } else if (action === "escape") {
        const handled = getEscapeHandledPromise();
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
        await handled;
      } else {
        document.querySelector(".modal-backdrop").click();
      }
      expect(__test.getSelectionTimers().selectionTimer).not.toBeNull();
      const confirm = document.getElementById("confirm-quit-button");
      const backdrop = confirm?.closest(".modal-backdrop");
      expect(backdrop?.hasAttribute("hidden")).toBe(true);
    }
  );

  it("clears timers when confirming quit", () => {
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
    document.body.dataset.battleState = "waitingForPlayerAction";
    onKeyDown(new KeyboardEvent("keydown", { key: "1" }));
    expect(dispatchSpy).toHaveBeenCalledWith("statSelected");
  });

  it("dispatches continue in roundOver state", () => {
    document.body.dataset.battleState = "roundOver";
    onKeyDown(new KeyboardEvent("keydown", { key: "Enter" }));
    expect(dispatchSpy).toHaveBeenCalledWith("continue");
  });

  it("dispatches ready in cooldown state for Enter and Space", () => {
    document.body.dataset.battleState = "cooldown";
    for (const key of ["Enter", " "]) {
      dispatchSpy.mockClear();
      onKeyDown(new KeyboardEvent("keydown", { key }));
      expect(dispatchSpy).toHaveBeenCalledWith("ready");
    }
  });

  it("allows quitting with Q when cliShortcuts flag is disabled", async () => {
    const featureFlags = await import("../../src/helpers/featureFlags.js");
    const originalIsEnabled = featureFlags.isEnabled;
    vi
      .spyOn(featureFlags, "isEnabled")
      .mockImplementation((flag) =>
        flag === "cliShortcuts" ? false : originalIsEnabled(flag)
      );
    dispatchSpy.mockReset();
    onKeyDown(new KeyboardEvent("keydown", { key: "q" }));
    expect(document.getElementById("confirm-quit-button")).toBeTruthy();
  });
});
