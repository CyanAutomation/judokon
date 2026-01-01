import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import { interactions } from "../utils/componentTestUtils.js";

describe("onDomReady (Enhanced Natural Document Lifecycle)", () => {
  let timers;
  beforeEach(() => {
    timers = useCanonicalTimers();
    vi.resetModules();
  });

  afterEach(() => {
    timers.cleanup();
  });

  it("initializes a real helper once the DOM is ready", async () => {
    // Ensure document is in loading state before importing module
    interactions.naturalDocumentReady("loading", false);
    
    const legacyMarker = document.createElement("div");
    legacyMarker.dataset.enlargeListenerAttached = "true";
    legacyMarker.dataset.enlarged = "true";
    document.body.appendChild(legacyMarker);

    await import("../../src/helpers/setupHoverZoom.js");

    // Trigger DOM ready to execute the cleanup callback
    interactions.naturalDocumentReady("complete", true);
    await vi.runAllTimersAsync();

    expect(legacyMarker.hasAttribute("data-enlarge-listener-attached")).toBe(false);
    expect(legacyMarker.hasAttribute("data-enlarged")).toBe(false);
    legacyMarker.remove();
  });

  it("runs callback after DOMContentLoaded when loading using natural document state", async () => {
    interactions.naturalDocumentReady("loading", false);

    const addSpy = vi.spyOn(document, "addEventListener");
    const { onDomReady } = await import("../../src/helpers/domReady.js");
    const fn = vi.fn();

    onDomReady(fn);
    expect(fn).not.toHaveBeenCalled();
    expect(addSpy).toHaveBeenCalledWith("DOMContentLoaded", fn, { once: true });

    interactions.naturalDocumentReady("complete", true);
    await vi.runAllTimersAsync();

    expect(fn).toHaveBeenCalledTimes(1);
  });
});
