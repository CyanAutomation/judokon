import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as init from "../../../src/pages/battleCLI/init.js";
import { STATS } from "../../../src/helpers/BattleEngine.js";
import * as debugHooks from "../../../src/helpers/classicBattle/debugHooks.js";
// Import DOM helpers used within module under test to stub safely
import * as domMod from "../../../src/pages/battleCLI/dom.js";
import { withMutedConsole } from "../../utils/console.js";

describe("battleCLI init import guards", () => {
  it("does not throw when document is undefined", async () => {
    const originalDocument = globalThis.document;
    vi.resetModules();
    try {
      globalThis.document = undefined;
      await withMutedConsole(async () => {
        await expect(import("../../../src/pages/battleCLI/init.js")).resolves.toBeTruthy();
      });
    } finally {
      globalThis.document = originalDocument;
      vi.resetModules();
    }
  });

  it("handles game:reset-ui dispatch when document is undefined", async () => {
    const originalDocument = globalThis.document;
    vi.resetModules();
    try {
      globalThis.document = undefined;
      await withMutedConsole(async () => {
        await import("../../../src/pages/battleCLI/init.js");
        if (typeof window !== "undefined") {
          const dispatchSpy = vi.spyOn(window, "dispatchEvent");
          const testEvent = new CustomEvent("game:reset-ui", { detail: { store: null } });
          expect(() => {
            window.dispatchEvent(testEvent);
          }).not.toThrow();
          expect(dispatchSpy).toHaveBeenCalledWith(testEvent);
          dispatchSpy.mockRestore();
        }
      });
    } finally {
      globalThis.document = originalDocument;
      vi.resetModules();
    }
  });
});

describe("battleCLI waitingForPlayerAction handler latency", () => {
  beforeEach(() => {
    document.body.innerHTML = '<div id="cli-countdown"></div>';
    window.__TEST__ = true;
    window.__battleCLIinit?.__resetModuleState?.();
  });
  afterEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = "";
    delete window.__TEST__;
  });

  it("returns synchronously and defers work for Enter on focused stat", async () => {
    const list = document.createElement("div");
    list.id = "cli-stats";
    const statDiv = document.createElement("div");
    statDiv.className = "cli-stat";
    statDiv.dataset.statIndex = "1";
    list.appendChild(statDiv);
    document.body.appendChild(list);
    statDiv.tabIndex = 0;
    Object.defineProperty(document, "activeElement", { value: statDiv, configurable: true });

    const byIdSpy = vi.spyOn(domMod, "byId").mockImplementation((id) => {
      if (id === "cli-stats") return list;
      if (id === "cli-countdown") return document.getElementById("cli-countdown");
      return null;
    });

    const machineDispatchSpy = vi.fn();
    const debugSpy = vi
      .spyOn(debugHooks, "readDebugState")
      .mockReturnValue(() => ({ dispatch: machineDispatchSpy }));

    const handled = init.handleWaitingForPlayerActionKey("enter");
    expect(handled).toBe(true);
    await vi.waitFor(() => expect(machineDispatchSpy).toHaveBeenCalledWith("statSelected"));

    byIdSpy.mockRestore();
    debugSpy.mockRestore();
  });

  it("uses DOM-provided stat key when BattleEngine stats are cleared", async () => {
    const list = document.createElement("div");
    list.id = "cli-stats";
    const statDiv = document.createElement("div");
    statDiv.className = "cli-stat";
    statDiv.dataset.stat = "technique";
    list.appendChild(statDiv);
    document.body.appendChild(list);
    statDiv.tabIndex = 0;
    Object.defineProperty(document, "activeElement", { value: statDiv, configurable: true });

    const byIdSpy = vi.spyOn(domMod, "byId").mockImplementation((id) => {
      if (id === "cli-stats") return list;
      if (id === "cli-countdown") return document.getElementById("cli-countdown");
      return null;
    });

    const machineDispatchSpy = vi.fn();
    const debugSpy = vi
      .spyOn(debugHooks, "readDebugState")
      .mockReturnValue(() => ({ dispatch: machineDispatchSpy }));

    const originalStats = [...STATS];
    STATS.splice(0, STATS.length);

    try {
      const handled = init.handleWaitingForPlayerActionKey("enter");
      expect(handled).toBe(true);
      await vi.waitFor(() => expect(machineDispatchSpy).toHaveBeenCalledWith("statSelected"));
    } finally {
      STATS.splice(0, STATS.length, ...originalStats);
      byIdSpy.mockRestore();
      debugSpy.mockRestore();
    }
  });
});
