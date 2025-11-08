// [TEST DEBUG] top-level testUtils.js

import { readFileSync } from "fs";
import { isConsoleMocked, shouldShowTestLogs } from "../../src/helpers/testLogGate.js";

const debugLog = (...args) => {
  if (typeof console === "undefined") return;
  if (shouldShowTestLogs() || isConsoleMocked(console.log)) {
    console.log(...args);
  }
};

debugLog("[TEST DEBUG] top-level testUtils.js");

// Lazy-load fixtures to handle when readFileSync is externalized in JSDOM
let cachedJudokaFixture = null;
let cachedGokyoFixture = null;

const getJudokaFixture = () => {
  if (cachedJudokaFixture) return cachedJudokaFixture;
  try {
    const fixturePath = new URL("../fixtures/judoka.json", import.meta.url).pathname;
    const normalizedPath = fixturePath[0] === "/" && fixturePath[2] === ":" ? fixturePath.substring(1) : fixturePath;
    cachedJudokaFixture = JSON.parse(readFileSync(normalizedPath));
    return cachedJudokaFixture;
  } catch (e) {
    debugLog("[TEST DEBUG] Error loading judoka fixture:", e.message);
    throw e;
  }
};

const getGokyoFixture = () => {
  if (cachedGokyoFixture) return cachedGokyoFixture;
  try {
    const fixturePath = new URL("../fixtures/gokyo.json", import.meta.url).pathname;
    const normalizedPath = fixturePath[0] === "/" && fixturePath[2] === ":" ? fixturePath.substring(1) : fixturePath;
    cachedGokyoFixture = JSON.parse(readFileSync(normalizedPath));
    return cachedGokyoFixture;
  } catch (e) {
    debugLog("[TEST DEBUG] Error loading gokyo fixture:", e.message);
    throw e;
  }
};

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
  const drawControls = document.createElement("div");
  drawControls.id = "draw-controls";
  drawControls.className = "draw-controls";
  drawControls.setAttribute("aria-label", "Draw controls");
  const drawButton = document.createElement("button");
  drawButton.id = "draw-card-btn";
  drawButton.className = "draw-card-btn";
  drawButton.type = "button";
  drawButton.dataset.testid = "draw-button";
  drawButton.dataset.tooltipId = "ui.drawCard";
  drawButton.setAttribute("aria-label", "Draw a random judoka card");
  drawButton.setAttribute("aria-live", "polite");
  drawButton.setAttribute("tabindex", "0");
  const parser = new DOMParser();
  const svgDoc = parser.parseFromString(
    '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="m600-200-56-57 143-143H300q-75 0-127.5-52.5T120-580q0-75 52.5-127.5T300-760h20v80h-20q-42 0-71 29t-29 71q0 42 29 71t71 29h387L544-624l56-56 240 240-240 240Z"/></svg>',
    "image/svg+xml"
  );
  const icon = svgDoc.querySelector("svg");
  if (icon) {
    icon.setAttribute("aria-hidden", "true");
    drawButton.appendChild(icon);
  }
  const label = document.createElement("span");
  label.className = "button-label";
  label.textContent = "Draw Card!";
  drawButton.appendChild(label);
  const errorMessage = document.createElement("div");
  errorMessage.id = "draw-error-message";
  errorMessage.setAttribute("role", "alert");
  errorMessage.setAttribute("aria-live", "assertive");
  errorMessage.style.color = "#b00020";
  errorMessage.style.fontSize = "1.1rem";
  errorMessage.style.marginTop = "12px";
  drawControls.append(drawButton, errorMessage);
  section.append(container, placeholderTemplate, drawControls);
  return { section, container, placeholderTemplate, drawControls, drawButton };
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
  const createSvgElement = (name) => document.createElementNS("http://www.w3.org/2000/svg", name);

  const hero = document.createElement("section");
  hero.className = "modern-hero";
  hero.setAttribute("aria-labelledby", "settings-page-title");

  const layout = document.createElement("div");
  layout.className = "modern-hero__layout";

  const content = document.createElement("div");
  content.className = "modern-hero__content";

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

  const actions = document.createElement("div");
  actions.className = "modern-hero__actions";
  const cta = document.createElement("a");
  cta.className = "primary-button modern-hero__cta";
  cta.href = "#display-settings-container";
  cta.textContent = "Adjust display mode";
  actions.append(cta);

  const fieldset = document.createElement("fieldset");
  fieldset.id = "display-settings-container";
  fieldset.className = "modern-hero__display-mode game-mode-toggle-container settings-form";
  fieldset.setAttribute("aria-describedby", "modern-hero-preview-description");

  const legend = document.createElement("legend");
  legend.className = "modern-hero__display-mode-legend";
  legend.textContent = "Display mode";

  const group = document.createElement("div");
  group.className = "settings-item display-mode-group";
  group.setAttribute("role", "radiogroup");
  group.setAttribute("aria-label", "Display Mode");

  const flex = document.createElement("div");
  flex.className = "display-mode-flex";

  const createOption = (value, tabIndex) => {
    const optionLabel = document.createElement("label");
    optionLabel.className = "display-mode-option";
    optionLabel.dataset.mode = value;

    const input = document.createElement("input");
    input.type = "radio";
    input.id = `display-mode-${value}`;
    input.name = "display-mode";
    input.value = value;
    input.tabIndex = tabIndex;
    input.setAttribute("form", "settings-form");
    if (value === "light") {
      input.checked = true;
    }

    const pill = document.createElement("span");
    pill.className = "display-mode-option__pill";

    const iconWrapper = document.createElement("span");
    iconWrapper.className = "display-mode-option__icon";
    iconWrapper.setAttribute("aria-hidden", "true");

    const svg = createSvgElement("svg");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("focusable", "false");
    svg.setAttribute("aria-hidden", "true");
    svg.classList.add("display-mode-option__icon-svg");

    if (value === "dark") {
      const path = createSvgElement("path");
      path.setAttribute("d", "M15.5 3.5a8 8 0 1 0 5 13.86A8.5 8.5 0 0 1 15.5 3.5Z");
      path.setAttribute("fill", "currentColor");
      svg.append(path);
    } else {
      const circle = createSvgElement("circle");
      circle.setAttribute("cx", "12");
      circle.setAttribute("cy", "12");
      circle.setAttribute("r", "4.5");
      circle.setAttribute("fill", "currentColor");
      svg.append(circle);

      const lines = [
        ["12", "2.2", "12", "5"],
        ["12", "19", "12", "21.8"],
        ["4.22", "4.22", "6.2", "6.2"],
        ["17.8", "17.8", "19.78", "19.78"],
        ["2.2", "12", "5", "12"],
        ["19", "12", "21.8", "12"],
        ["4.22", "19.78", "6.2", "17.8"],
        ["17.8", "6.2", "19.78", "4.22"]
      ];
      lines.forEach(([x1, y1, x2, y2]) => {
        const line = createSvgElement("line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", "currentColor");
        line.setAttribute("stroke-width", "1.6");
        line.setAttribute("stroke-linecap", "round");
        line.setAttribute("fill", "none");
        svg.append(line);
      });
    }

    iconWrapper.append(svg);

    const labelText = document.createElement("span");
    labelText.className = "display-mode-option__label";
    labelText.textContent = value.charAt(0).toUpperCase() + value.slice(1);

    pill.append(iconWrapper, labelText);
    optionLabel.append(input, pill);
    return optionLabel;
  };

  flex.append(createOption("light", 0), createOption("dark", -1));
  group.append(flex);
  fieldset.append(legend, group);

  const previewDescription = document.createElement("p");
  previewDescription.id = "modern-hero-preview-description";
  previewDescription.className = "visually-hidden";
  previewDescription.textContent =
    "Visual preview of the available display mode themes: light, dark, and retro.";

  const visual = document.createElement("div");
  visual.className = "modern-hero__visual";
  visual.setAttribute("aria-hidden", "true");

  const preview = document.createElement("div");
  preview.className = "modern-hero-preview";

  const previewCard = document.createElement("div");
  previewCard.className = "modern-hero-preview__card";
  preview.append(previewCard);
  visual.append(preview);

  content.append(eyebrow, heading, description, actions, fieldset);
  layout.append(content, previewDescription, visual);
  hero.append(layout);
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

  form.append(createGeneralCard(), createGameModesCard(), createAdvancedCard(), createLinksCard());

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
