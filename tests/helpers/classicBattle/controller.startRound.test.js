import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useCanonicalTimers } from "../../setup/fakeTimers.js";
import { createBattleCardContainers } from "../../utils/testUtils.js";
import { applyMockSetup } from "./mockSetup.js";
import "./commonMocks.js";

/**
 * Build a scoreboard header matching the Classic Battle layout.
 */
function mountScoreboardHeader() {
  const header = document.createElement("header");
  header.className = "header battle-header";
  header.innerHTML = `
    <div class="scoreboard-left" id="scoreboard-left">
      <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
      <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status">
        <span data-part="label">Time Left:</span>
        <span data-part="value">0s</span>
      </p>
      <p id="round-counter" aria-live="polite" aria-atomic="true"></p>
    </div>
    <div class="scoreboard-gap"></div>
    <div class="scoreboard-right" id="scoreboard-right">
      <p id="score-display" aria-live="polite" aria-atomic="true" role="status">
        <span data-side="player">
          <span data-part="label">You:</span>
          <span data-part="value">0</span>
        </span>
        <span data-side="opponent">
          <span data-part="label">Opponent:</span>
          <span data-part="value">0</span>
        </span>
      </p>
    </div>
  `;
  return header;
}

describe.sequential("ClassicBattleController.startRound", () => {
  /** @type {ReturnType<typeof useCanonicalTimers>} */
  let timers;
  /** @type {(() => void)|undefined} */
  let disposeScoreboard;
  /** @type {import('../../../src/helpers/classicBattle/roundStore.js').roundStore} */
  let roundStore;
  /** @type {import('../../../src/helpers/classicBattle/battleEvents.js')} */
  let battleEvents;

  beforeEach(async () => {
    vi.resetModules();
    timers = useCanonicalTimers();
    document.body.innerHTML = "";

    const { playerCard, opponentCard } = createBattleCardContainers();
    opponentCard.id = "opponent-card";
    playerCard.id = "player-card";
    const placeholder = document.createElement("div");
    placeholder.id = "mystery-card-placeholder";
    opponentCard.appendChild(placeholder);
    const header = mountScoreboardHeader();
    document.body.append(playerCard, opponentCard, header);

    const statButtons = document.createElement("div");
    statButtons.id = "stat-buttons";
    const powerButton = document.createElement("button");
    powerButton.dataset.stat = "power";
    powerButton.textContent = "Power";
    statButtons.appendChild(powerButton);
    document.body.appendChild(statButtons);

    const snackbar = document.createElement("div");
    snackbar.id = "snackbar-container";
    snackbar.setAttribute("role", "status");
    snackbar.setAttribute("aria-live", "polite");
    document.body.appendChild(snackbar);

    const playerJudoka = {
      id: "player-judoka",
      name: "Test Player",
      stats: { power: 5, speed: 4, technique: 3, kumikata: 4, newaza: 2 },
      isHidden: false
    };
    const opponentJudoka = {
      id: "opponent-judoka",
      name: "Test Opponent",
      stats: { power: 3, speed: 2, technique: 2, kumikata: 1, newaza: 1 },
      isHidden: false
    };

    const fetchJsonMock = vi.fn(async (path) => {
      if (String(path).includes("judoka")) {
        return [playerJudoka, opponentJudoka];
      }
      if (String(path).includes("gokyo")) {
        return [{ id: 101, name: "O Soto Gari" }];
      }
      if (String(path).includes("gameTimers")) {
        return [{ id: 1, value: 25, default: true, category: "roundTimer" }];
      }
      return [];
    });
    const generateRandomCardMock = vi.fn(async (_data, _lookup, container, _prefetch, cb) => {
      container.innerHTML = `<article class="judoka-card" data-testid="player-card"><h2>${playerJudoka.name}</h2></article>`;
      cb?.(playerJudoka);
    });
    const renderMock = vi.fn(async () => {
      const el = document.createElement("article");
      el.className = "judoka-card";
      el.innerHTML = `<h2>${opponentJudoka.name}</h2>`;
      return el;
    });
    const getRandomJudokaMock = vi.fn(() => opponentJudoka);

    applyMockSetup({
      fetchJsonMock,
      generateRandomCardMock,
      getRandomJudokaMock,
      renderMock,
      currentFlags: {
        enableTestMode: { enabled: true },
        battleStateBadge: { enabled: true }
      }
    });

    const engine = { on: vi.fn(), off: vi.fn() };
    const getRoundsPlayed = vi.fn(() => 0);
    vi.doMock("../../../src/helpers/battleEngineFacade.js", () => ({
      startCoolDown: vi.fn(),
      pauseTimer: vi.fn(),
      resumeTimer: vi.fn(),
      createBattleEngine: vi.fn(),
      getEngine: vi.fn(() => engine),
      getScores: vi.fn(() => ({ playerScore: 0, opponentScore: 0 })),
      getRoundsPlayed,
      startRound: vi.fn(),
      STATS: ["power"],
      OUTCOME: {}
    }));

    const { initClassicBattleTest } = await import("./initClassicBattle.js");
    await initClassicBattleTest({ afterMock: true });

    const scoreboardModule = await import("../../../src/helpers/setupScoreboard.js");
    scoreboardModule.setupScoreboard({ pauseTimer: vi.fn(), resumeTimer: vi.fn() });
    const scoreboardAdapter = await import("../../../src/helpers/classicBattle/scoreboardAdapter.js");
    disposeScoreboard = scoreboardAdapter.initScoreboardAdapter();
    await scoreboardAdapter.whenScoreboardReady();

    ({ roundStore } = await import("../../../src/helpers/classicBattle/roundStore.js"));
    roundStore.setRoundNumber(0, { emitLegacyEvent: false });
    battleEvents = await import("../../../src/helpers/classicBattle/battleEvents.js");
  });

  afterEach(async () => {
    try {
      await vi.runOnlyPendingTimersAsync();
    } catch {}
    disposeScoreboard?.();
    timers?.cleanup();
    vi.restoreAllMocks();
    if (typeof document !== "undefined" && document.body) {
      document.body.innerHTML = "";
    }
  });

  it("runs startRound end-to-end updating store, scoreboard, and readiness", async () => {
    const { ClassicBattleController } = await import(
      "../../../src/helpers/classicBattle/controller.js"
    );
    const waitForOpponentCard = vi.fn(async () => {
      const container = document.getElementById("opponent-card");
      if (container && !container.querySelector(".judoka-card")) {
        const card = document.createElement("article");
        card.className = "judoka-card";
        card.textContent = "Opponent ready";
        container.appendChild(card);
      }
    });
    const controller = new ClassicBattleController({ waitForOpponentCard });

    const opponentReady = new Promise((resolve) => {
      const handler = () => {
        battleEvents.offBattleEvent("opponentCardReady", handler);
        resolve();
      };
      battleEvents.onBattleEvent("opponentCardReady", handler);
    });

    const roundStarted = new Promise((resolve) => {
      controller.addEventListener("roundStarted", resolve, { once: true });
    });

    await controller.startRound();
    await roundStarted;
    await opponentReady;
    await vi.runAllTimersAsync();

    const currentRound = roundStore.getCurrentRound();
    expect(currentRound.number).toBe(1);
    expect(currentRound.state).toBe("roundStart");
    expect(waitForOpponentCard).toHaveBeenCalledTimes(1);

    const opponentCard = document.getElementById("opponent-card");
    expect(opponentCard?.querySelector(".judoka-card")).toBeTruthy();

    const roundCounter = document.getElementById("round-counter");
    expect(roundCounter?.textContent.trim()).toBe("Round 1");
  });

  it("emits roundStartError when opponent readiness fails", async () => {
    const { ClassicBattleController } = await import(
      "../../../src/helpers/classicBattle/controller.js"
    );
    const failure = new Error("no card");
    const waitForOpponentCard = vi.fn(async () => {
      throw failure;
    });
    const controller = new ClassicBattleController({ waitForOpponentCard });

    const errorEvents = [];
    controller.addEventListener("roundStartError", (event) => {
      errorEvents.push(event.detail);
    });

    await expect(controller.startRound()).rejects.toThrow(failure);
    expect(waitForOpponentCard).toHaveBeenCalledTimes(1);
    expect(errorEvents).toHaveLength(1);
    expect(errorEvents[0]).toBe(failure);
  });
});

