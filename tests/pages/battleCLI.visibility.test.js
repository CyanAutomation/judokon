import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadBattleCLI, cleanupBattleCLI } from "./utils/loadBattleCLI.js";
import { withMutedConsole } from "../utils/console.js";

describe("battleCLI visibility change handling", () => {
  let originalDocumentAdd;
  let originalWindowAdd;
  let visibilityHandler;
  let pageShowHandler;
  let pageHideHandler;

  beforeEach(() => {
    visibilityHandler = undefined;
    pageShowHandler = undefined;
    pageHideHandler = undefined;

    originalDocumentAdd = document.addEventListener;
    document.addEventListener = new Proxy(originalDocumentAdd, {
      apply(target, thisArg, args) {
        const [type, handler] = args;
        if (type === "visibilitychange" && typeof handler === "function") {
          visibilityHandler = handler;
        }
        return Reflect.apply(target, thisArg, args);
      }
    });

    originalWindowAdd = window.addEventListener;
    window.addEventListener = new Proxy(originalWindowAdd, {
      apply(target, thisArg, args) {
        const [type, handler] = args;
        if (type === "pageshow" && typeof handler === "function") {
          pageShowHandler = handler;
        }
        if (type === "pagehide" && typeof handler === "function") {
          pageHideHandler = handler;
        }
        return Reflect.apply(target, thisArg, args);
      }
    });
  });

  afterEach(async () => {
    document.addEventListener = originalDocumentAdd;
    window.addEventListener = originalWindowAdd;
    await cleanupBattleCLI();
  });

  it("calls pauseTimers when tab becomes hidden", async () => {
    await withMutedConsole(async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const hiddenSpy = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
      try {
        const mod = await loadBattleCLI();
        await mod.init();

        visibilityHandler?.(new Event("visibilitychange"));

        expect(consoleSpy).toHaveBeenCalledWith("[TIMER] pauseTimers called");
      } finally {
        hiddenSpy.mockRestore();
        consoleSpy.mockRestore();
      }
    });
  });

  it("calls resumeTimers when tab becomes visible", async () => {
    await withMutedConsole(async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      const hiddenSpy = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
      try {
        const mod = await loadBattleCLI();
        await mod.init();

        visibilityHandler?.(new Event("visibilitychange"));

        expect(consoleSpy).toHaveBeenCalledWith("[TIMER] resumeTimers called");
      } finally {
        hiddenSpy.mockRestore();
        consoleSpy.mockRestore();
      }
    });
  });

  it("calls engine handleTabInactive when tab becomes hidden", async () => {
    const hiddenSpy = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    try {
      const mod = await loadBattleCLI();
      await mod.init();

      const engineSpy = {
        handleTabInactive: vi.fn(),
        handleTabActive: vi.fn()
      };
      window.battleStore.engine = engineSpy;

      visibilityHandler?.(new Event("visibilitychange"));

      expect(engineSpy.handleTabInactive).toHaveBeenCalled();
      delete window.battleStore;
    } finally {
      hiddenSpy.mockRestore();
    }
  });

  it("keeps lifecycle listeners idempotent when wireEvents is called multiple times", async () => {
    await withMutedConsole(async () => {
      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
      try {
        const mod = await loadBattleCLI();
        await mod.init();

        mod.wireEvents();
        mod.wireEvents();

        const countLogs = (message) =>
          consoleSpy.mock.calls.filter(([logged]) => logged === message).length;

        const pauseBefore = countLogs("[TIMER] pauseTimers called");
        const resumeBefore = countLogs("[TIMER] resumeTimers called");

        const hiddenSpyTrue = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
        visibilityHandler?.(new Event("visibilitychange"));

        const pauseAfterVisibilityHidden = countLogs("[TIMER] pauseTimers called");
        expect(pauseAfterVisibilityHidden - pauseBefore).toBe(1);

        hiddenSpyTrue.mockRestore();
        const hiddenSpyFalse = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
        visibilityHandler?.(new Event("visibilitychange"));

        const resumeAfterVisibilityVisible = countLogs("[TIMER] resumeTimers called");
        expect(resumeAfterVisibilityVisible - resumeBefore).toBe(1);
        hiddenSpyFalse.mockRestore();

        const pauseBeforePageHide = countLogs("[TIMER] pauseTimers called");
        pageHideHandler?.(new Event("pagehide"));
        const pauseAfterPageHide = countLogs("[TIMER] pauseTimers called");
        expect(pauseAfterPageHide - pauseBeforePageHide).toBe(1);

        const resumeBeforePageShow = countLogs("[TIMER] resumeTimers called");
        pageShowHandler?.({ persisted: true });
        const resumeAfterPageShow = countLogs("[TIMER] resumeTimers called");
        expect(resumeAfterPageShow - resumeBeforePageShow).toBe(1);
      } finally {
        vi.restoreAllMocks();
      }
    });
  });

  it("calls engine handleTabActive when tab becomes visible", async () => {
    const hiddenSpy = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    try {
      const mod = await loadBattleCLI();
      await mod.init();

      const engineSpy = {
        handleTabInactive: vi.fn(),
        handleTabActive: vi.fn()
      };
      window.battleStore.engine = engineSpy;

      visibilityHandler?.(new Event("visibilitychange"));

      expect(engineSpy.handleTabActive).toHaveBeenCalled();
      delete window.battleStore;
    } finally {
      hiddenSpy.mockRestore();
    }
  });
});
