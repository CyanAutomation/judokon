if (typeof console !== "undefined") {
  console.log("[TEST DEBUG] commonMocks.js top-level loaded");
}
// [TEST DEBUG] top-level commonMocks.js

console.log("[TEST DEBUG] top-level commonMocks.js");
import { vi } from "vitest";

vi.mock("../../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

vi.mock("../../../src/utils/scheduler.js", () => ({
  onFrame: (cb) => {
    const id = globalThis.setTimeout(() => cb(performance.now()), 16);
    return id;
  },
  onSecondTick: (cb) => {
    const id = globalThis.setInterval(() => cb(performance.now()), 1000);
    return id;
  },
  cancel: vi.fn((id) => {
    try {
      globalThis.clearTimeout(id);
    } catch {}
    try {
      globalThis.clearInterval(id);
    } catch {}
  }),
  start: vi.fn(),
  stop: vi.fn()
}));
