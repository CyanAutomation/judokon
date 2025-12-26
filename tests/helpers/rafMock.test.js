import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  install,
  uninstall,
  flushNext,
  flushAll
} from "./rafMock.js";

/**
 * @pseudocode
 * - Test queueing and flush ordering contract
 */
describe("RafMock", () => {
  beforeEach(() => {
    install();
  });

  afterEach(() => {
    uninstall();
  });

  it("queues callbacks and flushes them in FIFO order", () => {
    const calls = [];
    const cb1 = vi.fn(() => calls.push(1));
    const cb2 = vi.fn(() => calls.push(2));
    const cb3 = vi.fn(() => calls.push(3));

    requestAnimationFrame(cb1);
    requestAnimationFrame(cb2);
    requestAnimationFrame(cb3);

    flushAll();

    expect(calls).toEqual([1, 2, 3]);
  });

  it("flushNext executes only the next queued callback", () => {
    const calls = [];
    const cb1 = vi.fn(() => calls.push(1));
    const cb2 = vi.fn(() => calls.push(2));

    requestAnimationFrame(cb1);
    requestAnimationFrame(cb2);

    flushNext();
    expect(calls).toEqual([1]);

    flushNext();
    expect(calls).toEqual([1, 2]);
  });

  it("handles empty queue gracefully", () => {
    expect(() => flushNext()).not.toThrow();
    expect(() => flushAll()).not.toThrow();
  });
});
