import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const judokaFixture = JSON.parse(readFileSync(path.join(__dirname, "../fixtures/judoka.json")));
const gokyoFixture = JSON.parse(readFileSync(path.join(__dirname, "../fixtures/gokyo.json")));

export function createInfoBarHeader() {
  const header = document.createElement("header");
  header.innerHTML = `
    <p id="round-message"></p>
    <p id="next-round-timer"></p>
    <p id="score-display"></p>
  `;
  return header;
}

export function createBattleHeader() {
  const header = document.createElement("header");
  header.innerHTML = `
    <p id="round-message"></p>
    <p id="next-round-timer"></p>
    <p id="score-display"></p>
  `;
  return header;
}

export function createRandomCardDom() {
  const section = document.createElement("div");
  section.className = "card-section";
  const container = document.createElement("div");
  container.id = "card-container";
  return { section, container };
}

export function createBattleCardContainers() {
  const playerCard = document.createElement("div");
  playerCard.id = "player-card";
  const computerCard = document.createElement("div");
  computerCard.id = "computer-card";
  return { playerCard, computerCard };
}

export function createSettingsDom() {
  const fragment = document.createDocumentFragment();
  const soundToggle = document.createElement("input");
  soundToggle.id = "sound-toggle";
  soundToggle.type = "checkbox";
  const navmapToggle = document.createElement("input");
  navmapToggle.id = "navmap-toggle";
  navmapToggle.type = "checkbox";
  const motionToggle = document.createElement("input");
  motionToggle.id = "motion-toggle";
  motionToggle.type = "checkbox";
  const displayModeSelect = document.createElement("select");
  displayModeSelect.id = "display-mode-select";
  const gameModeToggleContainer = document.createElement("section");
  gameModeToggleContainer.id = "game-mode-toggle-container";
  const featureFlagsContainer = document.createElement("section");
  featureFlagsContainer.id = "feature-flags-container";
  fragment.append(
    soundToggle,
    navmapToggle,
    motionToggle,
    displayModeSelect,
    gameModeToggleContainer,
    featureFlagsContainer
  );
  return fragment;
}

export function resetDom() {
  if (typeof document !== "undefined" && document.body) {
    document.body.innerHTML = "";
  }
  vi.restoreAllMocks();
  vi.useRealTimers();
  vi.resetModules();
}

export function getJudokaFixture() {
  return structuredClone(judokaFixture);
}

export function getGokyoFixture() {
  return structuredClone(gokyoFixture);
}
