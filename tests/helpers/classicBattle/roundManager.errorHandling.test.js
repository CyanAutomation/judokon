import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { exposeDebugState, readDebugState } from "../../../src/helpers/classicBattle/debugHooks.js";

async function withErrorHandlingEnv(nodeEnv, callback) {
  const original = process.env.NODE_ENV;
  if (typeof nodeEnv === "string") {
    process.env.NODE_ENV = nodeEnv;
  } else if (original === undefined) {
    delete process.env.NODE_ENV;
  }
  try {
    vi.resetModules();
    const module = await import("../../../src/helpers/classicBattle/utils/errorHandling.js");
    return await callback(module);
  } finally {
    vi.resetModules();
    if (original === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = original;
    }
  }
}

describe("roundManager error handling integration", () => {
  beforeEach(() => {
    exposeDebugState("classicBattleErrors", []);
    if (typeof globalThis !== "undefined") {
      globalThis.__CLASSIC_BATTLE_ERROR_LOG = [];
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("captures event bus failures via the shared handler", async () => {
    const module = await import("../../../src/helpers/classicBattle/roundManager.js");
    const store = module.createBattleStore();
    const scheduler = { setTimeout: vi.fn(), clearTimeout: vi.fn() };
    const eventBus = {
      emit: vi.fn(() => {
        throw new Error("bus exploded");
      }),
      on: vi.fn(),
      off: vi.fn()
    };

    module.startCooldown(store, scheduler, { eventBus });

    const entries = readDebugState("classicBattleErrors") || [];
    expect(entries.length).toBeGreaterThan(0);
    const matching = entries.find((entry) => entry.message.includes("bus exploded"));
    expect(matching).toBeDefined();
    expect(matching.scope).toBe("classicBattle.roundManager");
  });

  it("allows production suppression to skip logging when requested", async () => {
    await withErrorHandlingEnv("production", async ({ safeInvoke }) => {
      exposeDebugState("classicBattleErrors", []);

      const result = await safeInvoke(
        () => {
          throw new Error("silent fail");
        },
        {
          context: { scope: "test", operation: "suppressed" },
          suppressInProduction: true,
          fallback: () => "ok"
        }
      );

      expect(result).toBe("ok");
      const entries = readDebugState("classicBattleErrors") || [];
      expect(entries).toHaveLength(0);
    });
  });

  it("rethrows fallback failures when requested", async () => {
    const { safeInvoke } = await import(
      "../../../src/helpers/classicBattle/utils/errorHandling.js"
    );

    expect(() =>
      safeInvoke(
        () => {
          throw new Error("primary failure");
        },
        {
          context: { scope: "test", operation: "fallbackFailure" },
          fallback: () => {
            throw new Error("fallback explosion");
          },
          rethrow: true
        }
      )
    ).toThrow("fallback explosion");

    const entries = readDebugState("classicBattleErrors") || [];
    const operations = entries.map((entry) => entry.operation);
    expect(operations).toContain("fallbackFailure");
    expect(operations).toContain("fallbackFailure:fallback");
  });

  it("handles async rejections and resolves fallbacks", async () => {
    const { safeInvoke } = await import(
      "../../../src/helpers/classicBattle/utils/errorHandling.js"
    );

    const result = await safeInvoke(
      async () => {
        throw new Error("async failure");
      },
      {
        context: { scope: "test", operation: "asyncRecovery" },
        fallback: () => "recovered"
      }
    );

    expect(result).toBe("recovered");
    const entries = readDebugState("classicBattleErrors") || [];
    expect(entries.some((entry) => entry.operation === "asyncRecovery")).toBe(true);
  });

  it("enforces the debug history limit", async () => {
    const { logError } = await import("../../../src/helpers/classicBattle/utils/errorHandling.js");

    for (let index = 0; index < 40; index += 1) {
      logError(new Error(`limit-${index}`), {
        scope: "test",
        operation: `limit-${index}`
      });
    }

    const entries = readDebugState("classicBattleErrors") || [];
    expect(entries.length).toBe(25);
    expect(entries.at(0)?.operation).toBe("limit-15");
    expect(entries.at(-1)?.operation).toBe("limit-39");

    if (typeof globalThis !== "undefined") {
      const bag = globalThis.__CLASSIC_BATTLE_ERROR_LOG;
      expect(Array.isArray(bag)).toBe(true);
      expect(bag.length).toBe(entries.length);
      expect(bag.at(0)?.operation).toBe("limit-15");
      expect(bag.at(-1)?.operation).toBe("limit-39");
    }
  });
});
