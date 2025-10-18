/**
 * Sets up the Random Judoka page, including loading data, initializing UI components,
 * and binding event handlers.
 *
 * @summary This asynchronous function orchestrates the entire setup process for
 * the random judoka card drawing feature, ensuring data is loaded, UI is
 * responsive, and accessibility features are in place.
 *
 * @pseudocode
 * 1. Initialize feature flag state and determine `prefersReducedMotion`.
 * 2. Append a card placeholder template to the `#card-container`.
 * 3. Preload judoka and gokyo data using `preloadRandomCardData()`.
 * 4. Create a `historyManager` to track drawn cards.
 * 5. Build the slide-out history panel and its toggle button using `buildHistoryPanel()`.
 * 6. Create the main "Draw Card!" button using `createDrawButton()` and append it to the `.card-section`.
 * 7. Define the `onSelect` callback to add drawn judoka to the history manager.
 * 8. Attach a `click` event listener to the "Draw Card!" button that calls `displayCard()` when clicked.
 * 9. Attach a `change` event listener to `featureFlagsEmitter` to update UI based on feature flag changes (e.g., inspector panels, tooltip overlay debug).
 * 10. If data preloading failed, disable the "Draw Card!" button and display an error message.
 * 11. Initialize all tooltips on the page using `initTooltips()`.
 *
 * @returns {Promise<void>} A promise that resolves when the page setup is complete.
 */
import { generateRandomCard, loadGokyoLookup, renderJudokaCard } from "./randomCard.js";
import { toggleInspectorPanels } from "./cardUtils.js";
import { createButton } from "../components/Button.js";
import { applyMotionPreference } from "./motionUtils.js";
import { onDomReady } from "./domReady.js";
import { initTooltips } from "./tooltip.js";
import { toggleTooltipOverlayDebug } from "./tooltipOverlayDebug.js";
import { setTestMode } from "./testModeUtils.js";
import { initFeatureFlags, isEnabled, featureFlagsEmitter } from "./featureFlags.js";
import { preloadRandomCardData, createHistoryManager } from "./randomCardService.js";
import { getFallbackJudoka } from "./judokaUtils.js";
import { showSnackbar } from "./showSnackbar.js";

const DRAW_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="m600-200-56-57 143-143H300q-75 0-127.5-52.5T120-580q0-75 52.5-127.5T300-760h20v80h-20q-42 0-71 29t-29 71q0 42 29 71t71 29h387L544-624l56-56 240 240-240 240Z"/></svg>';

/**
 * Initialize feature flag state and apply motion/viewport preferences.
 *
 * @pseudocode
 * 1. Initialize feature flags and load persisted settings.
 * 2. Derive `prefersReducedMotion` and apply motion preferences.
 * 3. Toggle inspector panels and tooltip overlays.
 * 4. Return an object with `prefersReducedMotion` for callers.
 *
 * @returns {Promise<{prefersReducedMotion: boolean}>}
 */
export async function initFeatureFlagState() {
  const hasMatchMedia = typeof window !== "undefined" && typeof window.matchMedia === "function";
  let settings;
  try {
    settings = await initFeatureFlags();
  } catch (err) {
    console.error("Error loading settings:", err);
    settings = {
      motionEffects: hasMatchMedia
        ? !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : true,
      featureFlags: {
        enableCardInspector: { enabled: false },
        tooltipOverlayDebug: { enabled: false }
      }
    };
  }

  setTestMode(isEnabled("enableTestMode"));
  applyMotionPreference(settings.motionEffects);
  toggleInspectorPanels(isEnabled("enableCardInspector"));
  toggleTooltipOverlayDebug(isEnabled("tooltipOverlayDebug"));

  const prefersReducedMotion =
    !settings.motionEffects ||
    (hasMatchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  return { prefersReducedMotion };
}

/**
 * Build a slide-out history panel for previously drawn cards.
 *
 * @pseudocode
 * 1. Create toggle button and a fixed-position aside element.
 * 2. Populate the panel with a title and empty list container.
 * 3. Append the panel to the document body and return UI handles.
 *
 * @param {boolean} prefersReducedMotion
 * @returns {{historyPanel: HTMLElement, historyList: HTMLElement, toggleHistoryBtn: HTMLElement}}
 */
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
  historyTitle.setAttribute("tabindex", "-1");
  const historyList = document.createElement("ul");
  historyPanel.append(historyTitle, historyList);
  document.body.appendChild(historyPanel);

  return { historyPanel, historyList, toggleHistoryBtn };
}

/**
 * Create the primary Draw button used on the Random Judoka page.
 *
 * @pseudocode
 * 1. Build a large, accessible button with an icon and ARIA attributes.
 * 2. Apply size, role, and test hooks for UI automation.
 * 3. Return the constructed button element.
 *
 * @returns {HTMLElement}
 */
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

/**
 * Update the draw button's label text while supporting legacy markup structures.
 *
 * @summary Attempts to update the nested `.button-label` element when present,
 * otherwise falls back to updating the button element directly.
 * @pseudocode
 * 1. If `drawButton` is nullish, return early.
 * 2. Query for a child element with the `.button-label` selector.
 * 3. If found, update the child's `textContent`.
 * 4. Otherwise, update the button's `textContent`.
 *
 * @param {HTMLElement | null | undefined} drawButton - The draw button element to update.
 * @param {string} text - The new text content for the button.
 */
function updateDrawButtonLabel(drawButton, text) {
  if (!drawButton) return;
  const label = drawButton.querySelector?.(".button-label");
  if (label) {
    label.textContent = text;
  } else {
    drawButton.textContent = text;
  }
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
    if (!cardSection) {
      console.warn("showError: .card-section element not found; skipping error display.");
      return;
    }
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

/**
 * Toggles the history panel visibility and manages keyboard focus and Escape key handling.
 *
 * @summary Opens/closes the history panel and manages focus:
 * - When opening: moves focus to the history title (h2)
 * - When closing: returns focus to the toggle button
 * - Attaches/detaches Escape key handler to close the panel
 *
 * @pseudocode
 * 1. Determine current panel state from aria-hidden attribute
 * 2. Compute nextOpen as the inverse of current state
 * 3. Update panel visibility: transform and aria-hidden
 * 4. Update button state: aria-expanded
 * 5. If opening (nextOpen === true):
 *    a. Find the h2 (history title) inside the panel
 *    b. Move focus to the h2 using focus()
 *    c. Attach Escape key listener to close panel and restore focus
 * 6. If closing (nextOpen === false):
 *    a. Remove Escape key listener
 *    b. Return focus to toggleHistoryBtn
 *
 * @param {HTMLElement} historyPanel - The panel element
 * @param {HTMLElement} toggleHistoryBtn - The toggle button element
 */
function toggleHistory(historyPanel, toggleHistoryBtn) {
  const isOpen = historyPanel.getAttribute("aria-hidden") === "false";
  const nextOpen = !isOpen;
  historyPanel.style.transform = nextOpen ? "translateX(0)" : "translateX(100%)";
  historyPanel.setAttribute("aria-hidden", String(!nextOpen));
  toggleHistoryBtn.setAttribute("aria-expanded", String(nextOpen));

  if (nextOpen) {
    // Panel is opening: move focus into the panel
    const historyTitle = historyPanel.querySelector("h2");
    if (historyTitle) {
      // Use a microtask to ensure the DOM is settled before focusing
      Promise.resolve().then(() => {
        historyTitle.focus();
      });
    }

    // Attach Escape key handler to close the panel
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        toggleHistory(historyPanel, toggleHistoryBtn);
      }
    };

    // Store the handler reference on the button so we can remove it later
    toggleHistoryBtn._historyEscapeHandler = handleEscape;
    document.addEventListener("keydown", handleEscape);
  } else {
    // Panel is closing: remove Escape handler and restore focus to button
    const handleEscape = toggleHistoryBtn._historyEscapeHandler;
    if (handleEscape) {
      document.removeEventListener("keydown", handleEscape);
      delete toggleHistoryBtn._historyEscapeHandler;
    }

    // Return focus to the toggle button
    toggleHistoryBtn.focus();
  }
}

function getHistoryPanelTransition(prefersReducedMotion) {
  return prefersReducedMotion ? "transform 0.01s linear" : "transform 0.3s ease";
}

function announceCard(judokaName) {
  const announcer = document.getElementById("card-announcer");
  if (announcer) {
    announcer.textContent = `New card drawn: ${judokaName}`;
  }
}

async function displayCard({
  dataLoaded,
  drawButton,
  cachedJudokaData,
  cachedGokyoData,
  prefersReducedMotion,
  onSelect,
  timers,
  fallbackDelayMs = 2000
}) {
  return new Promise(async (resolve) => {
    let resolved = false;
    const settle = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };
    if (!dataLoaded) {
      showError("Unable to load judoka data. Please try again later.");
      drawButton.disabled = true;
      drawButton.setAttribute("aria-disabled", "true");
      settle();
      return;
    }
    drawButton.disabled = true;
    drawButton.setAttribute("aria-disabled", "true");
    drawButton.classList.add("is-loading");
    updateDrawButtonLabel(drawButton, "Drawing…");
    drawButton.setAttribute("aria-busy", "true");
    const errorEl = document.getElementById("draw-error-message");
    if (errorEl) errorEl.textContent = "";
    const cardContainer = document.getElementById("card-container");
    function enableButton() {
      drawButton.disabled = false;
      drawButton.removeAttribute("aria-disabled");
      drawButton.classList.remove("is-loading");
      updateDrawButtonLabel(drawButton, "Draw Card!");
      drawButton.removeAttribute("aria-busy");
      settle();
    }
    if (!cardContainer) {
      showError("Card area missing. Please refresh the page.");
      enableButton();
      return;
    }
    let announcedJudoka;
    try {
      announcedJudoka = await generateRandomCard(
        cachedJudokaData,
        cachedGokyoData,
        cardContainer,
        prefersReducedMotion,
        onSelect,
        { enableInspector: isEnabled("enableCardInspector") }
      );
    } catch (err) {
      console.error("Error generating card:", err);
      const fallbackJudoka = await getFallbackJudoka();
      announcedJudoka = fallbackJudoka;
      if (typeof onSelect === "function") {
        onSelect(fallbackJudoka);
      }
      const gokyoLookup = await loadGokyoLookup(cachedGokyoData);
      await renderJudokaCard(
        fallbackJudoka,
        gokyoLookup,
        cardContainer,
        prefersReducedMotion,
        isEnabled("enableCardInspector")
      );
      showSnackbar("Unable to draw a new card. Showing a fallback.");
      announceCard(fallbackJudoka.name);
      enableButton();
      return;
    }
    const cardEl = cardContainer.querySelector(".card-container");
    if (announcedJudoka && cardEl) {
      announceCard(announcedJudoka.name);
    }
    if (prefersReducedMotion) {
      enableButton();
    } else {
      if (!cardEl) {
        enableButton();
        globalThis.requestAnimationFrame?.(() => {
          if (drawButton.disabled) {
            enableButton();
          }
        });
        return;
      } else {
        const {
          setTimeout: set = globalThis.setTimeout,
          clearTimeout: clear = globalThis.clearTimeout
        } = timers || globalThis;
        const onEnd = () => {
          cardEl.removeEventListener("animationend", onEnd);
          clear(fallbackId);
          enableButton();
        };
        cardEl.addEventListener("animationend", onEnd);
        const fallbackId = set(() => {
          cardEl.removeEventListener("animationend", onEnd);
          enableButton();
        }, fallbackDelayMs);
      }
    }
  });
}

/**
 * @summary TODO: Add summary
 * @pseudocode
 * 1. TODO: Add pseudocode
 */
/**
 * Set up the Random Judoka page UI and behavior.
 *
 * @summary Renders the draw button/history panel, preloads data, wires listeners,
 * and initializes tooltips and feature-flag driven panels.
 *
 * @pseudocode
 * 1. Initialize feature flags and read motion preference.
 * 2. Render placeholder, preload judoka/gokyo data and compute `dataLoaded`.
 * 3. Build history panel and draw button; wire draw click to `displayCard`.
 * 4. Wire history toggle and feature-flag-driven debug panels.
 * 5. If data failed to load, render an error and disable draw button.
 * 6. Initialize tooltips.
 *
 * @returns {Promise<void>}
 */
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

  if (typeof window !== "undefined") {
    const testApi =
      typeof window.__TEST_API === "object" && window.__TEST_API !== null
        ? window.__TEST_API
        : (window.__TEST_API = {});
    const randomJudokaApi = testApi.randomJudoka || (testApi.randomJudoka = {});
    randomJudokaApi.setDrawButtonLabel = (labelText) => {
      if (typeof labelText !== "string" || !labelText.trim()) return;
      updateDrawButtonLabel(drawButton, labelText);
    };
    /**
     * Resolves the draw pipeline for testing by triggering animation completion.
     *
     * @summary Helper function for tests to deterministically complete the card draw
     * animation and promise resolution without relying on real timers or events.
     *
     * @pseudocode
     * 1. Check if drawButton.drawPromise exists, return false if not.
     * 2. Wait for next tick with Promise.resolve().
     * 3. Find card element and dispatch animationend event to trigger completion.
     * 4. Await the draw promise to ensure full resolution.
     * 5. Return true on success, rethrow on failure.
     *
     * @returns {Promise<boolean>} Resolves to true when the draw pipeline completes.
     * @throws {Error} Re-throws if the draw pipeline rejects.
     */
    randomJudokaApi.resolveDrawPipeline = async () => {
      if (!drawButton.drawPromise) return false;

      await Promise.resolve();

      try {
        const cardContainerEl = document.getElementById("card-container");
        const cardEl = cardContainerEl?.querySelector(".card-container");
        if (cardEl) {
          cardEl.dispatchEvent(new Event("animationend"));
        }
      } catch (error) {
        console.warn("resolveDrawPipeline: Failed to dispatch animationend event:", error);
      }

      try {
        await drawButton.drawPromise;
        return true;
      } catch (error) {
        console.warn("resolveDrawPipeline: Draw promise rejected:", error);
        throw error;
      }
    };
  }

  const onSelect = (j) => addToHistory(historyManager, historyList, j);

  drawButton.addEventListener("click", () => {
    const delay =
      typeof drawButton.fallbackDelayMs === "number" ? drawButton.fallbackDelayMs : undefined;
    drawButton.drawPromise = displayCard({
      dataLoaded,
      drawButton,
      cachedJudokaData: judokaData,
      cachedGokyoData: gokyoData,
      prefersReducedMotion,
      onSelect,
      timers: drawButton.timers,
      fallbackDelayMs: delay
    });
  });

  toggleHistoryBtn.addEventListener("click", () => toggleHistory(historyPanel, toggleHistoryBtn));

  featureFlagsEmitter.addEventListener("change", () => {
    toggleInspectorPanels(isEnabled("enableCardInspector"));
    toggleTooltipOverlayDebug(isEnabled("tooltipOverlayDebug"));
  });

  if (!dataLoaded) {
    showError("Unable to load judoka data. Please try again later.");
    drawButton.disabled = true;
    drawButton.setAttribute("aria-disabled", "true");
  }
  initTooltips();
}

/**
 * Initialize the Random Judoka page.
 *
 * @summary Boots the page by setting up UI/data and waiting for navigation.
 * @returns {Promise<void>}
 * @pseudocode
 * setup ← setupRandomJudokaPage()
 * nav ← window.navReadyPromise || Promise.resolve()
 * await Promise.all([setup, nav])
 */
export async function initRandomJudokaPage() {
  const setup = setupRandomJudokaPage();
  let nav = Promise.resolve();
  try {
    const maybe = typeof window !== "undefined" ? window.navReadyPromise : null;
    if (maybe && typeof maybe.then === "function") nav = maybe;
  } catch {}
  await Promise.all([setup, nav.catch?.(() => {}) || nav]);
}
/**
 * Initializes the Random Judoka page after the DOM is ready and navigation
 * is prepared.
 *
 * @summary This function serves as the primary entry point for bootstrapping
 * the Random Judoka page, ensuring all necessary components are set up
 * before user interaction.
 *
 * @pseudocode
 * 1. Await the completion of two promises in parallel:
 *    a. `setupRandomJudokaPage()`: This sets up the core UI and data for the page.
 *    b. `window.navReadyPromise`: This ensures that the main navigation system is ready.
 * 2. The function resolves once both of these setup processes are complete.
 *
 * @returns {Promise<void>} A promise that resolves when the Random Judoka page is fully initialized and ready.
 */
/**
 * A promise that resolves when the Random Judoka page is fully initialized and ready for interaction.
 *
 * @summary This promise provides a reliable signal for external scripts or tests
 * to know when the Random Judoka page's DOM is ready, data is loaded, and UI
 * components are set up.
 *
 * @pseudocode
 * 1. Create a new `Promise` and capture its `resolve` function.
 * 2. Use `onDomReady()` to ensure the callback executes only after the DOM is fully loaded.
 * 3. Inside the `onDomReady` callback, call `initRandomJudokaPage()` and await its completion.
 * 4. Once `initRandomJudokaPage()` resolves:
 *    a. Set the `data-random-judoka-ready` attribute on `document.body` to `true`.
 *    b. Dispatch a custom `random-judoka-ready` event on `document` (with bubbling).
 *    c. Resolve the `randomJudokaReadyPromise`.
 *
 * @type {Promise<void>}
 * @param {(value?: void) => void} resolve - Internal resolver for readiness.
 * @returns {Promise<void>}
 */
export const randomJudokaReadyPromise = new Promise((resolve) => {
  onDomReady(() => {
    initRandomJudokaPage().then(() => {
      document.body?.setAttribute("data-random-judoka-ready", "true");
      document.dispatchEvent(new CustomEvent("random-judoka-ready", { bubbles: true }));
      resolve();
    });
  });
});
