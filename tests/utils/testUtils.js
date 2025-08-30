import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const judokaFixture = JSON.parse(readFileSync(path.join(__dirname, "../fixtures/judoka.json")));
const gokyoFixture = JSON.parse(readFileSync(path.join(__dirname, "../fixtures/gokyo.json")));

/**
 * Creates a header element for scoreboard-related tests.
 *
 * @pseudocode
 * 1. Create a <header> element.
 * 2. Inject paragraphs for round message, next round timer, and score display.
 * 3. Return the populated header element.
 *
 * @example
 * const header = createScoreboardHeader();
 * document.body.appendChild(header);
 * scoreboard.updateTimer(5); // Renders "Time Left: 5s"
 */
export function createScoreboardHeader() {
  const header = document.createElement("header");
  header.innerHTML = `
    <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
    <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status"></p>
    <p id="score-display" aria-live="off" aria-atomic="true"></p>
  `;
  return header;
}

/**
 * Creates a header element for battle-related tests.
 *
 * @pseudocode
 * 1. Create a <header> element.
 * 2. Populate it with round message, next round timer, and score display paragraphs.
 * 3. Return the header element.
 *
 * @example
 * const header = createBattleHeader();
 * document.body.appendChild(header);
 * scoreboard.updateTimer(10); // Renders "Time Left: 10s"
 */
export function createBattleHeader() {
  const header = document.createElement("header");
  header.innerHTML = `
    <p id="round-message" aria-live="polite" aria-atomic="true" role="status"></p>
    <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status"></p>
    <p id="score-display" aria-live="off" aria-atomic="true"></p>
  `;
  return header;
}

/**
 * Builds DOM elements for the random card feature.
 *
 * @pseudocode
 * 1. Create a section div with class "card-section".
 * 2. Create a card container div with id "card-container".
 * 3. Create a template element with id "card-placeholder-template".
 * 4. Set the template's innerHTML to placeholder card markup.
 * 5. Return an object containing section, container, and placeholderTemplate.
 */
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

/**
 * Creates card containers for player and opponent cards.
 *
 * @pseudocode
 * 1. Create a div for the player card and assign id "player-card".
 * 2. Create a div for the opponent card and assign id "opponent-card".
 * 3. Return an object with playerCard and opponentCard.
 */
export function createBattleCardContainers() {
  const playerCard = document.createElement("div");
  playerCard.id = "player-card";
  const opponentCard = document.createElement("div");
  opponentCard.id = "opponent-card";
  return { playerCard, opponentCard };
}

/**
 * Constructs a settings fragment containing toggles and display options.
 *
 * @pseudocode
 * 1. Create a document fragment to hold UI elements.
 * 2. Create checkbox inputs for sound, motion, typewriter, tooltips, card of the day, and full navigation map.
 * 3. Create radio inputs for light, dark, and high-contrast display modes.
 * 4. Create section containers for game mode toggles and feature flags.
 * 5. Create a reset button.
 * 6. Append all created elements to the fragment.
 * 7. Return the fragment.
 */
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

/**
 * Resets DOM and test environment state.
 *
 * @pseudocode
 * 1. If a document body exists, clear its innerHTML.
 * 2. If localStorage exists, clear its contents.
 * 3. Restore all Vitest mocks.
 * 4. Switch timers back to real timers.
 * 5. Reset imported modules.
 */
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

/**
 * Returns a copy of the judoka fixture data.
 *
 * @pseudocode
 * 1. Clone the loaded judoka fixture object.
 * 2. Return the cloned data.
 */
export function getJudokaFixture() {
  return structuredClone(judokaFixture);
}

/**
 * Returns a copy of the gokyo fixture data.
 *
 * @pseudocode
 * 1. Clone the loaded gokyo fixture object.
 * 2. Return the cloned data.
 */
export function getGokyoFixture() {
  return structuredClone(gokyoFixture);
}
