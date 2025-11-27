import { describe, it, expect, vi, beforeEach } from "vitest";

// ===== Top-level vi.hoisted() for shared mock state =====
const {
  mockShowAutoSelect,
  mockUpdateTimer,
  mockClearTimer,
  mockUpdateRoundCounter,
  mockClearRoundCounter
} = vi.hoisted(() => ({
  mockShowAutoSelect: vi.fn(),
  mockUpdateTimer: vi.fn(),
  mockClearTimer: vi.fn(),
  mockUpdateRoundCounter: vi.fn(),
  mockClearRoundCounter: vi.fn()
}));

// ===== Top-level vi.mock() calls (Vitest static analysis phase) =====
vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  showAutoSelect: mockShowAutoSelect,
  updateTimer: mockUpdateTimer,
  clearTimer: mockClearTimer,
  updateRoundCounter: mockUpdateRoundCounter,
  clearRoundCounter: mockClearRoundCounter
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
