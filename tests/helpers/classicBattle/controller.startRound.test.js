import { describe, it, expect, vi, beforeEach } from "vitest";

describe("ClassicBattleController.startRound", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("emits roundStarted and opponentCardReady", async () => {
    const startRound = vi.fn().mockResolvedValue();
    vi.doMock("../../../src/helpers/classicBattle/roundManager.js", () => ({
      createBattleStore: () => ({}),
      startRound
    }));
    const waitForOpponentCard = vi.fn().mockResolvedValue();
    const { ClassicBattleController } = await import(
      "../../../src/helpers/classicBattle/controller.js"
    );
    const controller = new ClassicBattleController({ waitForOpponentCard });
    const events = [];
    controller.addEventListener("roundStarted", () => events.push("roundStarted"));
    controller.addEventListener("opponentCardReady", () => events.push("opponentCardReady"));
    await controller.startRound();
    expect(events).toEqual(["roundStarted", "opponentCardReady"]);
    expect(startRound).toHaveBeenCalled();
    expect(waitForOpponentCard).toHaveBeenCalled();
  });

  it("emits roundStartError when startRound fails", async () => {
    const startRound = vi.fn().mockRejectedValue(new Error("fail"));
    vi.doMock("../../../src/helpers/classicBattle/roundManager.js", () => ({
      createBattleStore: () => ({}),
      startRound
    }));
    const { ClassicBattleController } = await import(
      "../../../src/helpers/classicBattle/controller.js"
    );
    const controller = new ClassicBattleController();
    const errorSpy = vi.fn();
    const opponentSpy = vi.fn();
    controller.addEventListener("roundStartError", errorSpy);
    controller.addEventListener("opponentCardReady", opponentSpy);
    await expect(controller.startRound()).rejects.toThrow("fail");
    expect(errorSpy).toHaveBeenCalled();
    expect(opponentSpy).not.toHaveBeenCalled();
  });

  it("emits roundStartError when opponent card wait fails", async () => {
    const startRound = vi.fn().mockResolvedValue();
    vi.doMock("../../../src/helpers/classicBattle/roundManager.js", () => ({
      createBattleStore: () => ({}),
      startRound
    }));
    const waitForOpponentCard = vi.fn().mockRejectedValue(new Error("no card"));
    const { ClassicBattleController } = await import(
      "../../../src/helpers/classicBattle/controller.js"
    );
    const controller = new ClassicBattleController({ waitForOpponentCard });
    const events = { roundStarted: 0, opponentCardReady: 0, error: 0 };
    controller.addEventListener("roundStarted", () => events.roundStarted++);
    controller.addEventListener("opponentCardReady", () => events.opponentCardReady++);
    controller.addEventListener("roundStartError", () => events.error++);
    await expect(controller.startRound()).rejects.toThrow("no card");
    expect(events.roundStarted).toBe(1);
    expect(events.opponentCardReady).toBe(0);
    expect(events.error).toBe(1);
  });
});
