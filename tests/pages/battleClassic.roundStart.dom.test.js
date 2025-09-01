import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";

// Hoisted mocks to ensure they apply before module import

// Mock the round select modal to immediately start the match
vi.mock("../../src/helpers/classicBattle/roundSelectModal.js", () => ({
  initRoundSelectModal: vi.fn(async (onStart) => {
    if (typeof onStart === "function") await onStart();
  })
}));

// Provide minimal datasets for judoka and gokyo
vi.mock("../../src/helpers/dataUtils.js", () => ({
  fetchJson: (path) => {
    if (path.includes("judoka.json")) {
      return Promise.resolve([
        {
          id: 1,
          firstname: "Aiko",
          surname: "Yamada",
          country: "Japan",
          countryCode: "JPN",
          weightClass: "-66kg",
          signatureMoveId: 1,
          rarity: 1,
          stats: { power: 80, speed: 75, technique: 78, kumikata: 74, newaza: 70 }
        },
        {
          id: 2,
          firstname: "Bruno",
          surname: "Lacroix",
          country: "France",
          countryCode: "FRA",
          weightClass: "-73kg",
          signatureMoveId: 1,
          rarity: 1,
          stats: { power: 77, speed: 79, technique: 76, kumikata: 72, newaza: 69 }
        }
      ]);
    }
    if (path.includes("gokyo.json")) {
      return Promise.resolve([{ id: 1, name: "O-soto-gari" }]);
    }
    return Promise.resolve([]);
  },
  validateWithSchema: vi.fn().mockResolvedValue(undefined)
}));

// Mock JudokaCard to render a minimal, deterministic element
vi.mock("../../src/components/JudokaCard.js", () => ({
  JudokaCard: class {
    constructor(judoka) {
      this.judoka = judoka;
    }
    async render() {
      const el = document.createElement("div");
      el.className = "mock-card";
      el.setAttribute("data-judoka-id", String(this.judoka?.id ?? ""));
      el.textContent = this.judoka?.name || "Mock Judoka";
      return el;
    }
  }
}));

// Avoid IntersectionObserver and lazy image wiring in JSDOM
vi.mock("../../src/helpers/lazyPortrait.js", () => ({
  setupLazyPortraits: vi.fn()
}));

// Enable test mode so cooldowns auto-advance under Vitest
vi.mock("../../src/helpers/testModeUtils.js", () => ({
  setTestMode: vi.fn(),
  isTestModeEnabled: () => true,
  seededRandom: () => 0.42
}));

describe("battleClassic.html round start DOM", () => {
  beforeEach(() => {
    const html = readFileSync("src/pages/battleClassic.html", "utf8");
    document.documentElement.innerHTML = html;
  });

  it("populates player and opponent card containers on round start", async () => {
    // Import after mocks so bootstrap uses them
    const { setupClassicBattlePage } = await import("../../src/helpers/classicBattle/bootstrap.js");
    const { dispatchBattleEvent } = await import("../../src/helpers/classicBattle/orchestrator.js");
    const { onBattleEvent, offBattleEvent } = await import(
      "../../src/helpers/classicBattle/battleEvents.js"
    );

    await setupClassicBattlePage();

    // Trigger the machine to leave the lobby and start the match
    await dispatchBattleEvent("startClicked");
    // Wait for the round to announce start (after drawCards completes)
    await new Promise((resolve) => {
      const handler = () => {
        offBattleEvent("roundStarted", handler);
        resolve();
      };
      onBattleEvent("roundStarted", handler);
    });

    const player = document.getElementById("player-card");
    const opponent = document.getElementById("opponent-card");
    expect(player).toBeTruthy();
    expect(opponent).toBeTruthy();
    // Expect some element content to be present in both containers
    expect(player?.children.length || 0).toBeGreaterThan(0);
    expect(opponent?.children.length || 0).toBeGreaterThan(0);
  });
});
