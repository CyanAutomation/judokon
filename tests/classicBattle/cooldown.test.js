import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../setup/fakeTimers.js";
import { createSimpleHarness } from "../helpers/integrationHarness.js";

// ===== Top-level vi.hoisted() for shared mock state =====
const {
  mockClearTimer,
  mockShowMessage,
  mockShowAutoSelect,
  mockShowTemporaryMessage,
  mockUpdateTimer,
  mockUpdateDebugPanel,
  mockDispatchBattleEvent,
  mockResetDispatchHistory,
  mockOnBattleEvent,
  mockOffBattleEvent,
  mockEmitBattleEvent,
  mockAttachCooldownRenderer,
  mockComputeNextRoundCooldown
} = vi.hoisted(() => ({
  mockClearTimer: vi.fn(),
  mockShowMessage: vi.fn(),
  mockShowAutoSelect: vi.fn(),
  mockShowTemporaryMessage: vi.fn(() => () => {}),
  mockUpdateTimer: vi.fn(),
  mockUpdateDebugPanel: vi.fn(),
  mockDispatchBattleEvent: vi.fn(),
  mockResetDispatchHistory: vi.fn(),
  mockOnBattleEvent: vi.fn(),
  mockOffBattleEvent: vi.fn(),
  mockEmitBattleEvent: vi.fn(),
  mockAttachCooldownRenderer: vi.fn(),
  mockComputeNextRoundCooldown: vi.fn()
}));

// ===== Top-level vi.mock() calls (Vitest static analysis phase) =====
vi.mock("../../src/helpers/setupScoreboard.js", () => ({
  clearTimer: mockClearTimer,
  showMessage: mockShowMessage,
  showAutoSelect: mockShowAutoSelect,
  showTemporaryMessage: mockShowTemporaryMessage,
  updateTimer: mockUpdateTimer
}));

vi.mock("../../src/helpers/classicBattle/debugPanel.js", () => ({
  updateDebugPanel: mockUpdateDebugPanel
}));

vi.mock("../../src/helpers/classicBattle/eventDispatcher.js", () => ({
  dispatchBattleEvent: mockDispatchBattleEvent,
  resetDispatchHistory: mockResetDispatchHistory
}));

vi.mock("../../src/helpers/classicBattle/battleEvents.js", () => ({
  onBattleEvent: mockOnBattleEvent,
  offBattleEvent: mockOffBattleEvent,
  emitBattleEvent: mockEmitBattleEvent
}));

vi.mock("../../src/helpers/CooldownRenderer.js", () => ({
  attachCooldownRenderer: mockAttachCooldownRenderer
}));

vi.mock("../../src/helpers/timers/computeNextRoundCooldown.js", () => ({
  computeNextRoundCooldown: mockComputeNextRoundCooldown
}));

describe("Classic Battle inter-round cooldown + Next", () => {
  let harness;

  beforeEach(async () => {
    // Reset all mocks before each test
    mockClearTimer.mockReset();
    mockShowMessage.mockReset();
    mockShowAutoSelect.mockReset();
    mockShowTemporaryMessage.mockReset().mockImplementation(() => () => {});
    mockUpdateTimer.mockReset();
    mockUpdateDebugPanel.mockReset();
    mockDispatchBattleEvent.mockReset().mockResolvedValue(undefined);
    mockResetDispatchHistory.mockReset();
    mockOnBattleEvent.mockReset();
    mockOffBattleEvent.mockReset();
    mockEmitBattleEvent.mockReset();
    mockAttachCooldownRenderer.mockReset();
    mockComputeNextRoundCooldown.mockReset().mockReturnValue(0);

    harness = createSimpleHarness({ useFakeTimers: true });
    await harness.setup();
  });

  afterEach(async () => {
    if (harness) {
      await harness.cleanup();
    }
  });

  test("enables Next during cooldown and advances on click", async () => {
    // Deterministic: no real waits, no full-page DOM. Use fake timers and
    // wire minimal DOM nodes that the cooldown logic expects.
    const timers = useCanonicalTimers();

    // Minimal DOM: header + next button + timer node
    const { createBattleHeader } = await import("../utils/testUtils.js");
    const header = createBattleHeader();
    document.body.appendChild(header);
    const nextBtn = document.createElement("button");
    nextBtn.id = "next-button";
    nextBtn.setAttribute("data-role", "next-round");
    document.body.appendChild(nextBtn);

    // Keep engine timers out of the path; use shared deterministic timer mock
    const { mockCreateRoundTimer } = await import("../helpers/roundTimerMock.js");
    // Immediate initial tick when provided, no auto-expire
    mockCreateRoundTimer({ scheduled: false, ticks: [2], expire: false });

    // Initialize cooldown directly via the public API
    const { startCooldown, getNextRoundControls } = await harness.importModule(
      "../../src/helpers/classicBattle/roundManager.js"
    );
    startCooldown({}, { setTimeout: (cb, ms) => setTimeout(cb, ms) });

    // Next should be immediately marked ready during cooldown
    const next = document.getElementById("next-button");
    expect(next).toBeTruthy();
    expect(next?.disabled).toBe(false);
    expect(next?.getAttribute("data-next-ready")).toBe("true");

    // Clicking Next resolves the readiness promise and advances
    const { onNextButtonClick } = await harness.importModule(
      "../../src/helpers/classicBattle/timerService.js"
    );
    const controls = getNextRoundControls();
    const readyPromise = controls?.ready;
    await onNextButtonClick(new MouseEvent("click"), controls);
    await expect(readyPromise).resolves.toBeUndefined();

    timers.cleanup();
  });

  test("settles ready promise when ready dispatch returns false", async () => {
    const timers = useCanonicalTimers();
    document.body.innerHTML = '<button id="next-button" data-next-ready="true"></button>';

    mockDispatchBattleEvent.mockResolvedValueOnce(false);

    const { advanceWhenReady } = await harness.importModule(
      "../../src/helpers/classicBattle/timerService.js"
    );
    const btn = document.getElementById("next-button");
    expect(btn).toBeTruthy();

    let resolveReady;
    const readyPromise = new Promise((resolve) => {
      resolveReady = resolve;
    });

    await advanceWhenReady(btn, resolveReady);
    await expect(readyPromise).resolves.toBeUndefined();
    expect(mockDispatchBattleEvent).toHaveBeenCalledWith("ready");

    let resolveReadyAgain;
    const readyAgainPromise = new Promise((resolve) => {
      resolveReadyAgain = resolve;
    });
    btn?.setAttribute("data-next-ready", "true");

    mockDispatchBattleEvent.mockResolvedValueOnce(false);

    await advanceWhenReady(btn, resolveReadyAgain);
    await expect(readyAgainPromise).resolves.toBeUndefined();
    expect(mockDispatchBattleEvent).toHaveBeenCalledTimes(2);

    timers.cleanup();
  });

  test("settles ready promise when ready dispatch throws", async () => {
    const timers = useCanonicalTimers();
    document.body.innerHTML = '<button id="next-button" data-next-ready="true"></button>';
    const error = new Error("ready-dispatch-error");

    mockDispatchBattleEvent.mockRejectedValueOnce(error);

    const { advanceWhenReady } = await harness.importModule(
      "../../src/helpers/classicBattle/timerService.js"
    );
    const btn = document.getElementById("next-button");
    expect(btn).toBeTruthy();

    let resolveReady;
    const readyPromise = new Promise((resolve) => {
      resolveReady = resolve;
    });

    await expect(advanceWhenReady(btn, resolveReady)).rejects.toThrow(error);
    await expect(readyPromise).resolves.toBeUndefined();
    expect(mockDispatchBattleEvent).toHaveBeenCalledWith("ready");
    expect(btn?.disabled).toBe(false);
    expect(btn?.getAttribute("data-next-ready")).toBe("true");

    timers.cleanup();
  });

  test("re-enables Next if a callback disables it", async () => {
    const timers = useCanonicalTimers();
    document.body.innerHTML = '<button id="next-button" disabled></button>';
    document.body.dataset.battleState = "cooldown";

    mockDispatchBattleEvent.mockResolvedValueOnce(undefined);
    mockComputeNextRoundCooldown.mockReturnValueOnce(0);

    const { mockCreateRoundTimer: mockTimer2 } = await import("../helpers/roundTimerMock.js");
    mockTimer2({ scheduled: false, ticks: [], expire: false });

    const { startCooldown } = await harness.importModule(
      "../../src/helpers/classicBattle/roundManager.js"
    );
    startCooldown({}, { setTimeout: (cb, ms) => setTimeout(cb, ms) });
    setTimeout(() => {
      const btn = document.getElementById("next-button");
      if (btn) {
        btn.disabled = true;
        btn.dataset.nextReady = "false";
      }
    }, 5);

    await harness.timerControl.advanceTimersByTimeAsync(50);
    const next = document.getElementById("next-button");
    expect(next?.disabled).toBe(false);
    expect(next?.getAttribute("data-next-ready")).toBe("true");

    timers.cleanup();
  });
});
