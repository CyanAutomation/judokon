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
 * 6. Define `displayCard` that disables the Draw button, updates its text and `aria-busy` state while loading, calls
 *    `generateRandomCard` with the loaded data and the user's motion preference, updates the history list, then restores
 *    the button once the animation completes (or immediately when motion is disabled).
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
import { loadSettings } from "./settingsUtils.js";
import { applyMotionPreference } from "./motionUtils.js";
import { onDomReady } from "./domReady.js";
import { initTooltips } from "./tooltip.js";
import { toggleViewportSimulation } from "./viewportDebug.js";
import { toggleTooltipOverlayDebug } from "./tooltipOverlayDebug.js";
import { setTestMode } from "./testModeUtils.js";
import { isEnabled, featureFlagsEmitter } from "./featureFlags.js";
import { preloadRandomCardData, createHistoryManager } from "./randomCardService.js";

const DRAW_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="m600-200-56-57 143-143H300q-75 0-127.5-52.5T120-580q0-75 52.5-127.5T300-760h20v80h-20q-42 0-71 29t-29 71q0 42 29 71t71 29h387L544-624l56-56 240 240-240 240Z"/></svg>';
export async function setupRandomJudokaPage() {
  let settings;
  try {
    settings = await loadSettings();
  } catch (err) {
    console.error("Error loading settings:", err);
    // Fallback to system motion preference
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

  // Apply global motion preference
  applyMotionPreference(settings.motionEffects);
  toggleViewportSimulation(isEnabled("viewportSimulation"));
  toggleInspectorPanels(isEnabled("enableCardInspector"));
  toggleTooltipOverlayDebug(isEnabled("tooltipOverlayDebug"));
  const prefersReducedMotion =
    !settings.motionEffects || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let cachedJudokaData = null;
  let cachedGokyoData = null;
  let dataLoaded = false;
  const historyManager = createHistoryManager();
  let historyList;
  let historyPanel;
  let toggleHistoryBtn;
  let historyOpen = false;

  // Accessibility: Announce errors to screen readers
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

  function updateHistoryUI() {
    if (!historyList) return;
    historyList.innerHTML = "";
    historyManager.get().forEach((j) => {
      const li = document.createElement("li");
      li.textContent = `${j.firstname} ${j.surname}`;
      historyList.appendChild(li);
    });
  }

  function addToHistory(judoka) {
    historyManager.add(judoka);
    updateHistoryUI();
  }

  function toggleHistory() {
    historyOpen = !historyOpen;
    historyPanel.style.transform = historyOpen ? "translateX(0)" : "translateX(100%)";
    historyPanel.setAttribute("aria-hidden", String(!historyOpen));
    toggleHistoryBtn.setAttribute("aria-expanded", String(historyOpen));
  }

  async function displayCard() {
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
    // Remove error message if present
    const errorEl = document.getElementById("draw-error-message");
    if (errorEl) errorEl.textContent = "";
    const cardContainer = document.getElementById("card-container");
    await generateRandomCard(
      cachedJudokaData,
      cachedGokyoData,
      cardContainer,
      prefersReducedMotion,
      addToHistory,
      {
        enableInspector: isEnabled("enableCardInspector")
      }
    );
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

  const cardContainer = document.getElementById("card-container");
  const placeholderTemplate = document.getElementById("card-placeholder-template");
  if (placeholderTemplate && cardContainer) {
    cardContainer.appendChild(placeholderTemplate.content.cloneNode(true));
  }

  const { judokaData, gokyoData, error: preloadError } = await preloadRandomCardData();
  cachedJudokaData = judokaData;
  cachedGokyoData = gokyoData;
  dataLoaded = !preloadError;
  const cardSection = document.querySelector(".card-section");
  toggleHistoryBtn = createButton("History", {
    id: "toggle-history-btn",
    type: "button"
  });
  toggleHistoryBtn.setAttribute("aria-controls", "history-panel");
  toggleHistoryBtn.setAttribute("aria-expanded", "false");
  cardSection.appendChild(toggleHistoryBtn);
  toggleHistoryBtn.addEventListener("click", toggleHistory);

  historyPanel = document.createElement("aside");
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
  // Set transition duration based on user's motion preference
  function getHistoryPanelTransition() {
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return "transform 0.01s linear";
    }
    return "transform 0.3s ease";
  }
  historyPanel.style.transition = getHistoryPanelTransition();
  historyPanel.setAttribute("aria-hidden", "true");
  const historyTitle = document.createElement("h2");
  historyTitle.textContent = "History";
  historyList = document.createElement("ul");
  historyPanel.append(historyTitle, historyList);
  document.body.appendChild(historyPanel);

  // Draw button: min 64px height, 300px width, pill shape, ARIA attributes
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
  cardSection.appendChild(drawButton);
  drawButton.addEventListener("click", displayCard);

  featureFlagsEmitter.addEventListener("change", () => {
    toggleInspectorPanels(isEnabled("enableCardInspector"));
    toggleViewportSimulation(isEnabled("viewportSimulation"));
    toggleTooltipOverlayDebug(isEnabled("tooltipOverlayDebug"));
  });

  // Initial state: placeholder shown; disable draw button only if data failed to load
  if (!dataLoaded) {
    showError("Unable to load judoka data. Please try again later.");
    drawButton.disabled = true;
    drawButton.setAttribute("aria-disabled", "true");
  }
  initTooltips();
}

onDomReady(setupRandomJudokaPage);
