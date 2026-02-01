import { isConsoleMocked, shouldShowTestLogs } from "../../../src/helpers/testLogGate.js";
import { vi } from "vitest";

const debugLog = (...args) => {
  if (typeof console === "undefined") return;
  if (shouldShowTestLogs() || isConsoleMocked(console.log)) {
    console.log(...args);
  }
};

debugLog("[TEST DEBUG] commonMocks.js top-level loaded");

vi.mock("../../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));

vi.mock("../../../src/utils/scheduler.js", () => {
  // Use late-binding via getters to ensure fake timers can intercept
  const getMockScheduler = () => ({
    onFrame: (cb) => {
      // Call setInterval through global lookup each time
      const id = (globalThis).setTimeout(() => cb(performance.now()), 16);
      return id;
    },
    onSecondTick: (cb) => {
      // Call setInterval through global lookup each time
      const id = (globalThis).setInterval(() => cb(performance.now()), 1000);
      return id;
    },
    cancel: vi.fn((id) => {
      try {
        (globalThis).clearTimeout(id);
      } catch {}
      try {
        (globalThis).clearInterval(id);
      } catch {}
    }),
    start: vi.fn(),
    stop: vi.fn(),
    pause: vi.fn(),
    resume: vi.fn()
  });
  
  return new Proxy({}, {
    get(target, prop) {
      return getMockScheduler()[prop];
    }
  });
});

vi.mock("node:url", () => ({
  fileURLToPath: (url) => {
    // Mock implementation: strip "file://" prefix and handle query params
    try {
      return new URL(url).pathname;
    } catch {
      return String(url).replace("file://", "");
    }
  },
  pathToFileURL: (path) => {
    return `file://${path}`;
  }
}));
