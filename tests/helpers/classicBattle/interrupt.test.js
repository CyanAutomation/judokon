import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { setupClassicBattleDom } from "./utils.js";
import defaultSettings from "../../../src/data/settings.json" with { type: "json" };

vi.mock("../../../src/helpers/motionUtils.js", () => ({
  shouldReduceMotionSync: () => true
}));
vi.mock("../../../src/utils/scheduler.js", () => ({
  onFrame: (cb) => {
    const id = setTimeout(() => cb(performance.now()), 16);
    return id;
  },
  onSecondTick: (cb) => {
    const id = setInterval(() => cb(performance.now()), 1000);
    return id;
  },
  cancel: (id) => {
    clearTimeout(id);
    clearInterval(id);
  },
  start: vi.fn(),
  stop: vi.fn()
}));

let generateRandomCardMock;
vi.mock("../../../src/helpers/randomCard.js", () => ({
  generateRandomCard: (...args) => generateRandomCardMock(...args)
}));

let getRandomJudokaMock;
let renderMock;
let JudokaCardMock;
vi.mock("../../../src/helpers/cardUtils.js", () => ({
  getRandomJudoka: (...args) => getRandomJudokaMock(...args)
}));
vi.mock("../../../src/components/JudokaCard.js", () => {
  renderMock = vi.fn();
  JudokaCardMock = vi.fn().mockImplementation(() => ({ render: renderMock }));
  return { JudokaCard: JudokaCardMock };
});

let fetchJsonMock;
vi.mock("../../../src/helpers/dataUtils.js", () => ({
  fetchJson: (...args) => fetchJsonMock(...args),
  importJsonModule: vi.fn().mockResolvedValue(defaultSettings),
  validateWithSchema: vi.fn().mockResolvedValue(undefined)
}));

vi.mock("../../../src/helpers/utils.js", () => ({
  createGokyoLookup: () => ({})
}));

let currentFlags;
vi.mock("../../../src/helpers/featureFlags.js", () => ({
  featureFlagsEmitter: new EventTarget(),
  initFeatureFlags: vi.fn().mockResolvedValue({ featureFlags: currentFlags }),
  isEnabled: (flag) => currentFlags[flag]?.enabled ?? false
}));

let timerSpy;

beforeEach(() => {
  ({
    timerSpy,
    fetchJsonMock,
    generateRandomCardMock,
    getRandomJudokaMock,
    renderMock,
    currentFlags
  } = setupClassicBattleDom());
});

afterEach(() => {
  timerSpy.clearAllTimers();
  vi.restoreAllMocks();
});

describe("classicBattle interrupts", () => {
  it("dispatches interrupt when Random Stat Mode is disabled", async () => {
    currentFlags.randomStatMode.enabled = false;
    let dispatchSpy;
    vi.doMock("../../../src/helpers/classicBattle/orchestrator.js", async () => {
      const actual = await vi.importActual("../../../src/helpers/classicBattle/orchestrator.js");
      dispatchSpy = vi.fn(actual.dispatchBattleEvent);
      return { ...actual, dispatchBattleEvent: dispatchSpy };
    });
    let autoSelectSpy;
    vi.doMock("../../../src/helpers/classicBattle/autoSelectStat.js", async () => {
      const actual = await vi.importActual("../../../src/helpers/classicBattle/autoSelectStat.js");
      autoSelectSpy = vi.fn(actual.autoSelectStat);
      return { autoSelectStat: autoSelectSpy };
    });
    const battleMod = await import("../../../src/helpers/classicBattle.js");
    const store = battleMod.createBattleStore();
    battleMod._resetForTest(store);
    await battleMod.startRound(store);
    timerSpy.advanceTimersByTime(31000);
    await vi.runOnlyPendingTimersAsync();
    const events = dispatchSpy.mock.calls.map((c) => c[0]);
    expect(events).toContain("timeout");
    expect(events).toContain("interrupt");
  });
});
