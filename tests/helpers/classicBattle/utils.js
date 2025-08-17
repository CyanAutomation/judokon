import { vi } from "vitest";
import { createBattleHeader, createBattleCardContainers } from "../../utils/testUtils.js";

export function setupClassicBattleDom() {
  vi.resetModules();
  document.body.innerHTML = "";
  const { playerCard, computerCard } = createBattleCardContainers();
  const header = createBattleHeader();
  document.body.append(playerCard, computerCard, header);
  const container = document.createElement("div");
  container.id = "snackbar-container";
  container.setAttribute("role", "status");
  container.setAttribute("aria-live", "polite");
  document.body.append(container);

  const timerSpy = vi.useFakeTimers();
  const fetchJsonMock = vi.fn(async (url) => {
    if (String(url).includes("gameTimers.json")) {
      return [{ id: 1, value: 30, default: true, category: "roundTimer" }];
    }
    return [];
  });
  const generateRandomCardMock = vi.fn(async (_d, _g, container, _pm, cb) => {
    container.innerHTML = `<ul><li class="stat"><strong>Power</strong> <span>5</span></li></ul>`;
    if (cb) cb({ id: 1 });
  });
  const getRandomJudokaMock = vi.fn(() => ({ id: 2 }));
  const renderMock = vi.fn(async () => {
    const el = document.createElement("div");
    el.innerHTML = `<ul><li class="stat"><strong>Power</strong> <span>3</span></li></ul>`;
    return el;
  });
  const currentFlags = { randomStatMode: { enabled: true } };

  return {
    timerSpy,
    fetchJsonMock,
    generateRandomCardMock,
    getRandomJudokaMock,
    renderMock,
    currentFlags
  };
}

export function createNextButton() {
  const btn = document.createElement("button");
  btn.id = "next-button";
  document.body.appendChild(btn);
  return btn;
}

export function createNextRoundTimer() {
  const timerNode = document.createElement("p");
  timerNode.id = "next-round-timer";
  document.body.appendChild(timerNode);
  return timerNode;
}
