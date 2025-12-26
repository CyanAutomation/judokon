import { describe, it, expect, vi } from "vitest";
import {
  isValidTestApi,
  setupOpponentDelayControl,
  createOpponentDelayController
} from "./battleTestUtils.js";

describe("battleTestUtils", () => {
  describe("isValidTestApi", () => {
    it("returns true for valid testApi", () => {
      const testApi = {
        timers: {
          setOpponentResolveDelay: vi.fn()
        }
      };
      expect(isValidTestApi(testApi)).toBe(true);
    });

    it("returns false for null or undefined", () => {
      expect(isValidTestApi(null)).toBe(false);
      expect(isValidTestApi(undefined)).toBe(false);
    });

    it("returns false for non-object", () => {
      expect(isValidTestApi("string")).toBe(false);
      expect(isValidTestApi(123)).toBe(false);
      expect(isValidTestApi(true)).toBe(false);
    });

    it("returns false when timers is missing", () => {
      expect(isValidTestApi({})).toBe(false);
      expect(isValidTestApi({ other: {} })).toBe(false);
    });

    it("returns false when timers is not an object", () => {
      expect(isValidTestApi({ timers: "string" })).toBe(false);
      expect(isValidTestApi({ timers: 123 })).toBe(false);
      expect(isValidTestApi({ timers: null })).toBe(false);
    });
  });

  describe("setupOpponentDelayControl", () => {
    it("throws TypeError for invalid testApi", () => {
      expect(() => setupOpponentDelayControl(null)).toThrow(TypeError);
      expect(() => setupOpponentDelayControl(undefined)).toThrow(TypeError);
      expect(() => setupOpponentDelayControl("invalid")).toThrow(TypeError);
      expect(() => setupOpponentDelayControl(null)).toThrow(
        "setupOpponentDelayControl requires a valid testApi object"
      );
    });

    it("returns control object with all methods", () => {
      const testApi = {
        timers: {
          setOpponentResolveDelay: vi.fn()
        }
      };

      const control = setupOpponentDelayControl(testApi);

      expect(control).toHaveProperty("setOpponentDelayToZero");
      expect(control).toHaveProperty("resetOpponentDelay");
      expect(control).toHaveProperty("setCustomDelay");
      expect(control).toHaveProperty("getCurrentDelay");
      expect(control).toHaveProperty("isDelayControlAvailable");
      expect(typeof control.setOpponentDelayToZero).toBe("function");
      expect(typeof control.resetOpponentDelay).toBe("function");
      expect(typeof control.setCustomDelay).toBe("function");
      expect(typeof control.getCurrentDelay).toBe("function");
      expect(typeof control.isDelayControlAvailable).toBe("function");
    });

    it("reports delay control available when function exists", () => {
      const testApi = {
        timers: {
          setOpponentResolveDelay: vi.fn()
        }
      };

      const control = setupOpponentDelayControl(testApi);
      expect(control.isDelayControlAvailable()).toBe(true);
    });

    it("reports delay control unavailable when function missing", () => {
      const testApi = { timers: {} };
      const control = setupOpponentDelayControl(testApi);
      expect(control.isDelayControlAvailable()).toBe(false);
    });

    it("calls setOpponentResolveDelay with 0 when setting to zero", () => {
      const setDelayMock = vi.fn();
      const testApi = {
        timers: {
          setOpponentResolveDelay: setDelayMock
        }
      };

      const control = setupOpponentDelayControl(testApi);
      control.setOpponentDelayToZero();

      expect(setDelayMock).toHaveBeenCalledWith(0);
      expect(setDelayMock).toHaveBeenCalledTimes(1);
    });

    it("calls setOpponentResolveDelay with null when resetting", () => {
      const setDelayMock = vi.fn();
      const testApi = {
        timers: {
          setOpponentResolveDelay: setDelayMock
        }
      };

      const control = setupOpponentDelayControl(testApi);
      control.resetOpponentDelay();

      expect(setDelayMock).toHaveBeenCalledWith(null);
      expect(setDelayMock).toHaveBeenCalledTimes(1);
    });

    it("supports custom delay values", () => {
      const setDelayMock = vi.fn();
      const testApi = {
        timers: {
          setOpponentResolveDelay: setDelayMock
        }
      };

      const control = setupOpponentDelayControl(testApi);
      control.setCustomDelay(500);

      expect(setDelayMock).toHaveBeenCalledWith(500);
      expect(control.getCurrentDelay()).toBe(500);
    });

    it("throws TypeError for invalid custom delay", () => {
      const testApi = {
        timers: {
          setOpponentResolveDelay: vi.fn()
        }
      };

      const control = setupOpponentDelayControl(testApi);

      expect(() => control.setCustomDelay("invalid")).toThrow(TypeError);
      expect(() => control.setCustomDelay(-1)).toThrow(TypeError);
      expect(() => control.setCustomDelay(null)).toThrow(TypeError);
      expect(() => control.setCustomDelay(-1)).toThrow("Delay must be a non-negative number");
    });

    it("tracks current delay state", () => {
      const testApi = {
        timers: {
          setOpponentResolveDelay: vi.fn()
        }
      };

      const control = setupOpponentDelayControl(testApi);
      expect(control.getCurrentDelay()).toBe(null);

      control.setOpponentDelayToZero();
      expect(control.getCurrentDelay()).toBe(0);

      control.setCustomDelay(250);
      expect(control.getCurrentDelay()).toBe(250);

      control.resetOpponentDelay();
      expect(control.getCurrentDelay()).toBe(null);
    });

    it("supports method chaining", () => {
      const testApi = {
        timers: {
          setOpponentResolveDelay: vi.fn()
        }
      };

      const control = setupOpponentDelayControl(testApi);
      const result = control.setOpponentDelayToZero().setCustomDelay(100).resetOpponentDelay();

      expect(result).toBe(control);
      expect(control.getCurrentDelay()).toBe(null);
    });

    it("handles missing delay control gracefully", () => {
      const testApi = { timers: {} };
      const control = setupOpponentDelayControl(testApi);

      expect(() => control.setOpponentDelayToZero()).not.toThrow();
      expect(() => control.resetOpponentDelay()).not.toThrow();
      expect(() => control.setCustomDelay(100)).not.toThrow();
      expect(control.getCurrentDelay()).toBe(null);
    });

    it("maintains backward compatibility with destructuring", () => {
      const setDelayMock = vi.fn();
      const testApi = {
        timers: {
          setOpponentResolveDelay: setDelayMock
        }
      };

      const { setOpponentDelayToZero, resetOpponentDelay } = setupOpponentDelayControl(testApi);

      setOpponentDelayToZero();
      expect(setDelayMock).toHaveBeenCalledWith(0);

      resetOpponentDelay();
      expect(setDelayMock).toHaveBeenCalledWith(null);
    });
  });

  describe("createOpponentDelayController", () => {
    it("returns controller with control and cleanup", () => {
      const testApi = {
        timers: {
          setOpponentResolveDelay: vi.fn()
        }
      };

      const controller = createOpponentDelayController(testApi);

      expect(controller).toHaveProperty("control");
      expect(controller).toHaveProperty("cleanup");
      expect(typeof controller.cleanup).toBe("function");
    });

    it("cleanup restores original delay when set", () => {
      const setDelayMock = vi.fn();
      const testApi = {
        timers: {
          setOpponentResolveDelay: setDelayMock
        }
      };

      const { control, cleanup } = createOpponentDelayController(testApi);

      control.setCustomDelay(100);
      expect(control.getCurrentDelay()).toBe(100);

      control.setOpponentDelayToZero();
      expect(control.getCurrentDelay()).toBe(0);

      cleanup();
      expect(setDelayMock).toHaveBeenLastCalledWith(null);
    });

    it("cleanup resets to null when no original delay", () => {
      const setDelayMock = vi.fn();
      const testApi = {
        timers: {
          setOpponentResolveDelay: setDelayMock
        }
      };

      const { control, cleanup } = createOpponentDelayController(testApi);

      control.setOpponentDelayToZero();
      expect(control.getCurrentDelay()).toBe(0);

      cleanup();
      expect(setDelayMock).toHaveBeenLastCalledWith(null);
    });

    it("supports try/finally pattern", () => {
      const setDelayMock = vi.fn();
      const testApi = {
        timers: {
          setOpponentResolveDelay: setDelayMock
        }
      };

      const { control, cleanup } = createOpponentDelayController(testApi);

      try {
        control.setOpponentDelayToZero();
        expect(control.getCurrentDelay()).toBe(0);
      } finally {
        cleanup();
      }

      expect(setDelayMock).toHaveBeenCalledTimes(2);
      expect(setDelayMock).toHaveBeenLastCalledWith(null);
    });
  });
});
