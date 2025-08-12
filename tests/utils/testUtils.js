import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const judokaFixture = JSON.parse(readFileSync(path.join(__dirname, "../fixtures/judoka.json")));
const gokyoFixture = JSON.parse(readFileSync(path.join(__dirname, "../fixtures/gokyo.json")));

export function createInfoBarHeader() {
  const header = document.createElement("header");
  header.innerHTML = `
    <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
    <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status"></p>
    <p id="score-display" aria-live="off" aria-atomic="true"></p>
  `;
  return header;
}

export function createBattleHeader() {
  const header = document.createElement("header");
  header.innerHTML = `
    <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
    <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status"></p>
    <p id="score-display" aria-live="off" aria-atomic="true"></p>
  `;
  return header;
}

export function createRandomCardDom() {
  const section = document.createElement("div");
  section.className = "card-section";
  const container = document.createElement("div");
  container.id = "card-container";
  const placeholderTemplate = document.createElement("template");
  placeholderTemplate.id = "card-placeholder-template";
  placeholderTemplate.innerHTML =
    '<div class="card placeholder-card" data-testid="placeholder-card"><p>Tap "Draw Card!" to begin.</p></div>';
  return { section, container, placeholderTemplate };
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
  const motionToggle = document.createElement("input");
  motionToggle.id = "motion-toggle";
  motionToggle.type = "checkbox";
  const typewriterToggle = document.createElement("input");
  typewriterToggle.id = "typewriter-toggle";
  typewriterToggle.type = "checkbox";
  const tooltipsToggle = document.createElement("input");
  tooltipsToggle.id = "tooltips-toggle";
  tooltipsToggle.type = "checkbox";
  const cardOfTheDayToggle = document.createElement("input");
  cardOfTheDayToggle.id = "card-of-the-day-toggle";
  cardOfTheDayToggle.type = "checkbox";
  const fullNavigationMapToggle = document.createElement("input");
  fullNavigationMapToggle.id = "full-navigation-map-toggle";
  fullNavigationMapToggle.type = "checkbox";
  const displayLight = document.createElement("input");
  displayLight.id = "display-mode-light";
  displayLight.type = "radio";
  displayLight.name = "display-mode";
  displayLight.value = "light";
  const displayDark = document.createElement("input");
  displayDark.id = "display-mode-dark";
  displayDark.type = "radio";
  displayDark.name = "display-mode";
  displayDark.value = "dark";
  const displayHighContrast = document.createElement("input");
  displayHighContrast.id = "display-mode-high-contrast";
  displayHighContrast.type = "radio";
  displayHighContrast.name = "display-mode";
  displayHighContrast.value = "high-contrast";
  const gameModeToggleContainer = document.createElement("section");
  gameModeToggleContainer.id = "game-mode-toggle-container";

  const featureFlagsContainer = document.createElement("section");
  featureFlagsContainer.id = "feature-flags-container";
  featureFlagsContainer.className = "game-mode-toggle-container settings-form";

  const resetButton = document.createElement("button");
  resetButton.id = "reset-settings-button";
  fragment.append(
    soundToggle,
    motionToggle,
    typewriterToggle,
    tooltipsToggle,
    cardOfTheDayToggle,
    fullNavigationMapToggle,
    displayLight,
    displayDark,
    displayHighContrast,
    gameModeToggleContainer,
    featureFlagsContainer,
    resetButton
  );
  return fragment;
}

export function resetDom() {
  if (typeof document !== "undefined" && document.body) {
    document.body.innerHTML = "";
  }
  if (typeof localStorage !== "undefined") {
    localStorage.clear();
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
