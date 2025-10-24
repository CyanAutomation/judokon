import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as init from "../../../src/pages/battleCLI/init.js";
// Import DOM helpers used within module under test to stub safely
import * as domMod from "../../../src/pages/battleCLI/dom.js";
import { withMutedConsole } from "../../utils/console.js";
import cliState from "../../../src/pages/battleCLI/state.js";
import { resetCliState } from "../../utils/battleCliTestUtils.js";
import { STATS } from "../../../src/helpers/BattleEngine.js";

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
  });
  afterEach(() => {
    resetCliState();
    delete document.activeElement;
    vi.restoreAllMocks();
    document.body.innerHTML = "";
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
    // jsdom focus can be unreliable; emulate focus by assigning activeElement
    Object.defineProperty(document, "activeElement", { value: statDiv, configurable: true });

    const byIdSpy = vi.spyOn(domMod, "byId").mockImplementation((id) => {
      if (id === "cli-stats") return list;
      if (id === "cli-countdown") return document.getElementById("cli-countdown");
      return null;
    });

    const handled = init.handleWaitingForPlayerActionKey("enter");
    expect(handled).toBe(true);

    await new Promise((resolve) => queueMicrotask(resolve));

    expect(cliState.roundResolving).toBe(true);
    expect(statDiv.classList.contains("selected")).toBe(true);

    byIdSpy.mockRestore();
  });

  it("dispatches statSelected when focused stat exposes dataset key", async () => {
    const originalStats = [...STATS];
    STATS.length = 0;

    const statDiv = document.createElement("div");
    statDiv.dataset.stat = "speed";
    statDiv.tabIndex = 0;
    document.body.appendChild(statDiv);
    Object.defineProperty(document, "activeElement", { value: statDiv, configurable: true });

    const originalTestFlag = typeof window !== "undefined" ? window.__TEST__ : undefined;
    if (typeof window !== "undefined") {
      window.__TEST__ = true;
    }

    const previousDispatchLog = localStorage.getItem("__DEBUG_DISPATCH_LOG");
    localStorage.removeItem("__DEBUG_DISPATCH_LOG");

    try {
      await withMutedConsole(async () => {
        const handled = init.handleWaitingForPlayerActionKey("enter");
        expect(handled).toBe(true);

        await new Promise((resolve) => queueMicrotask(resolve));
      }, ["log", "error", "warn"]);

      // safeDispatch("statSelected") writes to the debug dispatch log synchronously
      const dispatchLog = JSON.parse(localStorage.getItem("__DEBUG_DISPATCH_LOG") || "[]");
      expect(dispatchLog.some((entry) => entry.includes("statSelected"))).toBe(true);
    } finally {
      if (typeof window !== "undefined") {
        if (originalTestFlag === undefined) {
          delete window.__TEST__;
        } else {
          window.__TEST__ = originalTestFlag;
        }
      }
      STATS.length = 0;
      STATS.push(...originalStats);
      statDiv.remove();
      if (previousDispatchLog === null) {
        localStorage.removeItem("__DEBUG_DISPATCH_LOG");
      } else {
        localStorage.setItem("__DEBUG_DISPATCH_LOG", previousDispatchLog);
      }
    }
  });
});
