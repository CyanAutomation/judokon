import { describe, it, expect, beforeEach, vi } from "vitest";
import { showRoundOutcome } from "../../src/helpers/classicBattle/uiHelpers.js";

vi.mock("../../src/helpers/battle/battleUI.js", () => ({
  showResult: vi.fn()
}));

vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  showMessage: vi.fn()
}));

import { showResult } from "../../src/helpers/battle/battleUI.js";
import { showMessage } from "../../src/helpers/setupScoreboard.js";

describe("showRoundOutcome", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("shows outcome message without stat comparison when no stat data provided", () => {
    showRoundOutcome("You win the round!");

    expect(showResult).toHaveBeenCalledWith("You win the round!");
    expect(showMessage).toHaveBeenCalledWith("You win the round!", { outcome: true });
  });

  it("shows consolidated message with stat comparison when stat data provided", () => {
    showRoundOutcome("You win the round!", "power", 8, 6);

    const expectedMessage =
      "You picked: Power (8) — Opponent picked: Power (6) — You win the round!";
    expect(showResult).toHaveBeenCalledWith(expectedMessage);
    expect(showMessage).toHaveBeenCalledWith(expectedMessage, { outcome: true });
  });

  it("handles different stat names with proper capitalization", () => {
    showRoundOutcome("You win the round!", "speed", 7, 5);

    const expectedMessage =
      "You picked: Speed (7) — Opponent picked: Speed (5) — You win the round!";
    expect(showResult).toHaveBeenCalledWith(expectedMessage);
  });

  it("ignores stat data when stat is falsy", () => {
    showRoundOutcome("You win the round!", "", 8, 6);

    expect(showResult).toHaveBeenCalledWith("You win the round!");
  });

  it("ignores stat data when playerVal is not a number", () => {
    showRoundOutcome("You win the round!", "power", "8", 6);

    expect(showResult).toHaveBeenCalledWith("You win the round!");
  });

  it("ignores stat data when opponentVal is not a number", () => {
    showRoundOutcome("You win the round!", "power", 8, "6");

    expect(showResult).toHaveBeenCalledWith("You win the round!");
  });
});
