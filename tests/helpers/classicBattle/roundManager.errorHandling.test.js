import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

import { exposeDebugState, readDebugState } from "../../../src/helpers/classicBattle/debugHooks.js";

describe("roundManager error handling integration", () => {
  beforeEach(() => {
    exposeDebugState("classicBattleErrors", []);
    if (typeof globalThis !== "undefined") {
      globalThis.__CLASSIC_BATTLE_ERROR_LOG = [];
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    vi.resetModules();
    const { safeInvoke } = await import(
      "../../../src/helpers/classicBattle/utils/errorHandling.js"
    );

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

    process.env.NODE_ENV = originalEnv;
    vi.resetModules();
    await import("../../../src/helpers/classicBattle/utils/errorHandling.js");
  });
});
