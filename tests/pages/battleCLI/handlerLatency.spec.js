import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as init from "../../../src/pages/battleCLI/init.js";
// Import DOM helpers used within module under test to stub safely
import * as domMod from "../../../src/pages/battleCLI/dom.js";
import * as battleEvents from "../../../src/helpers/classicBattle/battleEvents.js";
import { withMutedConsole } from "../../utils/console.js";
import cliState from "../../../src/pages/battleCLI/state.js";
import { resetCliState } from "../../utils/battleCliTestUtils.js";

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
    const activeElementDescriptor = Object.getOwnPropertyDescriptor(document, "activeElement");
    Object.defineProperty(document, "activeElement", { value: statDiv, configurable: true });

    const byIdSpy = vi.spyOn(domMod, "byId").mockImplementation((id) => {
      if (id === "cli-stats") return list;
      if (id === "cli-countdown") return document.getElementById("cli-countdown");
      return null;
    });

    try {
      const handled = init.handleWaitingForPlayerActionKey("enter");
      expect(handled).toBe(true);

      await new Promise((resolve) => queueMicrotask(resolve));

      expect(cliState.roundResolving).toBe(true);
      expect(statDiv.classList.contains("selected")).toBe(true);
    } finally {
      byIdSpy.mockRestore();
      statDiv.remove();
      list.remove();
      if (activeElementDescriptor) {
        Object.defineProperty(document, "activeElement", activeElementDescriptor);
      } else {
        delete document.activeElement;
      }
    }
  });

  it("dispatches statSelected when focused stat exposes dataset key", async () => {
    const list = document.createElement("div");
    list.id = "cli-stats";
    const statDiv = document.createElement("div");
    statDiv.className = "cli-stat";
    statDiv.dataset.stat = "speed";
    statDiv.tabIndex = 0;
    list.appendChild(statDiv);
    document.body.appendChild(list);
    const activeElementDescriptor = Object.getOwnPropertyDescriptor(document, "activeElement");
    Object.defineProperty(document, "activeElement", { value: statDiv, configurable: true });

    const byIdSpy = vi.spyOn(domMod, "byId").mockImplementation((id) => {
      if (id === "cli-stats") return list;
      if (id === "cli-countdown") return document.getElementById("cli-countdown");
      return null;
    });
    const getStatSpy = vi.spyOn(init, "getStatByIndex").mockImplementation(() => {
      throw new Error("fallback path should not execute when dataset.stat is provided");
    });
    const dispatchSpy = vi.spyOn(battleEvents, "emitBattleEvent");

    try {
      const handled = init.handleWaitingForPlayerActionKey("enter");
      expect(handled).toBe(true);

      await new Promise((resolve) => queueMicrotask(resolve));

      expect(dispatchSpy).toHaveBeenCalledWith("statSelected", { stat: "speed" });
    } finally {
      dispatchSpy.mockRestore();
      getStatSpy.mockRestore();
      byIdSpy.mockRestore();
      statDiv.remove();
      list.remove();
      if (activeElementDescriptor) {
        Object.defineProperty(document, "activeElement", activeElementDescriptor);
      } else {
        delete document.activeElement;
      }
    }
  });

  it("falls back to statIndex when dataset stat is empty", async () => {
    const fallbackStat = init.getStatByIndex("1");
    expect(fallbackStat).toBeTruthy();

    const list = document.createElement("div");
    list.id = "cli-stats";
    const statDiv = document.createElement("div");
    statDiv.className = "cli-stat";
    statDiv.dataset.stat = "";
    statDiv.dataset.statIndex = "1";
    statDiv.tabIndex = 0;
    list.appendChild(statDiv);
    document.body.appendChild(list);
    const activeElementDescriptor = Object.getOwnPropertyDescriptor(document, "activeElement");
    Object.defineProperty(document, "activeElement", { value: statDiv, configurable: true });

    const byIdSpy = vi.spyOn(domMod, "byId").mockImplementation((id) => {
      if (id === "cli-stats") return list;
      if (id === "cli-countdown") return document.getElementById("cli-countdown");
      return null;
    });
    const dispatchSpy = vi.spyOn(battleEvents, "emitBattleEvent");

    try {
      const handled = init.handleWaitingForPlayerActionKey("enter");
      expect(handled).toBe(true);

      await new Promise((resolve) => queueMicrotask(resolve));

      expect(dispatchSpy).toHaveBeenCalledWith("statSelected", { stat: fallbackStat });
    } finally {
      dispatchSpy.mockRestore();
      byIdSpy.mockRestore();
      statDiv.remove();
      list.remove();
      if (activeElementDescriptor) {
        Object.defineProperty(document, "activeElement", activeElementDescriptor);
      } else {
        delete document.activeElement;
      }
    }
  });
});
