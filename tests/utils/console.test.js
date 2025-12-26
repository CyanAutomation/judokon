import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  withMutedConsole,
  withAllowedConsole,
  muteConsole,
  restoreConsole,
  createMutedSpy
} from "./console.js";

describe("console utilities", () => {
  let originalMethods;

  beforeEach(() => {
    originalMethods = {
      log: console.log,
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };
  });

  afterEach(() => {
    Object.assign(console, originalMethods);
  });

  describe("withMutedConsole", () => {
    it("mutes console.error and console.warn by default", async () => {
      const errorSpy = vi.spyOn(console, "error");
      const warnSpy = vi.spyOn(console, "warn");

      await withMutedConsole(() => {
        console.error("should be muted");
        console.warn("should be muted");
      });

      expect(errorSpy).not.toHaveBeenCalled();
      expect(warnSpy).not.toHaveBeenCalled();

      errorSpy.mockRestore();
      warnSpy.mockRestore();
    });

    it("supports custom levels", async () => {
      const logSpy = vi.spyOn(console, "log");
      const infoSpy = vi.spyOn(console, "info");

      await withMutedConsole(() => {
        console.log("should be muted");
        console.info("should be muted");
      }, ["log", "info"]);

      expect(logSpy).not.toHaveBeenCalled();
      expect(infoSpy).not.toHaveBeenCalled();

      logSpy.mockRestore();
      infoSpy.mockRestore();
    });

    it("handles synchronous functions", async () => {
      let executed = false;
      const result = await withMutedConsole(() => {
        executed = true;
        console.error("muted");
        return 42;
      });

      expect(executed).toBe(true);
      expect(result).toBe(42);
    });

    it("handles async functions", async () => {
      let executed = false;
      const result = await withMutedConsole(async () => {
        executed = true;
        console.error("muted");
        await Promise.resolve();
        return "async result";
      });

      expect(executed).toBe(true);
      expect(result).toBe("async result");
    });

    it("restores console methods after execution", async () => {
      const originalError = console.error;

      await withMutedConsole(() => {
        console.error("muted");
      });

      expect(console.error).toBe(originalError);
    });

    it("throws TypeError for invalid levels", async () => {
      await expect(withMutedConsole(() => {}, ["invalid"])).rejects.toThrow(TypeError);
      await expect(withMutedConsole(() => {}, ["invalid"])).rejects.toThrow(
        "Invalid console levels: invalid"
      );
    });
  });

  describe("withAllowedConsole", () => {
    it("restores original console methods temporarily", async () => {
      let errorCalled = false;
      let warnCalled = false;

      console.error = () => {};
      console.warn = () => {};

      await withAllowedConsole(() => {
        const currentError = console.error;
        const currentWarn = console.warn;
        errorCalled = currentError === originalMethods.error;
        warnCalled = currentWarn === originalMethods.warn;
      });

      expect(errorCalled).toBe(true);
      expect(warnCalled).toBe(true);
    });

    it("handles synchronous functions", async () => {
      const result = await withAllowedConsole(() => {
        return 123;
      });

      expect(result).toBe(123);
    });

    it("handles async functions", async () => {
      const result = await withAllowedConsole(async () => {
        await Promise.resolve();
        return "allowed";
      });

      expect(result).toBe("allowed");
    });

    it("throws TypeError for invalid levels", async () => {
      await expect(withAllowedConsole(() => {}, ["badlevel"])).rejects.toThrow(TypeError);
    });
  });

  describe("muteConsole", () => {
    it("mutes specified console methods globally", () => {
      let errorOutput = null;
      let warnOutput = null;

      const originalError = console.error;
      const originalWarn = console.warn;

      console.error = (msg) => {
        errorOutput = msg;
      };
      console.warn = (msg) => {
        warnOutput = msg;
      };

      muteConsole(["error", "warn"]);

      console.error("should not show");
      console.warn("should not show");

      expect(errorOutput).toBeNull();
      expect(warnOutput).toBeNull();
      expect(console.error).not.toBe(originalError);
      expect(console.warn).not.toBe(originalWarn);
    });

    it("throws TypeError for invalid levels", () => {
      expect(() => muteConsole(["notreal"])).toThrow(TypeError);
    });
  });

  describe("restoreConsole", () => {
    it("restores console methods to originals", () => {
      const noop = () => {};
      console.error = noop;
      console.warn = noop;

      expect(console.error).toBe(noop);
      expect(console.warn).toBe(noop);

      restoreConsole(["error", "warn"]);

      expect(console.error).not.toBe(noop);
      expect(console.warn).not.toBe(noop);
      expect(typeof console.error).toBe("function");
      expect(typeof console.warn).toBe("function");
    });

    it("throws TypeError for invalid levels", () => {
      expect(() => restoreConsole(["fake"])).toThrow(TypeError);
    });
  });

  describe("createMutedSpy", () => {
    it("counts console calls while muting output", () => {
      const spy = createMutedSpy("error");

      console.error("call 1");
      console.error("call 2");
      console.error("call 3");

      expect(spy.getCalls()).toBe(3);

      spy.restore();
      expect(console.error).toBe(originalMethods.error);
    });

    it("works with different console levels", () => {
      const warnSpy = createMutedSpy("warn");
      const logSpy = createMutedSpy("log");

      console.warn("warning");
      console.log("log 1");
      console.log("log 2");

      expect(warnSpy.getCalls()).toBe(1);
      expect(logSpy.getCalls()).toBe(2);

      warnSpy.restore();
      logSpy.restore();
    });

    it("throws TypeError for invalid level", () => {
      expect(() => createMutedSpy("nope")).toThrow(TypeError);
    });
  });

  describe("performance optimization", () => {
    it("uses array for ≤3 levels", async () => {
      await withMutedConsole(() => {}, ["error", "warn", "log"]);
    });

    it("handles more than 3 levels", async () => {
      await withMutedConsole(() => {}, ["error", "warn", "log", "info", "debug"]);
    });
  });
});
