import { describe, it, expect, vi } from "vitest";
import { createScoreboardCore } from "../../src/components/scoreboardCore.js";

describe("scoreboardCore", () => {
  it("updates state and renders only on score changes", () => {
    const render = vi.fn();
    const core = createScoreboardCore({
      subscribe: () => () => {},
      render,
      dispose: () => {}
    });

    core.updateScore(1, 2);
    core.updateScore(1, 2);

    expect(core.getState()).toEqual({ score: { player: 1, opponent: 2 } });
    expect(render).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith({ score: { player: 1, opponent: 2 } });
  });

  it("subscribes to events and cleans up on dispose", () => {
    const render = vi.fn();
    const unsub = vi.fn();
    const dispose = vi.fn();
    const subscribe = vi.fn((events) => {
      events["score.update"]({ player: 3, opponent: 4 });
      return unsub;
    });

    const core = createScoreboardCore({ subscribe, render, dispose });
    core.start();

    expect(core.getState()).toEqual({ score: { player: 3, opponent: 4 } });
    expect(subscribe).toHaveBeenCalledTimes(1);

    core.dispose();

    expect(unsub).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledTimes(1);
  });
});
