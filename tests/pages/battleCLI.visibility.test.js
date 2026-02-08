import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";

describe("battleCLI visibility change handling", () => {
  let originalAdd;

  beforeEach(() => {
    originalAdd = document.addEventListener;
    document.addEventListener = new Proxy(originalAdd, {
      apply(target, thisArg, args) {
        const [type, handler] = args;
        if (type === "visibilitychange" && typeof handler === "function") {
          // visibilityHandler = handler;
        }
        return Reflect.apply(target, thisArg, args);
      }
    });
  });

  afterEach(async () => {
    document.addEventListener = originalAdd;
    await cleanupBattleCLI();
  });

  it("calls pauseTimers when tab becomes hidden", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const mod = await loadBattleCLI();
    await mod.init();

    // Mock document.hidden
    Object.defineProperty(document, "hidden", { value: true, configurable: true });

    // Trigger visibility change
    document.dispatchEvent(new Event("visibilitychange"));

    // Check that pauseTimers was called (via logging)
    expect(consoleSpy).toHaveBeenCalledWith("[TIMER] pauseTimers called");

    consoleSpy.mockRestore();
  });

  it("calls resumeTimers when tab becomes visible", async () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const mod = await loadBattleCLI();
    await mod.init();

    // Mock document.hidden as false
    Object.defineProperty(document, "hidden", { value: false, configurable: true });

    // Trigger visibility change
    document.dispatchEvent(new Event("visibilitychange"));

    // Check that resumeTimers was called (via logging)
    expect(consoleSpy).toHaveBeenCalledWith("[TIMER] resumeTimers called");

    consoleSpy.mockRestore();
  });

  it("calls engine handleTabInactive when tab becomes hidden", async () => {
    const mod = await loadBattleCLI();
    await mod.init();

    // Mock engine with spy
    const engineSpy = {
      handleTabInactive: vi.fn(),
      handleTabActive: vi.fn()
    };
    window.battleStore.engine = engineSpy;

    // Mock document.hidden
    Object.defineProperty(document, "hidden", { value: true, configurable: true });

    // Trigger visibility change
    document.dispatchEvent(new Event("visibilitychange"));

    // Check that engine method was called
    expect(engineSpy.handleTabInactive).toHaveBeenCalled();

    delete window.battleStore;
  });

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";
import { withMutedConsole } from "../utils/console.js";

  it("keeps lifecycle listeners idempotent when wireEvents is called multiple times", async () => {
    await withMutedConsole(async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const mod = await loadBattleCLI();
      await mod.init();

      mod.wireEvents();
      mod.wireEvents();

      const countLogs = (message) =>
        consoleSpy.mock.calls.filter(([logged]) => logged === message).length;

      const pauseBefore = countLogs("[TIMER] pauseTimers called");
      const resumeBefore = countLogs("[TIMER] resumeTimers called");

      Object.defineProperty(document, "hidden", { value: true, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));

      const pauseAfterVisibilityHidden = countLogs("[TIMER] pauseTimers called");
      expect(pauseAfterVisibilityHidden - pauseBefore).toBe(1);

      Object.defineProperty(document, "hidden", { value: false, configurable: true });
      document.dispatchEvent(new Event("visibilitychange"));

      const resumeAfterVisibilityVisible = countLogs("[TIMER] resumeTimers called");
      expect(resumeAfterVisibilityVisible - resumeBefore).toBe(1);

      const pauseBeforePageHide = countLogs("[TIMER] pauseTimers called");
      window.dispatchEvent(new Event("pagehide"));
      const pauseAfterPageHide = countLogs("[TIMER] pauseTimers called");
      expect(pauseAfterPageHide - pauseBeforePageHide).toBe(1);

      const resumeBeforePageShow = countLogs("[TIMER] resumeTimers called");
      const pageShow = new Event("pageshow");
      Object.defineProperty(pageShow, "persisted", { value: true, configurable: true });
      window.dispatchEvent(pageShow);
      const resumeAfterPageShow = countLogs("[TIMER] resumeTimers called");
      expect(resumeAfterPageShow - resumeBeforePageShow).toBe(1);

      consoleSpy.mockRestore();
    });
  });

  it("calls engine handleTabActive when tab becomes visible", async () => {
    const mod = await loadBattleCLI();
    await mod.init();

    // Mock engine with spy
    const engineSpy = {
      handleTabInactive: vi.fn(),
      handleTabActive: vi.fn()
    };
    window.battleStore.engine = engineSpy;

    // Mock document.hidden as false
    Object.defineProperty(document, "hidden", { value: false, configurable: true });

    // Trigger visibility change
    document.dispatchEvent(new Event("visibilitychange"));

    // Check that engine method was called
    expect(engineSpy.handleTabActive).toHaveBeenCalled();

    delete window.battleStore;
  });
});
