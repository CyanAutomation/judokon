import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { __resetBattleEventTarget } from "../../src/helpers/classicBattle/battleEvents.js";
import * as debugHooks from "../../src/helpers/classicBattle/debugHooks.js";

describe("battleCLI Escape key", () => {
  let store, mod;

  beforeEach(async () => {
    vi.resetModules();
    __resetBattleEventTarget();
    window.__TEST__ = true;
    store = {};
    vi.spyOn(debugHooks, "exposeDebugState").mockImplementation((k, v) => {
      store[k] = v;
    });
    vi.spyOn(debugHooks, "readDebugState").mockImplementation((k) => store[k]);
    vi.doMock("../../src/helpers/classicBattle/orchestrator.js", () => ({
      dispatchBattleEvent: vi.fn()
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
    mod = await import("../../src/pages/battleCLI.js");
    document.body.innerHTML = `
      <div id="cli-root">
        <div id="cli-main"><button id="focus-me"></button></div>
      </div>
      <div id="cli-shortcuts" hidden>
        <button id="cli-shortcuts-close"></button>
      </div>
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
    vi.doUnmock("../../src/helpers/classicBattle/orchestrator.js");
    vi.restoreAllMocks();
  });

  it("closes shortcuts with Escape and restores focus", async () => {
    const focusBtn = document.getElementById("focus-me");
    focusBtn.focus();
    mod.onKeyDown(new KeyboardEvent("keydown", { key: "h" }));
    const sec = document.getElementById("cli-shortcuts");
    expect(sec.hidden).toBe(false);
    const handled = mod.getEscapeHandledPromise();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await handled;
    expect(sec.hidden).toBe(true);
    expect(document.activeElement).toBe(focusBtn);
  });

  it("closes quit modal with Escape", async () => {
    mod.onKeyDown(new KeyboardEvent("keydown", { key: "q" }));
    const confirm = document.getElementById("confirm-quit-button");
    expect(confirm).toBeTruthy();
    const handled = mod.getEscapeHandledPromise();
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    await handled;
    const backdrop = confirm.closest(".modal-backdrop");
    expect(backdrop?.hasAttribute("hidden")).toBe(true);
  });
});
