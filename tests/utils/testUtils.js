// [TEST DEBUG] top-level testUtils.js

import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";
import { isConsoleMocked, shouldShowTestLogs } from "../../src/helpers/testLogGate.js";

const debugLog = (...args) => {
  if (typeof console === "undefined") return;
  if (shouldShowTestLogs() || isConsoleMocked(console.log)) {
    console.log(...args);
  }
};

debugLog("[TEST DEBUG] top-level testUtils.js");
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
    <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status">
      <span data-part="label">Time Left:</span>
      <span data-part="value">0s</span>
    </p>
    <p id="score-display" aria-live="off" aria-atomic="true">
      <span data-side="player">
        <span data-part="label">You:</span>
        <span data-part="value">0</span>
      </span>
      <span data-side="opponent">
        <span data-part="label">Opponent:</span>
        <span data-part="value">0</span>
      </span>
    </p>
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
    <p id="next-round-timer" aria-live="polite" aria-atomic="true" role="status">
      <span data-part="label">Time Left:</span>
      <span data-part="value">0s</span>
    </p>
    <p id="score-display" aria-live="off" aria-atomic="true">
      <span data-side="player">
        <span data-part="label">You:</span>
        <span data-part="value">0</span>
      </span>
      <span data-side="opponent">
        <span data-part="label">Opponent:</span>
        <span data-part="value">0</span>
      </span>
    </p>
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
 * 3. Create radio inputs for light and dark display modes.
 * 4. Create section containers for game mode toggles and feature flags.
 * 5. Create a reset button.
 * 6. Append all created elements to the fragment.
 * 7. Return the fragment.
 */
function createHeaderStub() {
  const header = document.createElement("header");
  header.className = "modern-header";
  header.setAttribute("role", "banner");

  const wrapper = document.createElement("div");
  wrapper.className = "modern-header__theme-toggle";
  wrapper.setAttribute("role", "group");
  wrapper.setAttribute("aria-label", "Display mode");

  const createOption = (value, tabIndex) => {
    const label = document.createElement("label");
    label.className = "modern-header__theme-pill";
    label.htmlFor = `header-display-mode-${value}`;

    const input = document.createElement("input");
    input.type = "radio";
    input.name = "header-display-mode";
    input.value = value;
    input.id = `header-display-mode-${value}`;
    input.className = "modern-header__theme-input";
    input.tabIndex = tabIndex;
    if (value === "light") {
      input.checked = true;
    }

    label.append(input, document.createTextNode(value.charAt(0).toUpperCase() + value.slice(1)));
    return label;
  };

  wrapper.append(createOption("light", 0), createOption("dark", -1));
  header.append(wrapper);
  return header;
}

function createHeroStub() {
  const hero = document.createElement("section");
  hero.className = "modern-hero";
  hero.setAttribute("aria-labelledby", "settings-page-title");

  const eyebrow = document.createElement("p");
  eyebrow.className = "modern-hero__eyebrow";
  eyebrow.textContent = "Personalize your dojo";

  const heading = document.createElement("h1");
  heading.id = "settings-page-title";
  heading.className = "settings-header";
  heading.textContent = "Settings";

  const description = document.createElement("p");
  description.className = "modern-hero__description";
  description.textContent = "Tailor JU-DO-KON! to your play style.";

  hero.append(eyebrow, heading, description);
  return hero;
}

function createSaveStatus() {
  const saveStatus = document.createElement("p");
  saveStatus.id = "settings-save-status";
  saveStatus.hidden = true;
  saveStatus.setAttribute("role", "status");
  saveStatus.setAttribute("aria-live", "polite");
  saveStatus.setAttribute("aria-atomic", "true");
  return saveStatus;
}

function createSectionCard({ sectionId, summaryText, open = false }) {
  const card = document.createElement("div");
  card.className = "modern-card";

  const details = document.createElement("details");
  details.className = "settings-section";
  details.dataset.sectionId = sectionId;
  details.open = open;

  const summary = document.createElement("summary");
  summary.textContent = summaryText;
  details.append(summary);
  card.append(details);
  return { card, details };
}

function createToggleItem({
  id,
  label,
  name,
  descId,
  descText,
  tooltipId,
  defaultChecked = false
}) {
  const item = document.createElement("div");
  item.className = "settings-item";

  const labelEl = document.createElement("label");
  labelEl.className = "switch";
  labelEl.htmlFor = id;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = id;
  input.name = name;
  input.setAttribute("aria-label", label);
  if (descId) {
    input.setAttribute("aria-describedby", descId);
  }
  if (tooltipId) {
    input.dataset.tooltipId = tooltipId;
  }
  if (defaultChecked) {
    input.checked = true;
  }

  const slider = document.createElement("div");
  slider.className = "slider round";

  const textSpan = document.createElement("span");
  textSpan.textContent = label;

  labelEl.append(input, slider, textSpan);

  const description = document.createElement("p");
  description.className = "settings-description";
  if (descId) {
    description.id = descId;
  }
  if (descText) {
    description.textContent = descText;
  }

  item.append(labelEl, description);
  return item;
}

function createDisplayCard() {
  const { card, details } = createSectionCard({
    sectionId: "display",
    summaryText: "Display Settings",
    open: true
  });
  const fieldset = document.createElement("fieldset");
  fieldset.id = "display-settings-container";
  fieldset.className = "game-mode-toggle-container settings-form";

  const group = document.createElement("div");
  group.className = "settings-item display-mode-group";
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", "Display Mode");

  const flex = document.createElement("div");
  flex.className = "display-mode-flex";

  const createOption = (value, checked, tabIndex) => {
    const optionLabel = document.createElement("label");
    optionLabel.className = "display-mode-option";

    const input = document.createElement("input");
    input.type = "radio";
    input.id = `display-mode-${value}`;
    input.name = "display-mode";
    input.value = value;
    input.tabIndex = tabIndex;
    if (checked) {
      input.checked = true;
    }

    const preview = document.createElement("span");
    preview.className = `theme-preview-card theme-preview-card--${value}`;
    preview.setAttribute("aria-hidden", "true");

    const header = document.createElement("span");
    header.className = "theme-preview-card__header";
    const body = document.createElement("span");
    body.className = "theme-preview-card__body";
    const chipA = document.createElement("span");
    chipA.className = "theme-preview-card__chip";
    const chipB = document.createElement("span");
    chipB.className = "theme-preview-card__chip";
    body.append(chipA, chipB);
    preview.append(header, body);

    const name = document.createElement("span");
    name.className = "theme-preview-name";
    name.textContent = value.charAt(0).toUpperCase() + value.slice(1);

    optionLabel.append(input, preview, name);
    return optionLabel;
  };

  flex.append(createOption("light", true, 0), createOption("dark", false, -1));
  group.append(flex);
  fieldset.append(group);
  details.append(fieldset);
  return card;
}

function createGeneralCard() {
  const { card, details } = createSectionCard({
    sectionId: "general",
    summaryText: "General Settings",
    open: true
  });
  const fieldset = document.createElement("fieldset");
  fieldset.id = "general-settings-container";
  fieldset.className = "game-mode-toggle-container settings-form";

  [
    {
      id: "sound-toggle",
      label: "Sound",
      name: "sound",
      descId: "sound-desc",
      descText: "Enable or mute game audio.",
      tooltipId: "settings.sound",
      defaultChecked: true
    },
    {
      id: "motion-toggle",
      label: "Motion Effects",
      name: "motion",
      descId: "motion-desc",
      descText: "Disable animations for a calmer interface.",
      tooltipId: "settings.motionEffects",
      defaultChecked: true
    },
    {
      id: "typewriter-toggle",
      label: "Typewriter Effect",
      name: "typewriter",
      descId: "typewriter-desc",
      descText: "Animate dialog text letter by letter.",
      tooltipId: "settings.typewriterEffect",
      defaultChecked: true
    },
    {
      id: "tooltips-toggle",
      label: "Tooltips",
      name: "tooltips",
      descId: "tooltips-desc",
      descText: "Show inline explanations for controls.",
      tooltipId: "settings.tooltips",
      defaultChecked: true
    },
    {
      id: "card-of-the-day-toggle",
      label: "Card of the Day",
      name: "cardOfTheDay",
      descId: "card-of-the-day-desc",
      descText: "Display a rotating featured card.",
      tooltipId: "settings.showCardOfTheDay"
    },
    {
      id: "full-navigation-map-toggle",
      label: "Full Navigation Map",
      name: "fullNavigationMap",
      descId: "full-navigation-map-desc",
      descText: "Display an overlay linking to every page.",
      tooltipId: "settings.fullNavigationMap"
    }
  ].forEach((config) => {
    fieldset.append(createToggleItem(config));
  });

  details.append(fieldset);
  return card;
}

function createGameModesCard() {
  const { card, details } = createSectionCard({
    sectionId: "gameModes",
    summaryText: "Game Modes"
  });
  const fieldset = document.createElement("fieldset");
  fieldset.id = "game-mode-toggle-container";
  fieldset.className = "game-mode-toggle-container settings-form";
  fieldset.setAttribute("aria-label", "Game Mode Selector");
  details.append(fieldset);
  return card;
}

function createAdvancedSearch() {
  const searchWrapper = document.createElement("div");
  searchWrapper.className = "advanced-settings-search";

  const label = document.createElement("label");
  label.className = "visually-hidden";
  label.setAttribute("for", "advanced-settings-search");
  label.textContent = "Search feature flags";

  const input = document.createElement("input");
  input.type = "search";
  input.id = "advanced-settings-search";
  input.placeholder = "Search feature flags";
  input.autocomplete = "off";
  input.setAttribute("aria-describedby", "advanced-settings-search-status");

  const empty = document.createElement("p");
  empty.id = "advanced-settings-no-results";
  empty.className = "settings-description";
  empty.hidden = true;
  empty.textContent = "No feature flags match your search.";

  const status = document.createElement("span");
  status.id = "advanced-settings-search-status";
  status.className = "visually-hidden";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");

  searchWrapper.append(label, input, empty, status);
  return searchWrapper;
}

function createAdvancedFieldset() {
  const fieldset = document.createElement("fieldset");
  fieldset.id = "feature-flags-container";
  fieldset.className = "game-mode-toggle-container settings-form";
  return fieldset;
}

function createResetButtonRow() {
  const item = document.createElement("div");
  item.className = "settings-item";

  const wrapper = document.createElement("div");
  wrapper.className = "centered-button-container u-flex u-justify-center";

  const button = document.createElement("button");
  button.type = "button";
  button.id = "reset-settings-button";
  button.textContent = "Restore Defaults";

  wrapper.append(button);
  item.append(wrapper);
  return item;
}

function createAdvancedCard() {
  const { card, details } = createSectionCard({
    sectionId: "advanced",
    summaryText: "Advanced Settings"
  });

  const search = createAdvancedSearch();
  const fieldset = createAdvancedFieldset();

  details.append(search, fieldset);
  return card;
}

function createLinksCard() {
  const { card, details } = createSectionCard({
    sectionId: "links",
    summaryText: "Links"
  });
  const fieldset = document.createElement("fieldset");
  fieldset.id = "links-container";
  fieldset.className = "settings-form";

  const list = document.createElement("ul");
  list.className = "settings-links-list settings-links-grid";

  [
    { id: "changelog-link", text: "View Change Log" },
    { id: "prdviewer-link", text: "View PRD Documents" },
    { id: "mockupviewer-link", text: "View Design Mockups" },
    { id: "tooltipviewer-link", text: "View Tooltip Descriptions" },
    { id: "vectorSearch-link", text: "Vector Search for RAG" }
  ].forEach(({ id, text }) => {
    const item = document.createElement("li");
    item.className = "settings-item";
    const link = document.createElement("a");
    link.id = id;
    link.href = "#";
    link.textContent = text;
    item.append(link);
    list.append(item);
  });

  fieldset.append(list, createResetButtonRow());
  details.append(fieldset);
  return card;
}

function createErrorPopup() {
  const popup = document.createElement("div");
  popup.id = "settings-error-popup";
  popup.className = "settings-error-popup";
  popup.setAttribute("role", "alert");
  popup.setAttribute("aria-live", "assertive");
  popup.style.display = "none";
  return popup;
}

export function createSettingsDom() {
  const fragment = document.createDocumentFragment();
  fragment.append(createHeaderStub(), createHeroStub());

  const form = document.createElement("form");
  form.id = "settings-form";
  form.className = "settings-form";

  form.append(
    createDisplayCard(),
    createGeneralCard(),
    createGameModesCard(),
    createAdvancedCard(),
    createLinksCard()
  );

  fragment.append(createSaveStatus(), form, createErrorPopup());
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
