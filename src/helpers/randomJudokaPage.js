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
import { applyMotionPreference, shouldReduceMotionSync } from "./motionUtils.js";
import { onDomReady } from "./domReady.js";
import { initTooltips } from "./tooltip.js";
import { toggleTooltipOverlayDebug } from "./tooltipOverlayDebug.js";
import { setTestMode } from "./testModeUtils.js";
import { initFeatureFlags, isEnabled, featureFlagsEmitter } from "./featureFlags.js";
import { preloadRandomCardData, createHistoryManager } from "./randomCardService.js";
import { getFallbackJudoka } from "./judokaUtils.js";
import { showSnackbar } from "./showSnackbar.js";
import { createDrawCardStateMachine, updateDrawButtonLabel } from "./drawCardStateMachine.js";
import { getSetting, setCachedSettings } from "./settingsCache.js";
import { DEFAULT_SETTINGS } from "../config/settingsDefaults.js";

const historyTogglePlacementRegistry = new WeakMap();
let randomJudokaPageInitialized = false;
let randomJudokaInitPromise = null;

function signalRandomJudokaReady(resolve) {
  if (document.body?.getAttribute("data-random-judoka-ready") !== "true") {
    document.body?.setAttribute("data-random-judoka-ready", "true");
    document.dispatchEvent(new CustomEvent("random-judoka-ready", { bubbles: true }));
  }
  resolve();
}

/**
 * Floats the history toggle button inside the dialog panel to keep it accessible.
 *
 * @pseudocode
 * 1. Look up the placement registration for the provided dialog.
 * 2. Mirror the toggle button's size on the placeholder and reveal it.
 * 3. Absolutely position the toggle button inside the dialog using calculated offsets.
 * 4. Append the toggle button into the dialog so it remains clickable.
 *
 * @param {HTMLDialogElement} historyPanel - The dialog panel element.
 * @param {HTMLElement} toggleHistoryBtn - The toggle button to float.
 */
function floatHistoryToggleButton(historyPanel, toggleHistoryBtn) {
  const placement = historyTogglePlacementRegistry.get(historyPanel);
  if (!placement) {
    return;
  }

  const rect = toggleHistoryBtn.getBoundingClientRect();
  const panelRect = historyPanel.getBoundingClientRect();
  const offsetTop = rect.top - panelRect.top;
  const offsetLeft = rect.left - panelRect.left;

  placement.placeholder.style.display = "inline-block";
  placement.placeholder.style.width = `${rect.width}px`;
  placement.placeholder.style.height = `${rect.height}px`;

  toggleHistoryBtn.dataset.historyToggleFloating = "true";
  toggleHistoryBtn.style.position = "absolute";
  toggleHistoryBtn.style.top = `${offsetTop}px`;
  toggleHistoryBtn.style.left = `${offsetLeft}px`;
  toggleHistoryBtn.style.width = `${rect.width}px`;
  toggleHistoryBtn.style.height = `${rect.height}px`;
  toggleHistoryBtn.style.zIndex = "var(--z-index-floating-toggle, 101)";

  historyPanel.appendChild(toggleHistoryBtn);
}

/**
 * Restores the history toggle button to its original position.
 *
 * @pseudocode
 * 1. Ensure the toggle button is currently floated.
 * 2. Retrieve the placeholder that marks the original position.
 * 3. Hide the placeholder and move the toggle button back before it.
 * 4. Clear the positioning styles and floating metadata on the toggle button.
 *
 * @param {HTMLDialogElement} historyPanel - The dialog panel element.
 * @param {HTMLElement} toggleHistoryBtn - The toggle button to restore.
 */
function restoreHistoryToggleButton(historyPanel, toggleHistoryBtn) {
  if (toggleHistoryBtn.dataset.historyToggleFloating !== "true") {
    return;
  }

  const placement = historyTogglePlacementRegistry.get(historyPanel);
  if (!placement?.placeholder?.parentElement) {
    return;
  }

  placement.placeholder.style.display = "none";
  placement.placeholder.style.width = "";
  placement.placeholder.style.height = "";

  placement.placeholder.parentElement.insertBefore(toggleHistoryBtn, placement.placeholder);

  toggleHistoryBtn.style.position = "";
  toggleHistoryBtn.style.top = "";
  toggleHistoryBtn.style.left = "";
  toggleHistoryBtn.style.width = "";
  toggleHistoryBtn.style.height = "";
  toggleHistoryBtn.style.zIndex = "";
  delete toggleHistoryBtn.dataset.historyToggleFloating;
}

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
      sound: true,
      motionEffects: hasMatchMedia
        ? !window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : true,
      featureFlags: {
        enableTestMode: { enabled: false },
        enableCardInspector: { enabled: false },
        tooltipOverlayDebug: { enabled: false }
      }
    };
    try {
      setCachedSettings(settings);
    } catch (cacheError) {
      // Ignore cache hydration errors to preserve fallback behaviour.
      console.warn("Failed to cache fallback settings:", cacheError);
    }
  }

  const resolveInitialFlagEnabled = (flag) => {
    try {
      const overrides =
        typeof window !== "undefined" && window && typeof window.__FF_OVERRIDES === "object"
          ? window.__FF_OVERRIDES
          : null;
      if (overrides && Object.prototype.hasOwnProperty.call(overrides, flag)) {
        return !!overrides[flag];
      }
    } catch {}

    const flagEntry = settings?.featureFlags?.[flag];
    if (flagEntry && typeof flagEntry === "object" && "enabled" in flagEntry) {
      return !!flagEntry.enabled;
    }

    return DEFAULT_SETTINGS.featureFlags?.[flag]?.enabled ?? false;
  };

  setTestMode(resolveInitialFlagEnabled("enableTestMode"));
  applyMotionPreference(settings.motionEffects);
  toggleInspectorPanels(resolveInitialFlagEnabled("enableCardInspector"));
  toggleTooltipOverlayDebug(resolveInitialFlagEnabled("tooltipOverlayDebug"));

  const prefersReducedMotion =
    !settings.motionEffects ||
    (hasMatchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const soundEnabled = settings.sound !== false;
  return { prefersReducedMotion, soundEnabled };
}

/**
 * Build a slide-out history panel for previously drawn cards.
 *
 * @pseudocode
 * 1. Create toggle button and an off-canvas dialog element.
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
  toggleHistoryBtn.setAttribute("aria-haspopup", "dialog");
  cardSection.appendChild(toggleHistoryBtn);
  const togglePlaceholder = document.createElement("span");
  togglePlaceholder.dataset.historyTogglePlaceholder = "true";
  togglePlaceholder.style.display = "none";
  toggleHistoryBtn.after(togglePlaceholder);

  const historyPanel = document.createElement("dialog");
  historyPanel.id = "history-panel";
  historyPanel.setAttribute("aria-labelledby", "history-panel-title");
  historyPanel.setAttribute("aria-hidden", "true");
  historyPanel.classList.add("history-panel");

  const supportsNativeDialog = typeof historyPanel.showModal === "function";
  historyPanel.dataset.supportsNativeDialog = supportsNativeDialog ? "true" : "false";
  historyTogglePlacementRegistry.set(historyPanel, {
    placeholder: togglePlaceholder
  });

  if (!supportsNativeDialog) {
    historyPanel.open = false;
    historyPanel.returnValue = "";

    historyPanel.showModal = () => {
      if (historyPanel.open) {
        return;
      }
      historyPanel.open = true;
      historyPanel.returnValue = "";
      historyPanel.setAttribute("open", "");
      historyPanel.setAttribute("aria-hidden", "false");
    };
    historyPanel.close = (returnValue = "") => {
      if (!historyPanel.open) {
        return;
      }
      historyPanel.returnValue = returnValue;
      historyPanel.open = false;
      historyPanel.removeAttribute("open");
      historyPanel.setAttribute("aria-hidden", "true");
      historyPanel.dispatchEvent(new Event("close"));
    };
  }

  if (prefersReducedMotion) {
    historyPanel.classList.add("history-panel--reduced-motion");
  }

  const historyTitle = document.createElement("h2");
  historyTitle.id = "history-panel-title";
  historyTitle.textContent = "History";
  historyTitle.setAttribute("tabindex", "-1");
  const historyList = document.createElement("ul");
  historyPanel.append(historyTitle, historyList);
  document.body.appendChild(historyPanel);

  historyPanel.addEventListener("cancel", (event) => {
    if (event.defaultPrevented) {
      event.preventDefault();
      return;
    }

    if (!supportsNativeDialog) {
      event.preventDefault();
      historyPanel.close();
    }
  });

  historyPanel.addEventListener("close", () => {
    toggleHistoryBtn.setAttribute("aria-expanded", "false");
    if (historyPanel.dataset.supportsNativeDialog === "true") {
      historyPanel.setAttribute("aria-hidden", "true");
    }
    restoreHistoryToggleButton(historyPanel, toggleHistoryBtn);
    runMicrotask(() => {
      toggleHistoryBtn.focus();
    });
  });

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

/**
 * Schedules a callback to run during the next microtask tick.
 *
 * @pseudocode
 * 1. If `queueMicrotask` is available, use it to enqueue the callback.
 * 2. Otherwise, resolve a promise and chain the callback via `.then()`.
 *
 * @param {() => void} callback - The function to invoke on the next microtask.
 */
function runMicrotask(callback) {
  if (typeof queueMicrotask === "function") {
    queueMicrotask(callback);
    return;
  }

  Promise.resolve().then(callback);
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
 * Toggles the history panel dialog and coordinates focus management.
 *
 * @summary Uses the dialog API to show/hide the history drawer and
 * ensures the heading receives focus on open.
 *
 * @pseudocode
 * 1. If the dialog is closed:
 *    a. Set `aria-expanded` on the toggle button to "true".
 *    b. Call `showModal()` on the dialog.
 *    c. Queue a microtask to focus the history heading.
 * 2. Otherwise call `close()` to hide the dialog.
 *
 * @param {HTMLDialogElement} historyPanel - The panel dialog element
 * @param {HTMLElement} toggleHistoryBtn - The toggle button element
 */
function toggleHistory(historyPanel, toggleHistoryBtn) {
  if (!historyPanel.open) {
    toggleHistoryBtn.setAttribute("aria-expanded", "true");
    historyPanel.showModal();
    if (historyPanel.dataset.supportsNativeDialog === "true") {
      historyPanel.setAttribute("aria-hidden", "false");
    }
    if (historyTogglePlacementRegistry.has(historyPanel)) {
      floatHistoryToggleButton(historyPanel, toggleHistoryBtn);
    }

    const historyTitle = historyPanel.querySelector("h2");
    if (historyTitle) {
      runMicrotask(() => {
        historyTitle.focus();
      });
    }
  } else {
    historyPanel.close();
  }
}

function announceCard(message) {
  const announcer = document.getElementById("card-announcer");
  if (announcer) {
    announcer.textContent = message;
  }
}

function announceJudoka(judoka) {
  if (!judoka) {
    announceCard("New card drawn");
    return;
  }

  const fullName = [judoka.firstname, judoka.surname].filter(Boolean).join(" ").trim();
  const fallbackName = judoka.name || judoka.codename || judoka.nickname || "";
  const subject = fullName || fallbackName;
  const message = subject ? `New card drawn: ${subject}` : "New card drawn";
  announceCard(message);
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
  const stateMachine =
    drawButton.drawStateMachine ||
    (drawButton.drawStateMachine = createDrawCardStateMachine(drawButton));

  return new Promise(async (resolve) => {
    let resolved = false;
    const settle = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    // Handle data loading failure
    if (!dataLoaded) {
      showError("Unable to load judoka data. Please try again later.");
      settle();
      return;
    }

    // Transition to DRAWING state
    stateMachine.transition("DRAWING");
    announceCard("Drawing card…");
    const errorEl = document.getElementById("draw-error-message");
    if (errorEl) errorEl.textContent = "";
    const cardContainer = document.getElementById("card-container");

    if (!cardContainer) {
      showError("Card area missing. Please refresh the page.");
      stateMachine.transition("ERROR");
      stateMachine.transition("IDLE");
      settle();
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
      stateMachine.transition("SUCCESS");
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
      stateMachine.transition("ERROR");
    }

    // Announce the card to screen readers
    if (announcedJudoka) {
      announceJudoka(announcedJudoka);
    }

    // Handle animation and button re-enabling
    const cardEl = cardContainer.querySelector(".card-container");

    if (prefersReducedMotion || stateMachine.currentState === "ERROR") {
      // No animation: transition back to IDLE immediately
      stateMachine.transition("IDLE");
      settle();
    } else if (!cardEl) {
      // Card element not found: transition to IDLE with fallback timer
      stateMachine.transition("IDLE");
      globalThis.requestAnimationFrame?.(() => {
        if (drawButton.disabled) {
          stateMachine.transition("IDLE");
        }
      });
      settle();
    } else {
      // Animation exists: wait for animationend or timeout before returning to IDLE
      const {
        setTimeout: set = globalThis.setTimeout,
        clearTimeout: clear = globalThis.clearTimeout
      } = timers || globalThis;

      const onEnd = () => {
        cardEl.removeEventListener("animationend", onEnd);
        clear(fallbackId);
        stateMachine.transition("IDLE");
        settle();
      };

      cardEl.addEventListener("animationend", onEnd);
      const fallbackId = set(() => {
        cardEl.removeEventListener("animationend", onEnd);
        stateMachine.transition("IDLE");
        settle();
      }, fallbackDelayMs);
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
  const { prefersReducedMotion, soundEnabled } = await initFeatureFlagState();
  let currentPrefersReducedMotion = prefersReducedMotion;
  let currentSoundEnabled = soundEnabled;

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
  drawButton.dataset.soundEnabled = String(currentSoundEnabled);

  if (typeof window !== "undefined") {
    const testApi =
      typeof window.__TEST_API === "object" && window.__TEST_API !== null
        ? window.__TEST_API
        : (window.__TEST_API = {});
    const randomJudokaApi = testApi.randomJudoka || (testApi.randomJudoka = {});
    randomJudokaApi.setDrawButtonLabel = (labelText) => {
      if (typeof labelText !== "string" || !labelText.trim()) return;
      drawButton.dataset.drawButtonIdleLabel = labelText;
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
    randomJudokaApi.getPreferences = () => ({
      prefersReducedMotion: currentPrefersReducedMotion,
      soundEnabled: currentSoundEnabled
    });
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
      prefersReducedMotion: currentPrefersReducedMotion,
      onSelect,
      timers: drawButton.timers,
      fallbackDelayMs: delay
    });
  });

  toggleHistoryBtn.addEventListener("click", () => toggleHistory(historyPanel, toggleHistoryBtn));

  featureFlagsEmitter.addEventListener("change", () => {
    const motionEnabled = getSetting("motionEffects") !== false;
    applyMotionPreference(motionEnabled);
    currentPrefersReducedMotion = shouldReduceMotionSync();
    currentSoundEnabled = getSetting("sound") !== false;
    drawButton.dataset.soundEnabled = String(currentSoundEnabled);
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
  if (randomJudokaPageInitialized) {
    return randomJudokaInitPromise ?? Promise.resolve();
  }

  if (randomJudokaInitPromise) {
    return randomJudokaInitPromise;
  }

  randomJudokaInitPromise = (async () => {
    const setup = setupRandomJudokaPage();
    let nav = Promise.resolve();
    try {
      const maybe = typeof window !== "undefined" ? window.navReadyPromise : null;
      if (maybe && typeof maybe.then === "function") nav = maybe;
    } catch {}

    await Promise.all([setup, nav.catch?.(() => {}) || nav]);
    randomJudokaPageInitialized = true;
  })().catch((error) => {
    randomJudokaInitPromise = null;
    randomJudokaPageInitialized = false;
    throw error;
  });

  return randomJudokaInitPromise;
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
    const initPromise = randomJudokaInitPromise ?? initRandomJudokaPage();

    (initPromise ?? Promise.resolve()).then(() => {
      signalRandomJudokaReady(resolve);
    });
  });
});
