// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { BattleEngine } from "../../../src/helpers/BattleEngine.js";

describe("BattleEngine events", () => {
  it("emits roundStarted and timerTick", async () => {
    const engine = new BattleEngine();
    engine.timer.startRound = vi.fn(async (onTick) => {
      onTick(3);
    });
    const started = vi.fn();
    const tick = vi.fn();
    engine.on("roundStarted", started);
    engine.on("timerTick", tick);
    await engine.startRound();
    expect(started).toHaveBeenCalledWith({ round: 1 });
    expect(tick).toHaveBeenCalledWith({ remaining: 3, phase: "round" });
  });

  it("emits roundEnded and matchEnded", () => {
    const engine = new BattleEngine({ pointsToWin: 1 });
    const roundEnd = vi.fn();
    const matchEnd = vi.fn();
    engine.on("roundEnded", roundEnd);
    engine.on("matchEnded", matchEnd);
    const result = engine.handleStatSelection(10, 5);
    expect(roundEnd).toHaveBeenCalledWith(result);
    expect(matchEnd).toHaveBeenCalledWith(result);
  });

  it("emits error", () => {
    const engine = new BattleEngine();
    const err = vi.fn();
    engine.on("error", err);
    engine.handleError("fail");
    expect(err).toHaveBeenCalledWith({ message: "fail" });
  });

  it("emits events in order for normal play", async () => {
    const engine = new BattleEngine({ pointsToWin: 1 });
    engine.timer.startRound = vi.fn(async (onTick) => {
      onTick(5);
    });
    const events = [];
    engine.on("roundStarted", () => events.push("roundStarted"));
    engine.on("timerTick", ({ phase }) => events.push(`timerTick-${phase}`));
    engine.on("roundEnded", () => events.push("roundEnded"));
    engine.on("matchEnded", () => events.push("matchEnded"));
    await engine.startRound();
    engine.handleStatSelection(10, 5);
    expect(events).toEqual(["roundStarted", "timerTick-round", "roundEnded", "matchEnded"]);
  });

  it("emits matchEnded without roundEnded on interrupt", async () => {
    const engine = new BattleEngine();
    engine.timer.startRound = vi.fn(async (onTick) => {
      onTick(4);
    });
    const events = [];
    engine.on("roundStarted", () => events.push("roundStarted"));
    engine.on("timerTick", ({ phase }) => events.push(`timerTick-${phase}`));
    engine.on("roundEnded", () => events.push("roundEnded"));
    engine.on("matchEnded", () => events.push("matchEnded"));
    await engine.startRound();
    engine.interruptMatch("injury");
    expect(events).toEqual(["roundStarted", "timerTick-round", "matchEnded"]);
  });
});
