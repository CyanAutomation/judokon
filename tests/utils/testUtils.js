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
  const motionToggle = document.createElement("input");
  motionToggle.id = "motion-toggle";
  motionToggle.type = "checkbox";
  const typewriterToggle = document.createElement("input");
  typewriterToggle.id = "typewriter-toggle";
  typewriterToggle.type = "checkbox";
  const tooltipsToggle = document.createElement("input");
  tooltipsToggle.id = "tooltips-toggle";
  tooltipsToggle.type = "checkbox";
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
  const displayGray = document.createElement("input");
  displayGray.id = "display-mode-gray";
  displayGray.type = "radio";
  displayGray.name = "display-mode";
  displayGray.value = "gray";
  const gameModeToggleContainer = document.createElement("section");
  gameModeToggleContainer.id = "game-mode-toggle-container";

  const featureFlagsContainer = document.createElement("section");
  featureFlagsContainer.id = "feature-flags-container";
  featureFlagsContainer.className = "game-mode-toggle-container settings-form";

  const advancedSection = document.createElement("div");
  advancedSection.className = "settings-section";
  const advToggle = document.createElement("button");
  advToggle.type = "button";
  advToggle.className = "settings-section-toggle";
  advToggle.id = "advanced-settings-toggle";
  advToggle.setAttribute("aria-expanded", "false");
  advToggle.setAttribute("aria-controls", "advanced-settings-content");
  advToggle.textContent = "Advanced Settings";
  const advContent = document.createElement("div");
  advContent.className = "settings-section-content";
  advContent.id = "advanced-settings-content";
  advContent.setAttribute("role", "region");
  advContent.setAttribute("aria-labelledby", "advanced-settings-toggle");
  advContent.hidden = true;
  advContent.appendChild(featureFlagsContainer);
  advancedSection.append(advToggle, advContent);
  const resetButton = document.createElement("button");
  resetButton.id = "reset-settings-button";
  fragment.append(
    soundToggle,
    motionToggle,
    typewriterToggle,
    tooltipsToggle,
    displayLight,
    displayDark,
    displayGray,
    gameModeToggleContainer,
    advancedSection,
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
