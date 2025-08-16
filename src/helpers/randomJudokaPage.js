/**
 * Initialize the Random Judoka page once the DOM is ready.
 *
 * Relies on global settings to respect motion preferences.
 *
 * @pseudocode
 * 1. Load persisted settings and fall back to the system motion preference.
 * 2. Preload judoka and gokyo data via `preloadRandomCardData` service.
 * 3. Initialize a draw history manager with a 5-entry limit.
 * 4. Toggle the `.simulate-viewport` class based on the stored feature flag.
 * 5. Create a hidden slide-out history panel and a toggle button.
 * 6. Define `displayCard` that disables the Draw button, updates its text and `aria-busy` state while loading, verifies the
 *    card container exists, calls `generateRandomCard` with the loaded data and the user's motion preference, handles any
 *    errors by logging and showing a message, updates the history list, then restores the button once the animation completes
 *    (or immediately when motion is disabled).
 * 7. Render a placeholder card in the card container.
 * 8. Create the "Draw Card!" button (min 64px height, 300px width, pill shape, ARIA attributes) and attach its event listener.
 * 9. If data fails to load, disable the Draw button and show an error message or fallback card.
 * 10. Use `onDomReady` to execute setup when the DOM content is loaded.
 *
 * @returns {Promise<void>} Resolves when the page is fully initialized.
 * @see design/productRequirementsDocuments/prdRandomJudoka.md
 * @see design/productRequirementsDocuments/prdDrawRandomCard.md
 */
import { generateRandomCard } from "./randomCard.js";
import { toggleInspectorPanels } from "./cardUtils.js";
import { createButton } from "../components/Button.js";
import { applyMotionPreference } from "./motionUtils.js";
import { onDomReady } from "./domReady.js";
import { initTooltips } from "./tooltip.js";
import { toggleViewportSimulation } from "./viewportDebug.js";
import { toggleTooltipOverlayDebug } from "./tooltipOverlayDebug.js";
import { setTestMode } from "./testModeUtils.js";
import { initFeatureFlags, isEnabled, featureFlagsEmitter } from "./featureFlags.js";
import { preloadRandomCardData, createHistoryManager } from "./randomCardService.js";

const DRAW_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="m600-200-56-57 143-143H300q-75 0-127.5-52.5T120-580q0-75 52.5-127.5T300-760h20v80h-20q-42 0-71 29t-29 71q0 42 29 71t71 29h387L544-624l56-56 240 240-240 240Z"/></svg>';

export async function initFeatureFlagState() {
  let settings;
  try {
    settings = await initFeatureFlags();
  } catch (err) {
    console.error("Error loading settings:", err);
    settings = {
      motionEffects: !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
      featureFlags: {
        viewportSimulation: { enabled: false },
        enableCardInspector: { enabled: false },
        tooltipOverlayDebug: { enabled: false }
      }
    };
  }

  setTestMode(isEnabled("enableTestMode"));
  applyMotionPreference(settings.motionEffects);
  toggleViewportSimulation(isEnabled("viewportSimulation"));
  toggleInspectorPanels(isEnabled("enableCardInspector"));
  toggleTooltipOverlayDebug(isEnabled("tooltipOverlayDebug"));

  const prefersReducedMotion =
    !settings.motionEffects || window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return { prefersReducedMotion };
}

export function buildHistoryPanel(prefersReducedMotion) {
  const cardSection = document.querySelector(".card-section");
  const toggleHistoryBtn = createButton("History", {
    id: "toggle-history-btn",
    type: "button"
  });
  toggleHistoryBtn.setAttribute("aria-controls", "history-panel");
  toggleHistoryBtn.setAttribute("aria-expanded", "false");
  cardSection.appendChild(toggleHistoryBtn);

  const historyPanel = document.createElement("aside");
  historyPanel.id = "history-panel";
  historyPanel.style.position = "fixed";
  historyPanel.style.top = "0";
  historyPanel.style.right = "0";
  historyPanel.style.height = "100%";
  historyPanel.style.width = "260px";
  historyPanel.style.background = "#fff";
  historyPanel.style.boxShadow = "0 0 10px rgba(0,0,0,0.3)";
  historyPanel.style.padding = "16px";
  historyPanel.style.transform = "translateX(100%)";
  historyPanel.style.transition = getHistoryPanelTransition(prefersReducedMotion);
  historyPanel.setAttribute("aria-hidden", "true");
  const historyTitle = document.createElement("h2");
  historyTitle.textContent = "History";
  const historyList = document.createElement("ul");
  historyPanel.append(historyTitle, historyList);
  document.body.appendChild(historyPanel);

  return { historyPanel, historyList, toggleHistoryBtn };
}

export function createDrawButton() {
  const drawButton = createButton("Draw Card!", {
    id: "draw-card-btn",
    className: "draw-card-btn",
    type: "button",
    icon: DRAW_ICON
  });
  drawButton.dataset.testid = "draw-button";
  drawButton.dataset.tooltipId = "ui.drawCard";
  drawButton.style.minHeight = "64px";
  drawButton.style.minWidth = "300px";
  drawButton.style.borderRadius = "999px";
  drawButton.setAttribute("aria-label", "Draw a random judoka card");
  drawButton.setAttribute("aria-live", "polite");
  drawButton.setAttribute("tabindex", "0");
  return drawButton;
}

function showError(msg) {
  let errorEl = document.getElementById("draw-error-message");
  if (!errorEl) {
    errorEl = document.createElement("div");
    errorEl.id = "draw-error-message";
    errorEl.setAttribute("role", "alert");
    errorEl.setAttribute("aria-live", "assertive");
    errorEl.style.color = "#b00020";
    errorEl.style.marginTop = "12px";
    errorEl.style.fontSize = "1.1rem";
    const cardSection = document.querySelector(".card-section");
    cardSection.appendChild(errorEl);
  }
  errorEl.textContent = msg;
}

function updateHistoryUI(historyList, historyManager) {
  if (!historyList) return;
  historyList.innerHTML = "";
  historyManager.get().forEach((j) => {
    const li = document.createElement("li");
    li.textContent = `${j.firstname} ${j.surname}`;
    historyList.appendChild(li);
  });
}

function addToHistory(historyManager, historyList, judoka) {
  historyManager.add(judoka);
  updateHistoryUI(historyList, historyManager);
}

function toggleHistory(historyPanel, toggleHistoryBtn) {
  const isOpen = historyPanel.getAttribute("aria-hidden") === "false";
  const nextOpen = !isOpen;
  historyPanel.style.transform = nextOpen ? "translateX(0)" : "translateX(100%)";
  historyPanel.setAttribute("aria-hidden", String(!nextOpen));
  toggleHistoryBtn.setAttribute("aria-expanded", String(nextOpen));
}

function getHistoryPanelTransition(prefersReducedMotion) {
  return prefersReducedMotion ? "transform 0.01s linear" : "transform 0.3s ease";
}

async function displayCard({
  dataLoaded,
  drawButton,
  cachedJudokaData,
  cachedGokyoData,
  prefersReducedMotion,
  onSelect
}) {
  if (!dataLoaded) {
    showError("Unable to load judoka data. Please try again later.");
    drawButton.disabled = true;
    drawButton.setAttribute("aria-disabled", "true");
    return;
  }
  const label = drawButton.querySelector(".button-label");
  drawButton.disabled = true;
  drawButton.setAttribute("aria-disabled", "true");
  drawButton.classList.add("is-loading");
  if (label) {
    label.textContent = "Drawing…";
  } else {
    drawButton.textContent = "Drawing…";
  }
  drawButton.setAttribute("aria-busy", "true");
  const errorEl = document.getElementById("draw-error-message");
  if (errorEl) errorEl.textContent = "";
  const cardContainer = document.getElementById("card-container");
  function enableButton() {
    drawButton.disabled = false;
    drawButton.removeAttribute("aria-disabled");
    drawButton.classList.remove("is-loading");
    if (label) {
      label.textContent = "Draw Card!";
    } else {
      drawButton.textContent = "Draw Card!";
    }
    drawButton.removeAttribute("aria-busy");
  }
  if (!cardContainer) {
    showError("Card area missing. Please refresh the page.");
    enableButton();
    return;
  }
  try {
    await generateRandomCard(
      cachedJudokaData,
      cachedGokyoData,
      cardContainer,
      prefersReducedMotion,
      onSelect,
      { enableInspector: isEnabled("enableCardInspector") }
    );
  } catch (err) {
    showError("Unable to draw card. Please try again later.");
    console.error("Error generating card:", err);
    enableButton();
    return;
  }
  if (prefersReducedMotion) {
    enableButton();
  } else {
    const cardEl = cardContainer.querySelector(".card-container");
    if (!cardEl) {
      requestAnimationFrame(enableButton);
    } else {
      const onEnd = () => {
        cardEl.removeEventListener("animationend", onEnd);
        enableButton();
      };
      cardEl.addEventListener("animationend", onEnd);
    }
  }
}

export async function setupRandomJudokaPage() {
  const { prefersReducedMotion } = await initFeatureFlagState();

  const cardContainer = document.getElementById("card-container");
  const placeholderTemplate = document.getElementById("card-placeholder-template");
  if (placeholderTemplate && cardContainer) {
    cardContainer.appendChild(placeholderTemplate.content.cloneNode(true));
  }

  const { judokaData, gokyoData, error: preloadError } = await preloadRandomCardData();
  const dataLoaded = !preloadError;
  const historyManager = createHistoryManager();
  const { historyPanel, historyList, toggleHistoryBtn } = buildHistoryPanel(prefersReducedMotion);

  const cardSection = document.querySelector(".card-section");
  const drawButton = createDrawButton();
  cardSection.appendChild(drawButton);

  const onSelect = (j) => addToHistory(historyManager, historyList, j);

  drawButton.addEventListener("click", () =>
    displayCard({
      dataLoaded,
      drawButton,
      cachedJudokaData: judokaData,
      cachedGokyoData: gokyoData,
      prefersReducedMotion,
      onSelect
    })
  );

  toggleHistoryBtn.addEventListener("click", () => toggleHistory(historyPanel, toggleHistoryBtn));

  featureFlagsEmitter.addEventListener("change", () => {
    toggleInspectorPanels(isEnabled("enableCardInspector"));
    toggleViewportSimulation(isEnabled("viewportSimulation"));
    toggleTooltipOverlayDebug(isEnabled("tooltipOverlayDebug"));
  });

  if (!dataLoaded) {
    showError("Unable to load judoka data. Please try again later.");
    drawButton.disabled = true;
    drawButton.setAttribute("aria-disabled", "true");
  }
  initTooltips();
}

onDomReady(setupRandomJudokaPage);
