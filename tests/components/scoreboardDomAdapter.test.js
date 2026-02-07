import { describe, it, expect, vi } from "vitest";
import { ScoreboardModel } from "../../src/components/ScoreboardModel.js";
import { ScoreboardView } from "../../src/components/ScoreboardView.js";
import { createScoreboardDomAdapter } from "../../src/components/scoreboardDomAdapter.js";

describe("scoreboardDomAdapter", () => {
  it("renders scores and unsubscribes listeners on dispose", () => {
    const container = document.createElement("header");
    const scoreEl = document.createElement("p");
    scoreEl.id = "score-display";
    container.appendChild(scoreEl);

    const model = new ScoreboardModel();
    const view = new ScoreboardView(model, { scoreEl });
    const destroySpy = vi.spyOn(view, "destroy");

    const target = new EventTarget();
    const adapter = createScoreboardDomAdapter({ model, view, eventTarget: target });

    const unsubscribe = adapter.subscribe({
      "score.update": ({ player, opponent }) => adapter.render({ score: { player, opponent } })
    });

    target.dispatchEvent(new CustomEvent("score.update", { detail: { player: 5, opponent: 1 } }));

    expect(model.getState()).toEqual({ score: { player: 5, opponent: 1 } });

    unsubscribe();
    target.dispatchEvent(new CustomEvent("score.update", { detail: { player: 9, opponent: 9 } }));

    expect(model.getState()).toEqual({ score: { player: 5, opponent: 1 } });

    adapter.dispose();
    expect(destroySpy).toHaveBeenCalledTimes(1);
  });
});
