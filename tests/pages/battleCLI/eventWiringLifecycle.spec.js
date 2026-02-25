import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { loadBattleCLI, cleanupBattleCLI } from "../utils/loadBattleCLI.js";
import { resetCliState } from "../../utils/battleCliTestUtils.js";

function createTargetListenerTracker(target, targetName, trackedTypes) {
  const originalAdd = target.addEventListener;
  const originalRemove = target.removeEventListener;
  const active = new Map();

  target.addEventListener = function patchedAdd(type, listener, options) {
    if (trackedTypes.includes(type) && typeof listener === "function") {
      if (!active.has(type)) {
        active.set(type, new Set());
      }
      active.get(type).add(listener);
    }
    return originalAdd.call(this, type, listener, options);
  };

  target.removeEventListener = function patchedRemove(type, listener, options) {
    if (trackedTypes.includes(type) && typeof listener === "function") {
      active.get(type)?.delete(listener);
    }
    return originalRemove.call(this, type, listener, options);
  };

  return {
    targetName,
    count(type) {
      return active.get(type)?.size ?? 0;
    },
    restore() {
      target.addEventListener = originalAdd;
      target.removeEventListener = originalRemove;
    }
  };
}

describe("battleCLI listener lifecycle", () => {
  let battleCliLoaded = false;

  beforeEach(async () => {
    await resetCliState();
  });

  afterEach(async () => {
    await resetCliState();
    if (battleCliLoaded) {
      await cleanupBattleCLI();
      battleCliLoaded = false;
    }
  });

  it("keeps lifecycle and verbose scroll listeners stable across wire → unwire → wire cycles", async () => {
    const cli = await loadBattleCLI();
    battleCliLoaded = true;
    const initModule = await import("../../../src/pages/battleCLI/init.js");
    const domModule = await import("../../../src/pages/battleCLI/dom.js");
    domModule.resetVerboseScrollHandling();
    const verboseLog = document.getElementById("cli-verbose-log");
    expect(verboseLog).toBeTruthy();

    const windowTracker = createTargetListenerTracker(window, "window", [
      "keydown",
      "pageshow",
      "pagehide",
      "resize"
    ]);
    const documentTracker = createTargetListenerTracker(document, "document", ["keydown", "click"]);
    const verboseLogTracker = createTargetListenerTracker(verboseLog, "verboseLog", ["scroll"]);

    const baseline = {
      windowResize: windowTracker.count("resize"),
      windowKeydown: windowTracker.count("keydown"),
      windowPageshow: windowTracker.count("pageshow"),
      windowPagehide: windowTracker.count("pagehide"),
      documentKeydown: documentTracker.count("keydown"),
      documentClick: documentTracker.count("click"),
      verboseScroll: verboseLogTracker.count("scroll")
    };

    try {
      await cli.init();

      expect(windowTracker.count("resize") - baseline.windowResize).toBe(1);
      expect(verboseLogTracker.count("scroll") - baseline.verboseScroll).toBe(1);
      expect(windowTracker.count("keydown") - baseline.windowKeydown).toBe(1);
      expect(windowTracker.count("pageshow") - baseline.windowPageshow).toBe(1);
      expect(windowTracker.count("pagehide") - baseline.windowPagehide).toBe(1);
      expect(documentTracker.count("keydown") - baseline.documentKeydown).toBe(1);
      expect(documentTracker.count("click") - baseline.documentClick).toBe(1);

      initModule.unwireEvents();

      expect(windowTracker.count("resize") - baseline.windowResize).toBe(0);
      expect(verboseLogTracker.count("scroll") - baseline.verboseScroll).toBe(0);
      expect(windowTracker.count("keydown") - baseline.windowKeydown).toBe(0);
      expect(windowTracker.count("pageshow") - baseline.windowPageshow).toBe(0);
      expect(windowTracker.count("pagehide") - baseline.windowPagehide).toBe(0);
      expect(documentTracker.count("keydown") - baseline.documentKeydown).toBe(0);
      expect(documentTracker.count("click") - baseline.documentClick).toBe(0);

      await initModule.init();

      expect(windowTracker.count("resize") - baseline.windowResize).toBe(1);
      expect(verboseLogTracker.count("scroll") - baseline.verboseScroll).toBe(1);
      expect(windowTracker.count("keydown") - baseline.windowKeydown).toBe(1);
      expect(windowTracker.count("pageshow") - baseline.windowPageshow).toBe(1);
      expect(windowTracker.count("pagehide") - baseline.windowPagehide).toBe(1);
      expect(documentTracker.count("keydown") - baseline.documentKeydown).toBe(1);
      expect(documentTracker.count("click") - baseline.documentClick).toBe(1);

      await initModule.resetMatch();
      window.dispatchEvent(new Event("pagehide"));
      const pageShowEvent = new Event("pageshow");
      Object.defineProperty(pageShowEvent, "persisted", { value: true });
      window.dispatchEvent(pageShowEvent);

      expect(windowTracker.count("resize") - baseline.windowResize).toBe(1);
      expect(verboseLogTracker.count("scroll") - baseline.verboseScroll).toBe(1);
      expect(windowTracker.count("keydown") - baseline.windowKeydown).toBe(1);
      expect(windowTracker.count("pageshow") - baseline.windowPageshow).toBe(1);
      expect(windowTracker.count("pagehide") - baseline.windowPagehide).toBe(1);
      expect(documentTracker.count("keydown") - baseline.documentKeydown).toBe(1);
      expect(documentTracker.count("click") - baseline.documentClick).toBe(1);
    } finally {
      windowTracker.restore();
      documentTracker.restore();
      verboseLogTracker.restore();
    }
  });
});
