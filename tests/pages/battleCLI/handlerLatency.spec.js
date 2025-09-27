import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import * as init from "../../../src/pages/battleCLI/init.js";
// Import DOM helpers used within module under test to stub safely
import * as domMod from "../../../src/pages/battleCLI/dom.js";

describe("battleCLI init import guards", () => {
  it("does not throw when document is undefined", async () => {
    const originalDocument = globalThis.document;
    vi.resetModules();
    try {
      globalThis.document = undefined;
      await expect(import("../../../src/pages/battleCLI/init.js")).resolves.toBeTruthy();
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

    const dispatchSpy = vi.spyOn(init, "safeDispatch").mockResolvedValue(undefined);

    const handled = init.handleWaitingForPlayerActionKey("enter");
    expect(handled).toBe(true);

    // Allow a microtask tick where deferred selectStat triggers dispatch
    await Promise.resolve();
    await Promise.resolve();

    expect(dispatchSpy).toHaveBeenCalledWith("statSelected");

    byIdSpy.mockRestore();
  });
});
