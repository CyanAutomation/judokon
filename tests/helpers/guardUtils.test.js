import { describe, it, expect, beforeEach } from "vitest";
import {
  manageHiddenProperty,
  setHiddenStoreValue,
  getHiddenStoreValue,
  enterGuard
} from "../../src/helpers/guardUtils.js";

describe("guardUtils", () => {
  describe("manageHiddenProperty", () => {
    let store;
    let token;

    beforeEach(() => {
      store = {};
      token = Symbol("test");
    });

    it("returns undefined for null store", () => {
      expect(manageHiddenProperty(null, token, "get")).toBeUndefined();
    });

    it("returns undefined for undefined store", () => {
      expect(manageHiddenProperty(undefined, token, "get")).toBeUndefined();
    });

    it("sets a property on a store", () => {
      manageHiddenProperty(store, token, "set", "test-value");
      expect(store[token]).toBe("test-value");
    });

    it("gets a property from a store", () => {
      store[token] = "test-value";
      expect(manageHiddenProperty(store, token, "get")).toBe("test-value");
    });

    it("creates non-enumerable property", () => {
      manageHiddenProperty(store, token, "set", "test-value");
      expect(Object.keys(store)).toHaveLength(0);
      expect(Object.getOwnPropertySymbols(store)).toContain(token);
    });

    it("updates existing property value", () => {
      manageHiddenProperty(store, token, "set", "value1");
      manageHiddenProperty(store, token, "set", "value2");
      expect(store[token]).toBe("value2");
    });
  });

  describe("setHiddenStoreValue", () => {
    it("sets a hidden value on a store", () => {
      const store = {};
      const token = Symbol("test");
      setHiddenStoreValue(store, token, "test-value");
      expect(store[token]).toBe("test-value");
    });

    it("handles null store gracefully", () => {
      expect(() => setHiddenStoreValue(null, Symbol("test"), "value")).not.toThrow();
    });
  });

  describe("getHiddenStoreValue", () => {
    it("gets a hidden value from a store", () => {
      const store = {};
      const token = Symbol("test");
      store[token] = "test-value";
      expect(getHiddenStoreValue(store, token)).toBe("test-value");
    });

    it("returns undefined for missing property", () => {
      const store = {};
      const token = Symbol("test");
      expect(getHiddenStoreValue(store, token)).toBeUndefined();
    });

    it("handles null store gracefully", () => {
      expect(getHiddenStoreValue(null, Symbol("test"))).toBeUndefined();
    });
  });

  describe("enterGuard", () => {
    let store;
    let token;

    beforeEach(() => {
      store = {};
      token = Symbol("guard");
    });

    it("allows guard entry when not held", () => {
      const guard = enterGuard(store, token);
      expect(guard.entered).toBe(true);
      expect(store[token]).toBe(true);
    });

    it("prevents duplicate guard entry", () => {
      const guard1 = enterGuard(store, token);
      expect(guard1.entered).toBe(true);

      const guard2 = enterGuard(store, token);
      expect(guard2.entered).toBe(false);
    });

    it("releases guard properly", () => {
      const guard = enterGuard(store, token);
      expect(guard.entered).toBe(true);
      expect(store[token]).toBe(true);

      guard.release();
      expect(store[token]).toBeUndefined();
    });

    it("allows re-entry after release", () => {
      const guard1 = enterGuard(store, token);
      guard1.release();

      const guard2 = enterGuard(store, token);
      expect(guard2.entered).toBe(true);
    });

    it("handles null store gracefully", () => {
      const guard = enterGuard(null, token);
      expect(guard.entered).toBe(true);
      expect(() => guard.release()).not.toThrow();
    });

    it("handles undefined store gracefully", () => {
      const guard = enterGuard(undefined, token);
      expect(guard.entered).toBe(true);
      expect(() => guard.release()).not.toThrow();
    });

    it("creates non-enumerable guard property", () => {
      enterGuard(store, token);
      expect(Object.keys(store)).toHaveLength(0);
      expect(Object.getOwnPropertySymbols(store)).toContain(token);
    });

    it("guard property is configurable and can be deleted", () => {
      const guard = enterGuard(store, token);
      const descriptor = Object.getOwnPropertyDescriptor(store, token);

      expect(descriptor.configurable).toBe(true);
      expect(descriptor.enumerable).toBe(false);
      expect(descriptor.writable).toBe(true);

      guard.release();
      expect(store[token]).toBeUndefined();
    });
  });
});
