// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { vi } from "vitest";

// Defer reading HTML file until after jsdom is setup
let htmlContent;
function getHtmlContent() {
  if (!htmlContent) {
    htmlContent = readFileSync(`${process.cwd()}/src/pages/battleClassic.html`, "utf-8");
  }
  return htmlContent;
}

const handleReplayMock = vi.fn().mockResolvedValue(undefined);
const quitMatchMock = vi.fn();

vi.mock("../../src/helpers/classicBattle/roundManager.js", async () => {
  const actual = await vi.importActual("../../src/helpers/classicBattle/roundManager.js");
  return {
    ...actual,
    handleReplay: handleReplayMock
  };
});

vi.mock("../../src/helpers/classicBattle/quitModal.js", async () => {
  const actual = await vi.importActual("../../src/helpers/classicBattle/quitModal.js");
  return {
    ...actual,
    quitMatch: quitMatchMock
  };
});

describe("Classic Battle end-of-match modal", () => {
  beforeEach(() => {
    document.documentElement.innerHTML = getHtmlContent();
    handleReplayMock.mockClear();
    quitMatchMock.mockClear();
  });

  test("renders with Replay and Quit when invoked", async () => {
    const { showEndModal } = await import("../../src/helpers/classicBattle/endModal.js");
    const { createBattleStore } = await import("../../src/helpers/classicBattle/roundManager.js");
    const store = createBattleStore();
    showEndModal(store, { winner: "player", scores: { player: 1, opponent: 0 } });
    const modal = document.getElementById("match-end-modal");
    expect(modal).toBeTruthy();
    expect(document.getElementById("match-replay-button")).toBeTruthy();
    expect(document.getElementById("match-quit-button")).toBeTruthy();
  });

  test("renders winner outcome messaging with scores", async () => {
    const { showEndModal } = await import("../../src/helpers/classicBattle/endModal.js");
    const { createBattleStore } = await import("../../src/helpers/classicBattle/roundManager.js");
    const store = createBattleStore();
    showEndModal(store, { winner: "player", scores: { player: 2, opponent: 1 } });
    const desc = document.getElementById("match-end-desc");
    expect(desc?.textContent).toBe("You win! (2-1)");
  });

  test("renders quit outcome messaging with scores", async () => {
    const { showEndModal } = await import("../../src/helpers/classicBattle/endModal.js");
    const { createBattleStore } = await import("../../src/helpers/classicBattle/roundManager.js");
    const store = createBattleStore();
    showEndModal(store, { outcome: "quit", scores: { player: 1, opponent: 0 } });
    const desc = document.getElementById("match-end-desc");
    expect(desc?.textContent).toBe("You quit the match. You lose! (1-0)");
  });

  test("applies aria attributes and focuses replay control", async () => {
    vi.useFakeTimers();
    const { showEndModal } = await import("../../src/helpers/classicBattle/endModal.js");
    const { createBattleStore } = await import("../../src/helpers/classicBattle/roundManager.js");
    const store = createBattleStore();
    showEndModal(store, { winner: "player", scores: { player: 1, opponent: 0 } });
    const modal = document.getElementById("match-end-modal");
    const replayButton = document.getElementById("match-replay-button");
    expect(modal?.getAttribute("role")).toBe("dialog");
    expect(modal?.getAttribute("aria-modal")).toBe("true");
    expect(modal?.getAttribute("aria-labelledby")).toBe("match-end-title");
    expect(modal?.getAttribute("aria-describedby")).toBe("match-end-desc");
    vi.runAllTimers();
    expect(document.activeElement).toBe(replayButton);
    vi.useRealTimers();
  });

  test("replay control calls handleReplay", async () => {
    const { showEndModal } = await import("../../src/helpers/classicBattle/endModal.js");
    const { createBattleStore } = await import("../../src/helpers/classicBattle/roundManager.js");
    const store = createBattleStore();
    showEndModal(store, { winner: "player", scores: { player: 1, opponent: 0 } });
    const replayButton = document.getElementById("match-replay-button");
    replayButton?.click();
    await Promise.resolve();
    expect(handleReplayMock).toHaveBeenCalledWith(store);
    expect(document.getElementById("match-end-modal")).toBeNull();
  });

  test("quit control calls quitMatch with button", async () => {
    const { showEndModal } = await import("../../src/helpers/classicBattle/endModal.js");
    const { createBattleStore } = await import("../../src/helpers/classicBattle/roundManager.js");
    const store = createBattleStore();
    showEndModal(store, { winner: "opponent", scores: { player: 0, opponent: 1 } });
    const quitButton = document.getElementById("match-quit-button");
    quitButton?.click();
    expect(quitMatchMock).toHaveBeenCalledWith(store, quitButton);
    expect(document.getElementById("match-end-modal")).toBeNull();
  });
});
