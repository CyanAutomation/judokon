/**
 * Unit tests for battle initialization readiness helper.
 *
 * @module tests/unit/battleInit.readiness.spec.js
 */

import { describe, it, expect, vi, afterEach } from "vitest";

const loadBattleInit = async () => {
  vi.resetModules();
  return import("../../src/helpers/battleInit.js");
};

const flushMicrotasks = async () => {
  await Promise.resolve();
};

describe("battleInit readiness", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    if (typeof document !== "undefined" && document.body) {
      document.body.innerHTML = "";
    }
    if (typeof window !== "undefined") {
      delete window.battleReadyPromise;
    }
  });

  it("resolves only after both parts are ready in a browser environment", async () => {
    document.body.innerHTML = '<div class="home-screen"></div>';

    const eventLog = [];
    const initEventPromise = new Promise((resolve) => {
      document.addEventListener(
        "battle:init",
        (event) => {
          eventLog.push(event.type);
          resolve(event);
        },
        { once: true }
      );
    });

    const { markBattlePartReady, battleReadyPromise } = await loadBattleInit();
    const resolutionSpy = vi.fn();
    battleReadyPromise.then(resolutionSpy);

    markBattlePartReady("home");
    await flushMicrotasks();
    expect(resolutionSpy).not.toHaveBeenCalled();

    markBattlePartReady("state");

    await initEventPromise;
    await battleReadyPromise;

    expect(resolutionSpy).toHaveBeenCalledTimes(1);
    expect(eventLog).toEqual(["battle:init"]);
    expect(document.querySelector(".home-screen").dataset.ready).toBe("true");
  });

  it("falls back to direct resolution when the DOM is unavailable", async () => {
    const originalDocument = globalThis.document;
    const originalWindow = globalThis.window;
    globalThis.document = undefined;
    globalThis.window = undefined;

    try {
      const { markBattlePartReady, battleReadyPromise } = await loadBattleInit();
      const resolutionSpy = vi.fn();
      battleReadyPromise.then(resolutionSpy);

      markBattlePartReady("home");
      await flushMicrotasks();
      expect(resolutionSpy).not.toHaveBeenCalled();

      markBattlePartReady("state");
      await battleReadyPromise;
      expect(resolutionSpy).toHaveBeenCalledTimes(1);

      markBattlePartReady("state");
      await flushMicrotasks();
      expect(resolutionSpy).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.document = originalDocument;
      globalThis.window = originalWindow;
    }
  });

  it("rejects invalid parts without dispatching readiness", async () => {
    document.body.innerHTML = '<div class="home-screen"></div>';

    const warningSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    const eventSpy = vi.fn();
    document.addEventListener("battle:init", eventSpy);

    try {
      const { markBattlePartReady, battleReadyPromise } = await loadBattleInit();
      const readinessSpy = vi.fn();
      battleReadyPromise.then(readinessSpy);

      markBattlePartReady("invalid-part");

      await flushMicrotasks();

      expect(warningSpy).toHaveBeenCalledWith(
        'Invalid battle part: "invalid-part". Expected one of: home, state'
      );
      expect(readinessSpy).not.toHaveBeenCalled();
      expect(eventSpy).not.toHaveBeenCalled();
      expect(document.querySelector(".home-screen").dataset.ready).toBeUndefined();
    } finally {
      document.removeEventListener("battle:init", eventSpy);
      warningSpy.mockRestore();
    }
  });

  it("emits the init event only once even with rapid calls", async () => {
    document.body.innerHTML = '<div class="home-screen"></div>';

    const eventLog = [];
    const initEventPromise = new Promise((resolve) => {
      document.addEventListener(
        "battle:init",
        (event) => {
          eventLog.push(event.type);
          resolve(event);
        },
        { once: true }
      );
    });

    const { markBattlePartReady, battleReadyPromise } = await loadBattleInit();

    markBattlePartReady("home");
    markBattlePartReady("state");
    markBattlePartReady("home");
    markBattlePartReady("state");

    await initEventPromise;
    await battleReadyPromise;

    expect(eventLog).toEqual(["battle:init"]);
  });
});
