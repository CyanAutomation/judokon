import { describe, it, expect, vi, beforeEach } from "vitest";

vi.doMock("../../src/helpers/setupScoreboard.js", () => ({
  showAutoSelect: vi.fn(),
  updateTimer: vi.fn(),
  clearTimer: vi.fn()
}));

describe("autoSelectStat basic path", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <div id="stat-buttons">
        <button data-stat="power">Power</button>
        <button data-stat="speed">Speed</button>
        <button data-stat="technique">Technique</button>
        <button data-stat="kumikata">Kumi-kata</button>
        <button data-stat="newaza">Ne-waza</button>
      </div>`;
  });

  it("announces auto-select and invokes onSelect", async () => {
    const { autoSelectStat } = await import("../../src/helpers/classicBattle/autoSelectStat.js");
    const { setTestMode } = await import("../../src/helpers/testModeUtils.js");
    const scoreboard = await import("../../src/helpers/setupScoreboard.js");
    setTestMode(true, 1); // deterministic
    const onSelect = vi.fn();
    await autoSelectStat(onSelect, 0);
    expect(scoreboard.showAutoSelect).toHaveBeenCalledOnce();
    expect(onSelect).toHaveBeenCalledOnce();
    const [stat, opts] = onSelect.mock.calls[0];
    expect(typeof stat).toBe("string");
    expect(opts?.delayOpponentMessage).toBe(true);
  });
});
