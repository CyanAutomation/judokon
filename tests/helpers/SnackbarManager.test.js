/**
 * Unit tests for SnackbarManager
 *
 * Tests the snackbar lifecycle manager with priority system, queuing,
 * and minimum display duration enforcement.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import snackbarManager, { SnackbarPriority } from "../../src/helpers/SnackbarManager.js";

describe("SnackbarManager", () => {
  let timers; // Declare at a higher scope to be accessible in afterEach

  beforeEach(() => {
    // Clear all snackbars before each test
    snackbarManager.clearAll();

    // Reset DOM
    document.body.innerHTML = "";

    // Enable snackbars
    snackbarManager.disabled = false;
    if (typeof window !== "undefined") {
      window.__disableSnackbars = false;
    }

    timers = useCanonicalTimers(); // Assign the returned object
  });

  afterEach(() => {
    snackbarManager.clearAll();
    vi.restoreAllMocks();
    timers.cleanup(); // Call the cleanup method provided by useCanonicalTimers
  });

  describe("Basic Display", () => {
    it("should display a snackbar with default priority", () => {
      const controller = snackbarManager.show("Test message");

      expect(controller).toBeDefined();
      expect(controller.id).toBeDefined();

      const diagnostics = snackbarManager.getDiagnostics();
      expect(diagnostics.activeCount).toBe(1);
      expect(diagnostics.active[0].message).toBe("Test message");
      expect(diagnostics.active[0].priority).toBe(SnackbarPriority.NORMAL);
    });

    it("should create snackbar DOM element", () => {
      snackbarManager.show("Test message");

      const element = document.querySelector(".snackbar");
      expect(element).toBeDefined();
      expect(element.textContent).toBe("Test message");
      expect(element.getAttribute("role")).toBe("status");
      expect(element.getAttribute("aria-live")).toBe("polite");
    });

    it("should display snackbar with HIGH priority", () => {
      snackbarManager.show({
        message: "Important message",
        priority: SnackbarPriority.HIGH
      });

      const diagnostics = snackbarManager.getDiagnostics();
      expect(diagnostics.active[0].priority).toBe(SnackbarPriority.HIGH);
      expect(diagnostics.currentPriority).toBe(SnackbarPriority.HIGH);

      const element = document.querySelector(".snackbar");
      expect(element.getAttribute("aria-live")).toBe("assertive");
    });
  });

  describe("Priority System", () => {
    it("should allow high priority message when normal is active", () => {
      snackbarManager.show({
        message: "Normal message",
        priority: SnackbarPriority.NORMAL
      });

      snackbarManager.show({
        message: "High priority",
        priority: SnackbarPriority.HIGH
      });

      const diagnostics = snackbarManager.getDiagnostics();
      expect(diagnostics.activeCount).toBe(2);
      expect(diagnostics.currentPriority).toBe(SnackbarPriority.HIGH);
    });

    it("should queue low priority message when high is active", () => {
      snackbarManager.show({
        message: "High priority",
        priority: SnackbarPriority.HIGH
      });

      snackbarManager.show({
        message: "Low priority",
        priority: SnackbarPriority.LOW
      });

      const diagnostics = snackbarManager.getDiagnostics();
      expect(diagnostics.activeCount).toBe(1);
      expect(diagnostics.queueLength).toBe(1);
      expect(diagnostics.queued[0].message).toBe("Low priority");
    });

    it("should process queue after removing high priority message", async () => {
      const highController = snackbarManager.show({
        message: "High priority",
        priority: SnackbarPriority.HIGH,
        minDuration: 0
      });

      snackbarManager.show({
        message: "Queued message",
        priority: SnackbarPriority.NORMAL
      });

      expect(snackbarManager.getDiagnostics().queueLength).toBe(1);

      await highController.remove();

      expect(snackbarManager.getDiagnostics().queueLength).toBe(0);
      expect(snackbarManager.getDiagnostics().activeCount).toBe(1);
    });
  });

  describe("Minimum Display Duration", () => {
    it("should enforce minimum display duration", async () => {
      const controller = snackbarManager.show({
        message: "Test",
        minDuration: 750,
        autoDismiss: 0
      });

      // Try to remove immediately
      const removePromise = controller.remove();

      // Advance time by 500ms (less than minDuration)
      await vi.advanceTimersByTimeAsync(500);

      // Should still be active (not yet removed)
      expect(snackbarManager.getDiagnostics().activeCount).toBe(1);

      // Advance remaining time
      await vi.advanceTimersByTimeAsync(250);

      // Wait for remove to complete
      await removePromise;

      // Now should be removed
      expect(snackbarManager.getDiagnostics().activeCount).toBe(0);
    });

    it("should resolve waitForMinDuration after duration elapses", async () => {
      const controller = snackbarManager.show({
        message: "Test",
        minDuration: 500,
        autoDismiss: 0
      });

      const waitPromise = controller.waitForMinDuration();

      // Advance time by 300ms
      await vi.advanceTimersByTimeAsync(300);

      // Promise should not be resolved yet
      let resolved = false;
      waitPromise.then(() => {
        resolved = true;
      });

      await Promise.resolve(); // Flush microtasks
      expect(resolved).toBe(false);

      // Advance remaining time
      await vi.advanceTimersByTimeAsync(200);
      await waitPromise;

      expect(resolved).toBe(true);
    });
  });

  describe("Queuing System", () => {
    it("should enforce max concurrent limit", () => {
      snackbarManager.show("Message 1");
      snackbarManager.show("Message 2");
      snackbarManager.show("Message 3");

      const diagnostics = snackbarManager.getDiagnostics();
      expect(diagnostics.activeCount).toBe(2);
    });

    it("should remove oldest when exceeding limit", () => {
      snackbarManager.show("First message");
      snackbarManager.show("Second message");
      snackbarManager.show("Third message");

      const diagnostics = snackbarManager.getDiagnostics();
      expect(diagnostics.activeCount).toBe(2);

      // First message should be removed
      const messages = diagnostics.active.map((s) => s.message);
      expect(messages).not.toContain("First message");
      expect(messages).toContain("Second message");
      expect(messages).toContain("Third message");
    });
  });

  describe("Auto-dismiss", () => {
    it("should auto-dismiss after timeout", async () => {
      snackbarManager.show({
        message: "Auto-dismiss test",
        autoDismiss: 1000
      });

      expect(snackbarManager.getDiagnostics().activeCount).toBe(1);

      await vi.advanceTimersByTimeAsync(1000);

      expect(snackbarManager.getDiagnostics().activeCount).toBe(0);
    });

    it("should not auto-dismiss when autoDismiss is 0", async () => {
      snackbarManager.show({
        message: "No auto-dismiss",
        autoDismiss: 0
      });

      await vi.advanceTimersByTimeAsync(5000);

      expect(snackbarManager.getDiagnostics().activeCount).toBe(1);
    });
  });

  describe("Update", () => {
    it("should update existing snackbar message", () => {
      const controller = snackbarManager.show("Original message");

      controller.update("Updated message");

      const diagnostics = snackbarManager.getDiagnostics();
      expect(diagnostics.active[0].message).toBe("Updated message");

      const element = document.querySelector(".snackbar");
      expect(element.textContent).toBe("Updated message");
    });

    it("should update queued message", () => {
      snackbarManager.show({
        message: "High priority",
        priority: SnackbarPriority.HIGH
      });

      const controller = snackbarManager.show({
        message: "Queued message",
        priority: SnackbarPriority.LOW
      });

      controller.update("Updated queued");

      const diagnostics = snackbarManager.getDiagnostics();
      expect(diagnostics.queued[0].message).toBe("Updated queued");
    });
  });

  describe("Callbacks", () => {
    it("should call onShow callback", () => {
      const onShow = vi.fn();

      snackbarManager.show({
        message: "Test",
        onShow
      });

      expect(onShow).toHaveBeenCalledTimes(1);
    });

    it("should call onDismiss callback", async () => {
      const onDismiss = vi.fn();

      const controller = snackbarManager.show({
        message: "Test",
        minDuration: 0,
        autoDismiss: 0,
        onDismiss
      });

      await controller.remove();

      expect(onDismiss).toHaveBeenCalledTimes(1);
    });
  });

  describe("Positioning", () => {
    it("should apply .snackbar-bottom to newest message", () => {
      snackbarManager.show("First");
      snackbarManager.show("Second");

      // Get snackbars sorted by DOM order
      const snackbars = Array.from(document.querySelectorAll(".snackbar"));
      expect(snackbars).toHaveLength(2);

      // Check that only one has .snackbar-bottom
      const bottomSnackbars = snackbars.filter((s) => s.classList.contains("snackbar-bottom"));
      expect(bottomSnackbars).toHaveLength(1);

      // Newest (Second) should be at bottom, oldest (First) at top
      // The first DOM element is oldest, second is newest
      // After positioning, oldest gets .snackbar-top, newest gets .snackbar-bottom
      const firstSnackbar = snackbars.find((s) => s.textContent === "First");
      const secondSnackbar = snackbars.find((s) => s.textContent === "Second");

      expect(firstSnackbar).toBeDefined();
      expect(secondSnackbar).toBeDefined();

      // Get detailed class information for debugging
      const firstClasses = Array.from(firstSnackbar.classList);
      const secondClasses = Array.from(secondSnackbar.classList);

      // If first doesn't have snackbar-top, fail with detailed info
      if (!firstSnackbar.classList.contains("snackbar-top")) {
        throw new Error(
          `First snackbar classes: [${firstClasses.join(", ")}], Second snackbar classes: [${secondClasses.join(", ")}]`
        );
      }

      expect(firstSnackbar.classList.contains("snackbar-top")).toBe(true);
      expect(secondSnackbar.classList.contains("snackbar-bottom")).toBe(true);
    });

    it("should prioritize HIGH priority for bottom position", () => {
      snackbarManager.show({
        message: "Normal",
        priority: SnackbarPriority.NORMAL
      });

      snackbarManager.show({
        message: "High",
        priority: SnackbarPriority.HIGH
      });

      const snackbars = Array.from(document.querySelectorAll(".snackbar"));
      const bottomSnackbar = snackbars.find((s) => s.classList.contains("snackbar-bottom"));

      expect(bottomSnackbar.textContent).toBe("High");
    });
  });

  describe("Disabled State", () => {
    it("should not display when manager is disabled", () => {
      snackbarManager.disabled = true;

      const controller = snackbarManager.show("Test");

      expect(controller).toBeNull();
      expect(snackbarManager.getDiagnostics().activeCount).toBe(0);
    });

    it("should not display when window.__disableSnackbars is true", () => {
      if (typeof window !== "undefined") {
        window.__disableSnackbars = true;
      }

      const controller = snackbarManager.show("Test");

      expect(controller).toBeNull();
      expect(snackbarManager.getDiagnostics().activeCount).toBe(0);
    });
  });

  describe("Diagnostics", () => {
    it("should provide comprehensive diagnostics", () => {
      snackbarManager.show({
        message: "Active 1",
        priority: SnackbarPriority.HIGH
      });

      snackbarManager.show({
        message: "Active 2",
        priority: SnackbarPriority.NORMAL
      });

      snackbarManager.show({
        message: "Queued",
        priority: SnackbarPriority.LOW
      });

      const diagnostics = snackbarManager.getDiagnostics();

      expect(diagnostics.activeCount).toBe(2);
      expect(diagnostics.queueLength).toBe(1);
      expect(diagnostics.currentPriority).toBe(SnackbarPriority.HIGH);
      expect(diagnostics.active).toHaveLength(2);
      expect(diagnostics.queued).toHaveLength(1);
    });
  });

  describe("Clear All", () => {
    it("should remove all active snackbars immediately", () => {
      snackbarManager.show({
        message: "Test 1",
        minDuration: 5000
      });

      snackbarManager.show({
        message: "Test 2",
        minDuration: 5000
      });

      expect(snackbarManager.getDiagnostics().activeCount).toBe(2);

      snackbarManager.clearAll();

      expect(snackbarManager.getDiagnostics().activeCount).toBe(0);
      expect(document.querySelectorAll(".snackbar")).toHaveLength(0);
    });

    it("should clear queue", () => {
      snackbarManager.show({
        message: "High",
        priority: SnackbarPriority.HIGH
      });

      snackbarManager.show({
        message: "Queued",
        priority: SnackbarPriority.LOW
      });

      snackbarManager.clearAll();

      const diagnostics = snackbarManager.getDiagnostics();
      expect(diagnostics.activeCount).toBe(0);
      expect(diagnostics.queueLength).toBe(0);
    });
  });
});
