import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

const mockIsEnabled = vi.fn();
const mockUpdateBattleStateBadge = vi.fn();
const mockMarkBattlePartReady = vi.fn();
const mockOnBattleEvent = vi.fn();
const mockOffBattleEvent = vi.fn();

vi.mock("../../src/helpers/featureFlags.js", () => ({
  isEnabled: mockIsEnabled
}));

vi.mock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
  updateBattleStateBadge: mockUpdateBattleStateBadge
}));

vi.mock("../../src/helpers/battleInit.js", () => ({
  markBattlePartReady: mockMarkBattlePartReady
}));

vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  onBattleEvent: mockOnBattleEvent,
  offBattleEvent: mockOffBattleEvent
}));

describe("battleStateProgress instrumentation", () => {
  /** @type {{event: string, handler: (e: any) => void}[]} */
  let listeners = [];

  beforeEach(() => {
    vi.resetModules();
    mockIsEnabled.mockReset();
    mockUpdateBattleStateBadge.mockReset();
    mockMarkBattlePartReady.mockReset();
    listeners = [];
    mockOnBattleEvent.mockReset();
    mockOffBattleEvent.mockReset();
    mockOnBattleEvent.mockImplementation((event, handler) => {
      listeners.push({ event, handler });
    });
    mockOffBattleEvent.mockImplementation((event, handler) => {
      listeners = listeners.filter(
        (listener) => listener.event !== event || listener.handler !== handler
      );
    });
    document.body.innerHTML = "";
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("marks the list and items with QA data attributes", async () => {
    mockIsEnabled.mockReturnValue(true);
    document.body.innerHTML = `<ul id="battle-state-progress"></ul>`;
    const { renderStateList } = await import("../../src/helpers/battleStateProgress.js");
    const list = renderStateList([
      { id: 10, name: "cooldown" },
      { id: 20, name: "roundStart" }
    ]);
    expect(list?.dataset.featureBattleStateReady).toBe("true");
    expect(list?.dataset.featureBattleStateCount).toBe("2");
    const items = list ? Array.from(list.querySelectorAll("li")) : [];
    expect(items.length).toBe(2);
    expect(items.every((li) => li.dataset.featureBattleStateProgressItem === "true")).toBe(true);
  });

  it("exposes active state metadata when updates occur", async () => {
    mockIsEnabled.mockReturnValue(true);
    document.body.innerHTML = `<ul id="battle-state-progress">
      <li data-state="cooldown">10</li>
      <li data-state="roundStart">20</li>
    </ul>`;
    const { updateActiveState } = await import("../../src/helpers/battleStateProgress.js");
    const list = document.getElementById("battle-state-progress");
    if (!list) throw new Error("List missing");
    updateActiveState(list, "roundStart");
    expect(list.getAttribute("data-feature-battle-state-active")).toBe("roundStart");
    expect(list.getAttribute("data-feature-battle-state-active-original")).toBe("roundStart");
    const items = Array.from(list.querySelectorAll("li"));
    expect(items[1].getAttribute("data-feature-battle-state-active")).toBe("true");
    expect(items[0].hasAttribute("data-feature-battle-state-active")).toBe(false);
    expect(mockUpdateBattleStateBadge).toHaveBeenCalledWith("roundStart");
  });

  it("clears QA markers when the feature flag is disabled", async () => {
    mockIsEnabled.mockReturnValue(false);
    document.body.innerHTML = `<ul id="battle-state-progress" data-feature-battle-state-active="cooldown">
      <li data-feature-battle-state-progress-item="true">10</li>
    </ul>`;
    const mod = await import("../../src/helpers/battleStateProgress.js");
    const list = document.getElementById("battle-state-progress");
    expect(list?.dataset.featureBattleStateReady).toBe("false");
    expect(list?.hasAttribute("data-feature-battle-state-active")).toBe(false);
    await mod.initBattleStateProgress(); // ensure callable even when disabled
  });

  it("marks readiness after the first battleStateChange event", async () => {
    mockIsEnabled.mockReturnValue(true);
    document.body.innerHTML = `<ul id="battle-state-progress"></ul>`;
    document.body.dataset.battleState = "cooldown";
    const { initBattleStateProgress } = await import("../../src/helpers/battleStateProgress.js");
    const cleanup = await initBattleStateProgress();
    const list = document.getElementById("battle-state-progress");
    expect(list?.dataset.featureBattleStateReady).toBe("true");
    expect(list?.getAttribute("data-feature-battle-state-active")).toBe("cooldown");
    expect(mockMarkBattlePartReady).toHaveBeenCalledWith("state");
    if (cleanup) cleanup();
  });
});
