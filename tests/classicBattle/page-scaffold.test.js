import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { beforeEach, afterEach, describe, test, expect, vi } from "vitest";

const engineMock = vi.hoisted(() => ({
  listeners: new Map(),
  roundsPlayed: 0
}));

const modalMock = vi.hoisted(() => ({
  onStart: null
}));

vi.mock("../../src/helpers/battleEngineFacade.js", () => {
  return {
    STATS: ["Power", "Speed", "Skill"],
    createBattleEngine: vi.fn(() => {
      engineMock.listeners.clear();
      return {};
    }),
    on: vi.fn((event, handler) => {
      engineMock.listeners.set(event, handler);
    }),
    getRoundsPlayed: vi.fn(() => engineMock.roundsPlayed),
    isMatchEnded: vi.fn(() => false)
  };
});

vi.mock("../../src/helpers/classicBattle/roundSelectModal.js", () => ({
  initRoundSelectModal: vi.fn(async (onStart) => {
    modalMock.onStart = onStart;
  })
}));

vi.mock("../../src/helpers/classicBattle/timerService.js", () => ({
  startTimer: vi.fn(async () => ({ start: vi.fn(), stop: vi.fn() })),
  onNextButtonClick: vi.fn()
}));

vi.mock("../../src/helpers/timerUtils.js", () => ({
  createCountdownTimer: vi.fn((_, hooks = {}) => ({
    start: () => {
      hooks.onTick?.(0);
    },
    stop: vi.fn()
  })),
  getDefaultTimer: vi.fn(() => 2)
}));

vi.mock("../../src/helpers/classicBattle/roundManager.js", () => ({
  createBattleStore: vi.fn(() => ({
    selectionMade: false,
    stallTimeoutMs: 0,
    autoSelectId: null,
    playerChoice: null
  })),
  startCooldown: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/roundResolver.js", () => ({
  computeRoundResult: vi.fn(async () => ({
    playerScore: 1,
    opponentScore: 0,
    matchEnded: false
  }))
}));

vi.mock("../../src/helpers/classicBattle/selectionHandler.js", () => ({
  handleStatSelection: vi.fn(async () => ({
    playerScore: 1,
    opponentScore: 0,
    matchEnded: false
  }))
}));

vi.mock("../../src/helpers/classicBattle/statButtons.js", () => ({
  setStatButtonsEnabled: vi.fn(),
  resolveStatButtonsReady: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/quitModal.js", () => ({
  quitMatch: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/uiEventHandlers.js", () => ({
  bindUIHelperEventHandlersDynamic: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/debugPanel.js", () => ({
  initDebugPanel: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/endModal.js", () => ({
  showEndModal: vi.fn()
}));

vi.mock("../../src/helpers/featureFlags.js", () => ({
  initFeatureFlags: vi.fn(async () => ({ featureFlags: {} })),
  featureFlagsEmitter: new EventTarget(),
  isEnabled: vi.fn(() => false),
  setFlag: vi.fn()
}));

vi.mock("../../src/helpers/testApi.js", () => ({
  exposeTestAPI: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/snackbar.js", () => ({
  showSelectionPrompt: vi.fn()
}));

vi.mock("../../src/helpers/classicBattle/uiHelpers.js", () => ({
  removeBackdrops: vi.fn(),
  enableNextRoundButton: vi.fn(),
  showFatalInitError: vi.fn()
}));

let originalRAF;
let originalCAF;

describe("Classic Battle page scaffold (behavioral)", () => {
  beforeEach(() => {
    const file = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(file, "utf-8");
    document.documentElement.innerHTML = html;
    window.__FF_OVERRIDES = {};
    originalRAF = global.requestAnimationFrame;
    originalCAF = global.cancelAnimationFrame;
    global.requestAnimationFrame = (cb) => {
      if (typeof cb === "function") cb(0);
      return 1;
    };
    global.cancelAnimationFrame = vi.fn();
    modalMock.onStart = null;
    engineMock.listeners.clear();
    engineMock.roundsPlayed = 0;
    global.localStorage = {
      getItem: vi.fn(() => null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn()
    };
  });

  afterEach(() => {
    document.documentElement.innerHTML = "";
    delete window.__FF_OVERRIDES;
    delete global.localStorage;
    global.requestAnimationFrame = originalRAF;
    global.cancelAnimationFrame = originalCAF;
    engineMock.listeners.clear();
    modalMock.onStart = null;
    vi.resetModules();
    vi.clearAllMocks();
  });

  test("initializes scoreboard regions and default content", async () => {
    window.__FF_OVERRIDES = { battleStateBadge: true, showRoundSelectModal: true };
    const { init } = await import("../../src/pages/battleClassic.init.js");
    await init();

    const header = document.querySelector("header");
    expect(header).toBeTruthy();

    const msg = header.querySelector("#round-message");
    const timer = header.querySelector("#next-round-timer");
    const round = header.querySelector("#round-counter");
    const score = header.querySelector("#score-display");
    expect(msg).toBeTruthy();
    expect(timer).toBeTruthy();
    expect(round).toBeTruthy();
    expect(score).toBeTruthy();

    for (const el of [msg, timer]) {
      expect(el.getAttribute("role")).toBe("status");
      expect(el.getAttribute("aria-live")).toBe("polite");
      expect(el.getAttribute("aria-atomic")).toBe("true");
    }
    expect(score.getAttribute("aria-live")).toBe("off");
    expect(score.getAttribute("aria-atomic")).toBe("true");

    expect(score.textContent).toContain("You: 0");
    expect(score.textContent).toContain("Opponent: 0");
    expect(round.textContent).toContain("Round 0");
  });

  test("updates scoreboard text when a mock round starts", async () => {
    window.__FF_OVERRIDES = { battleStateBadge: true, showRoundSelectModal: true };
    const { init } = await import("../../src/pages/battleClassic.init.js");
    await init();

    expect(typeof modalMock.onStart).toBe("function");

    await modalMock.onStart?.();

    const round = document.querySelector("#round-counter");
    const score = document.querySelector("#score-display");
    expect(round?.textContent).toContain("Round 1");
    expect(score?.textContent).toContain("You: 0");

    const { emitBattleEvent } = await import("../../src/helpers/classicBattle/battleEvents.js");
    emitBattleEvent("display.round.start", { roundNumber: 3 });

    const roundEnded = engineMock.listeners.get("roundEnded");
    roundEnded?.({ playerScore: 4, opponentScore: 1 });

    expect(round?.textContent).toContain("Round 3");
    expect(score?.textContent).toContain("You: 4");
    expect(score?.textContent).toContain("Opponent: 1");

    const playerSpan = score?.querySelector("[data-side='player']");
    const opponentSpan = score?.querySelector("[data-side='opponent']");
    expect(playerSpan?.textContent).toContain("You: 4");
    expect(opponentSpan?.textContent).toContain("Opponent: 1");
    expect(score?.getAttribute("aria-live")).toBe("off");

    const statButtons = document.querySelectorAll("#stat-buttons button[data-stat]");
    expect(statButtons.length).toBeGreaterThan(0);
    const firstButton = statButtons[0];
    expect(firstButton.getAttribute("type")).toBe("button");
    expect(firstButton.getAttribute("aria-describedby")).toBe("round-message");
    expect(firstButton.getAttribute("data-testid")).toBe("stat-button");

    const nextButton = document.getElementById("next-button");
    expect(nextButton?.getAttribute("data-role")).toBe("next-round");
  });

  test("respects battle state badge feature flag overrides", async () => {
    window.__FF_OVERRIDES = { battleStateBadge: true };
    let mod = await import("../../src/pages/battleClassic.init.js");
    await mod.init();

    let badge = document.getElementById("battle-state-badge");
    expect(badge).toBeTruthy();
    expect(badge?.hidden).toBe(false);
    expect(badge?.hasAttribute("hidden")).toBe(false);
    expect(badge?.dataset.format).toBe("plain");
    expect(badge?.textContent).toBe("Lobby");

    document.documentElement.innerHTML = readFileSync(
      resolve(process.cwd(), "src/pages/battleClassic.html"),
      "utf-8"
    );
    modalMock.onStart = null;
    engineMock.listeners.clear();
    engineMock.roundsPlayed = 0;
    window.__FF_OVERRIDES = { battleStateBadge: false };
    mod = await import("../../src/pages/battleClassic.init.js");
    await mod.init();

    badge = document.getElementById("battle-state-badge");
    expect(badge).toBeTruthy();
    expect(badge?.hidden).toBe(true);
    expect(badge?.hasAttribute("hidden")).toBe(true);
    expect(badge?.dataset.format).toBe("plain");
  });
});
