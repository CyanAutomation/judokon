import { describe, it, expect, vi, beforeEach } from "vitest";
import { withListenerSpy, expectListenerAttached, wrapAddEventListener } from "./listenerUtils.js";

describe("listenerUtils", () => {
  let element;

  beforeEach(() => {
    element = document.createElement("button");
  });

  describe("withListenerSpy", () => {
    it("should capture event handler invocations", async () => {
      let capturedCalls = [];

      await withListenerSpy(element, "click", async (calls) => {
        capturedCalls = calls;

        // Simulate clicking the element
        element.click();

        expect(calls).toHaveLength(1);
        expect(calls[0].type).toBe("click");
        expect(calls[0].target).toBe(element);
        expect(calls[0].event.type).toBe("click");
      });

      // Calls should be captured
      expect(capturedCalls).toHaveLength(1);
    });

    it("should work with existing listeners", async () => {
      const originalHandler = vi.fn();
      element.addEventListener("click", originalHandler);

      await withListenerSpy(element, "click", async (calls) => {
        element.click();

        expect(calls).toHaveLength(1);
        expect(originalHandler).toHaveBeenCalledWith(calls[0].event);
      });
    });

    it("should work with existing listeners", async () => {
      const originalHandler = vi.fn();
      element.addEventListener("click", originalHandler);

      await withListenerSpy(element, "click", async (calls) => {
        element.click();
        expect(calls).toHaveLength(1);
        expect(originalHandler).toHaveBeenCalledTimes(1); // Existing listeners still run
      });

      // Existing listeners still work after spy is removed
      element.click();
      expect(originalHandler).toHaveBeenCalledTimes(2);
    });

    it("should handle multiple events", async () => {
      await withListenerSpy(element, "click", async (calls) => {
        element.click();
        element.click();

        expect(calls).toHaveLength(2);
        expect(calls[0].timestamp).toBeLessThanOrEqual(calls[1].timestamp);
      });
    });

    it("should throw error for invalid target", async () => {
      await expect(withListenerSpy(null, "click", vi.fn())).rejects.toThrow(
        "Target must be an EventTarget"
      );

      await expect(withListenerSpy({}, "click", vi.fn())).rejects.toThrow(
        "Target must be an EventTarget"
      );
    });
  });

  describe("expectListenerAttached", () => {
    it("should return false for elements without listeners", () => {
      expect(expectListenerAttached(element, "click")).toBe(false);
    });

    it("should return true for wrapped elements with listeners", () => {
      const wrapper = wrapAddEventListener(element);
      element.addEventListener("click", vi.fn());

      expect(expectListenerAttached(element, "click")).toBe(true);

      wrapper.cleanup();
    });

    it("should return false after cleanup", () => {
      const wrapper = wrapAddEventListener(element);
      element.addEventListener("click", vi.fn());
      wrapper.cleanup();

      expect(expectListenerAttached(element, "click")).toBe(false);
    });

    it("should handle null/undefined targets", () => {
      expect(expectListenerAttached(null, "click")).toBe(false);
      expect(expectListenerAttached(undefined, "click")).toBe(false);
    });
  });

  describe("wrapAddEventListener", () => {
    it("should enable listener tracking", () => {
      const wrapper = wrapAddEventListener(element);

      expect(expectListenerAttached(element, "click")).toBe(false);

      element.addEventListener("click", vi.fn());
      expect(expectListenerAttached(element, "click")).toBe(true);

      wrapper.cleanup();
    });

    it("should track multiple event types", () => {
      const wrapper = wrapAddEventListener(element);

      element.addEventListener("click", vi.fn());
      element.addEventListener("keydown", vi.fn());

      expect(expectListenerAttached(element, "click")).toBe(true);
      expect(expectListenerAttached(element, "keydown")).toBe(true);
      expect(expectListenerAttached(element, "mouseover")).toBe(false);

      wrapper.cleanup();
    });

    it("should restore original addEventListener on cleanup", () => {
      const originalAdd = element.addEventListener;
      const wrapper = wrapAddEventListener(element);

      expect(element.addEventListener).not.toBe(originalAdd);

      wrapper.cleanup();
      expect(element.addEventListener).toBe(originalAdd);
    });

    it("should throw error for invalid target", () => {
      expect(() => wrapAddEventListener(null)).toThrow("Target must be an EventTarget");

      expect(() => wrapAddEventListener({})).toThrow("Target must be an EventTarget");
    });

    it("should clean up tracking data on cleanup", () => {
      const wrapper = wrapAddEventListener(element);
      element.addEventListener("click", vi.fn());

      expect(element._listenerUtilsWrapped).toBeDefined();

      wrapper.cleanup();
      expect(element._listenerUtilsWrapped).toBeUndefined();
    });
  });

  describe("integration tests", () => {
    it("should work together for comprehensive listener testing", async () => {
      const wrapper = wrapAddEventListener(element);
      const handler = vi.fn();
      element.addEventListener("click", handler);

      // Verify listener is detected
      expect(expectListenerAttached(element, "click")).toBe(true);

      // Test with spy
      await withListenerSpy(element, "click", async (calls) => {
        element.click();

        expect(calls).toHaveLength(1);
        expect(handler).toHaveBeenCalledTimes(1);
      });

      wrapper.cleanup();
    });

    it("should handle EventTarget objects", async () => {
      const eventTarget = new EventTarget();
      const wrapper = wrapAddEventListener(eventTarget);

      eventTarget.addEventListener("custom", vi.fn());
      expect(expectListenerAttached(eventTarget, "custom")).toBe(true);

      await withListenerSpy(eventTarget, "custom", async (calls) => {
        eventTarget.dispatchEvent(new CustomEvent("custom"));
        expect(calls).toHaveLength(1);
      });

      wrapper.cleanup();
    });
  });
});
