import { describe, it, expect, afterEach, vi } from "vitest";
import {
  initClassicBattleTest,
  initClassicBattleTestWithRetry,
  isClassicBattleInitialized,
  getInitializationState,
  cleanupClassicBattleTest,
  beforeInit,
  afterInit
} from "./initClassicBattleTest.js";

describe("initClassicBattleTest - new features", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("validation", () => {
    it("throws TypeError for invalid options type", async () => {
      await expect(initClassicBattleTest(null)).rejects.toThrow(TypeError);
      await expect(initClassicBattleTest("invalid")).rejects.toThrow(TypeError);
      await expect(initClassicBattleTest(null)).rejects.toThrow("Options must be an object");
    });

    it("throws TypeError for invalid afterMock type", async () => {
      await expect(initClassicBattleTest({ afterMock: "true" })).rejects.toThrow(TypeError);
      await expect(initClassicBattleTest({ afterMock: "true" })).rejects.toThrow(
        "afterMock must be a boolean"
      );
    });

    it("throws TypeError for invalid force type", async () => {
      await expect(initClassicBattleTest({ force: "true" })).rejects.toThrow(TypeError);
      await expect(initClassicBattleTest({ force: "true" })).rejects.toThrow(
        "force must be a boolean"
      );
    });

    it("throws TypeError for invalid timeout", async () => {
      await expect(initClassicBattleTest({ timeout: "5000" })).rejects.toThrow(TypeError);
      await expect(initClassicBattleTest({ timeout: 0 })).rejects.toThrow(TypeError);
      await expect(initClassicBattleTest({ timeout: -100 })).rejects.toThrow(TypeError);
      await expect(initClassicBattleTest({ timeout: 0 })).rejects.toThrow(
        "timeout must be a positive number"
      );
    });

    it("throws TypeError for invalid debug type", async () => {
      await expect(initClassicBattleTest({ debug: "true" })).rejects.toThrow(TypeError);
      await expect(initClassicBattleTest({ debug: "true" })).rejects.toThrow(
        "debug must be a boolean"
      );
    });

    it("accepts valid options", async () => {
      await expect(
        initClassicBattleTest({
          afterMock: false,
          force: false,
          timeout: 3000,
          debug: false
        })
      ).resolves.toBeDefined();
    });

    it("accepts empty options object", async () => {
      await expect(initClassicBattleTest({})).resolves.toBeDefined();
    });

    it("accepts no arguments", async () => {
      await expect(initClassicBattleTest()).resolves.toBeDefined();
    });
  });

  describe("basic functionality", () => {
    it("returns battle module with bindings", async () => {
      const battle = await initClassicBattleTest();
      expect(battle).toBeDefined();
      expect(typeof battle).toBe("object");
    });

    it("supports afterMock option", async () => {
      const battle = await initClassicBattleTest({ afterMock: true });
      expect(battle).toBeDefined();
    });

    it("supports timeout option", async () => {
      const battle = await initClassicBattleTest({ timeout: 10000 });
      expect(battle).toBeDefined();
    });

    it("supports debug option", async () => {
      const battle = await initClassicBattleTest({ debug: false });
      expect(battle).toBeDefined();
    });
  });

  describe("isClassicBattleInitialized", () => {
    it("returns boolean", async () => {
      const result = await isClassicBattleInitialized();
      expect(typeof result).toBe("boolean");
    });

    it("returns true after initialization", async () => {
      await initClassicBattleTest();
      const result = await isClassicBattleInitialized();
      expect(result).toBe(true);
    });
  });

  describe("getInitializationState", () => {
    it("returns state object with required properties", async () => {
      const state = await getInitializationState();
      expect(state).toHaveProperty("initialized");
      expect(state).toHaveProperty("hasReset");
      expect(state).toHaveProperty("hasEnsure");
      expect(typeof state.initialized).toBe("boolean");
      expect(typeof state.hasReset).toBe("boolean");
      expect(typeof state.hasEnsure).toBe("boolean");
    });

    it("returns initialized true after init", async () => {
      await initClassicBattleTest();
      const state = await getInitializationState();
      expect(state.initialized).toBe(true);
    });
  });

  describe("cleanupClassicBattleTest", () => {
    it("does not throw when called", async () => {
      await expect(cleanupClassicBattleTest()).resolves.toBeUndefined();
    });

    it("can be called after initialization", async () => {
      await initClassicBattleTest();
      await expect(cleanupClassicBattleTest()).resolves.toBeUndefined();
    });

    it("can be called multiple times", async () => {
      await cleanupClassicBattleTest();
      await cleanupClassicBattleTest();
      await expect(cleanupClassicBattleTest()).resolves.toBeUndefined();
    });
  });

  describe("beforeInit hook", () => {
    it("returns unregister function", () => {
      const unregister = beforeInit(() => {});
      expect(typeof unregister).toBe("function");
      unregister();
    });

    it("calls hook before initialization", async () => {
      const hookSpy = vi.fn();
      const unregister = beforeInit(hookSpy);

      await initClassicBattleTest({ afterMock: false });

      expect(hookSpy).toHaveBeenCalled();
      expect(hookSpy).toHaveBeenCalledWith({ afterMock: false });
      unregister();
    });

    it("allows multiple hooks", async () => {
      const hook1 = vi.fn();
      const hook2 = vi.fn();
      const unregister1 = beforeInit(hook1);
      const unregister2 = beforeInit(hook2);

      await initClassicBattleTest();

      expect(hook1).toHaveBeenCalled();
      expect(hook2).toHaveBeenCalled();
      unregister1();
      unregister2();
    });

    it("unregister removes hook", async () => {
      const hookSpy = vi.fn();
      const unregister = beforeInit(hookSpy);
      unregister();

      await initClassicBattleTest();

      expect(hookSpy).not.toHaveBeenCalled();
    });
  });

  describe("afterInit hook", () => {
    it("returns unregister function", () => {
      const unregister = afterInit(() => {});
      expect(typeof unregister).toBe("function");
      unregister();
    });

    it("calls hook after initialization", async () => {
      const hookSpy = vi.fn();
      const unregister = afterInit(hookSpy);

      const battle = await initClassicBattleTest({ afterMock: false });

      expect(hookSpy).toHaveBeenCalled();
      expect(hookSpy).toHaveBeenCalledWith(battle, { afterMock: false });
      unregister();
    });

    it("allows multiple hooks", async () => {
      const hook1 = vi.fn();
      const hook2 = vi.fn();
      const unregister1 = afterInit(hook1);
      const unregister2 = afterInit(hook2);

      await initClassicBattleTest();

      expect(hook1).toHaveBeenCalled();
      expect(hook2).toHaveBeenCalled();
      unregister1();
      unregister2();
    });

    it("unregister removes hook", async () => {
      const hookSpy = vi.fn();
      const unregister = afterInit(hookSpy);
      unregister();

      await initClassicBattleTest();

      expect(hookSpy).not.toHaveBeenCalled();
    });
  });

  describe("initClassicBattleTestWithRetry", () => {
    it("succeeds on first attempt when working", async () => {
      const battle = await initClassicBattleTestWithRetry();
      expect(battle).toBeDefined();
    });

    it("accepts maxRetries option", async () => {
      const battle = await initClassicBattleTestWithRetry({ maxRetries: 5 });
      expect(battle).toBeDefined();
    });

    it("accepts retryDelay option", async () => {
      const battle = await initClassicBattleTestWithRetry({ retryDelay: 50 });
      expect(battle).toBeDefined();
    });

    it("passes through other options", async () => {
      const battle = await initClassicBattleTestWithRetry({
        afterMock: false,
        maxRetries: 2
      });
      expect(battle).toBeDefined();
    });
  });

  describe("timeout protection", () => {
    it("respects custom timeout", async () => {
      // This should succeed with a reasonable timeout
      const battle = await initClassicBattleTest({ timeout: 10000 });
      expect(battle).toBeDefined();
    });

    it("has default timeout of 5000ms", async () => {
      // Should succeed with default timeout
      const battle = await initClassicBattleTest();
      expect(battle).toBeDefined();
    });
  });

  describe("backward compatibility", () => {
    it("works with original usage pattern - no args", async () => {
      const battle = await initClassicBattleTest();
      expect(battle).toBeDefined();
    });

    it("works with original usage pattern - afterMock true", async () => {
      const battle = await initClassicBattleTest({ afterMock: true });
      expect(battle).toBeDefined();
    });

    it("works with original usage pattern - afterMock false", async () => {
      const battle = await initClassicBattleTest({ afterMock: false });
      expect(battle).toBeDefined();
    });

    it("returns module with expected structure", async () => {
      const battle = await initClassicBattleTest();
      expect(typeof battle).toBe("object");
      // Should have classic battle exports
      expect(battle).toBeDefined();
    });
  });
});
