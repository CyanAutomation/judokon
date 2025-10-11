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
    const addEventListenerSpy = vi.spyOn(document, "addEventListener");
    const dispatchEventSpy = vi.spyOn(document, "dispatchEvent");

    const { markBattlePartReady, battleReadyPromise } = await loadBattleInit();
    const resolutionSpy = vi.fn();
    battleReadyPromise.then(resolutionSpy);

    markBattlePartReady("home");
    await flushMicrotasks();
    expect(resolutionSpy).not.toHaveBeenCalled();

    markBattlePartReady("state");
    await battleReadyPromise;

    expect(resolutionSpy).toHaveBeenCalledTimes(1);
    expect(
      addEventListenerSpy.mock.calls.filter(([eventName]) => eventName === "battle:init")
    ).toHaveLength(1);
    expect(
      dispatchEventSpy.mock.calls.filter(([event]) => event?.type === "battle:init")
    ).toHaveLength(1);
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
      if (typeof originalDocument === "undefined") {
        globalThis.document = undefined;
      } else {
        globalThis.document = originalDocument;
      }

      if (typeof originalWindow === "undefined") {
        globalThis.window = undefined;
      } else {
        globalThis.window = originalWindow;
      }
    }
  });

  it("dispatches the init event only once even with rapid calls", async () => {
    document.body.innerHTML = '<div class="home-screen"></div>';
    const dispatchEventSpy = vi.spyOn(document, "dispatchEvent");

    const { markBattlePartReady, battleReadyPromise } = await loadBattleInit();

    markBattlePartReady("home");
    markBattlePartReady("state");
    markBattlePartReady("home");
    markBattlePartReady("state");

    await battleReadyPromise;

    expect(
      dispatchEventSpy.mock.calls.filter(([event]) => event?.type === "battle:init")
    ).toHaveLength(1);
  });
});
