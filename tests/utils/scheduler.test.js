import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  onFrame,
  onSecondTick,
  stop,
  createTestController,
  pause
} from "../../src/utils/scheduler.js";

// Set up test environment
globalThis.__TEST__ = true;

describe("createTestController", () => {
  let controller;

  beforeEach(() => {
    // Set up test environment
    globalThis.__TEST__ = true;
    controller = createTestController();
  });

  afterEach(() => {
    if (controller) {
      controller.dispose();
    }
    stop(); // Clean up scheduler state
  });

  it("should throw error when not in test environment", () => {
    globalThis.__TEST__ = false;
    expect(() => createTestController()).toThrow(
      "createTestController() is only available in test environments"
    );
    globalThis.__TEST__ = true; // Restore for other tests
  });

  it("should create a controller with required methods", () => {
    expect(controller).toHaveProperty("advanceFrame");
    expect(controller).toHaveProperty("advanceTime");
    expect(controller).toHaveProperty("getFrameCount");
    expect(controller).toHaveProperty("dispose");
    expect(typeof controller.advanceFrame).toBe("function");
    expect(typeof controller.advanceTime).toBe("function");
    expect(typeof controller.getFrameCount).toBe("function");
    expect(typeof controller.dispose).toBe("function");
  });

  it("should start with zero frame count", () => {
    expect(controller.getFrameCount()).toBe(0);
  });

  it("should execute frame callbacks when advancing frames", () => {
    const frameCallback = vi.fn();
    onFrame(frameCallback);

    controller.advanceFrame();

    expect(frameCallback).toHaveBeenCalledTimes(1);
    expect(frameCallback).toHaveBeenCalledWith(16); // First frame at 16ms
    expect(controller.getFrameCount()).toBe(1);
  });

  it("should execute second callbacks when advancing past second boundaries", () => {
    const secondCallback = vi.fn();
    onSecondTick(secondCallback);

    // Advance to just before 1 second (960ms)
    controller.advanceTime(960);
    expect(secondCallback).not.toHaveBeenCalled();

    // Advance past 1 second boundary
    controller.advanceTime(40); // Total: 1000ms
    expect(secondCallback).toHaveBeenCalledTimes(1);
    expect(secondCallback).toHaveBeenCalledWith(1000);
  });

  it("should advance multiple frames correctly", () => {
    const frameCallback = vi.fn();
    onFrame(frameCallback);

    controller.advanceFrame();
    controller.advanceFrame();
    controller.advanceFrame();

    expect(frameCallback).toHaveBeenCalledTimes(3);
    expect(frameCallback).toHaveBeenNthCalledWith(1, 16);
    expect(frameCallback).toHaveBeenNthCalledWith(2, 32);
    expect(frameCallback).toHaveBeenNthCalledWith(3, 48);
    expect(controller.getFrameCount()).toBe(3);
  });

  it("should advance time by milliseconds and execute appropriate frames", () => {
    const frameCallback = vi.fn();
    onFrame(frameCallback);

    // Advance 50ms (should execute ~3 frames at 16ms intervals)
    controller.advanceTime(50);

    expect(frameCallback).toHaveBeenCalledTimes(3); // 16, 32, 48
    expect(controller.getFrameCount()).toBe(3);
  });

  it("should handle advanceTime with exact frame boundaries", () => {
    const frameCallback = vi.fn();
    onFrame(frameCallback);

    // Advance exactly 32ms (should execute 2 frames)
    controller.advanceTime(32);

    expect(frameCallback).toHaveBeenCalledTimes(2);
    expect(frameCallback).toHaveBeenNthCalledWith(1, 16);
    expect(frameCallback).toHaveBeenNthCalledWith(2, 32);
    expect(controller.getFrameCount()).toBe(2);
  });

  it("should not execute callbacks when disposed", () => {
    const frameCallback = vi.fn();
    onFrame(frameCallback);

    controller.dispose();

    controller.advanceFrame();
    expect(frameCallback).not.toHaveBeenCalled();
    expect(controller.getFrameCount()).toBe(0);
  });

  it("should restore original timing functions after dispose", () => {
    const originalRaf = globalThis.requestAnimationFrame;
    const originalCaf = globalThis.cancelAnimationFrame;

    // Create controller which overrides the globals
    const testController = createTestController();
    expect(globalThis.requestAnimationFrame).not.toBe(originalRaf);
    expect(globalThis.cancelAnimationFrame).not.toBe(originalCaf);

    testController.dispose();

    expect(globalThis.requestAnimationFrame).toBe(originalRaf);
    expect(globalThis.cancelAnimationFrame).toBe(originalCaf);
  });

  it("should handle multiple controllers independently", () => {
    const controller2 = createTestController();

    const callback1 = vi.fn();
    const callback2 = vi.fn();

    onFrame(callback1);
    controller.advanceFrame();
    expect(callback1).toHaveBeenCalledTimes(1);

    // Clear callbacks and switch to second controller
    stop(); // This clears all callbacks
    onFrame(callback2);
    controller2.advanceFrame();

    expect(callback1).toHaveBeenCalledTimes(1); // Should not be called again
    expect(callback2).toHaveBeenCalledTimes(1);
    expect(controller.getFrameCount()).toBe(1);
    expect(controller2.getFrameCount()).toBe(1);

    controller2.dispose();
  });

  it("should handle paused scheduler state", async () => {
    const frameCallback = vi.fn();
    onFrame(frameCallback);

    pause();

    controller.advanceFrame();

    // Callbacks should not execute when paused
    expect(frameCallback).not.toHaveBeenCalled();
    expect(controller.getFrameCount()).toBe(1); // Frame count still increments
  });
});
