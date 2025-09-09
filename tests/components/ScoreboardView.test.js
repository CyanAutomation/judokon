import { describe, it, expect } from "vitest";
import { ScoreboardModel } from "../../src/components/ScoreboardModel.js";
import { ScoreboardView } from "../../src/components/ScoreboardView.js";

describe("ScoreboardView", () => {
  it("renders messages and timer", () => {
    const model = new ScoreboardModel();
    const messageEl = document.createElement("p");
    const timerEl = document.createElement("p");
    const view = new ScoreboardView(model, { messageEl, timerEl });
    view.showMessage("Hello");
    expect(messageEl.textContent).toBe("Hello");
    view.updateTimer(7);
    expect(timerEl.textContent).toBe("Time Left: 7s");
  });
});
