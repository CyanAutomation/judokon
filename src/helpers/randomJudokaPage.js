/**
 * Initialize the Random Judoka page once the DOM is ready.
 *
 * @pseudocode
 * 1. Load persisted settings and fall back to the system motion preference.
 * 2. Preload judoka and gokyo data using `fetchJson`.
 * 3. Toggle the `.simulate-viewport` class based on the stored feature flag.
 * 4. Define `displayCard` that disables the Draw button, calls `generateRandomCard` with the loaded data and
 *    the user's motion preference, then re-enables the button after animation completes.
 * 5. Create the "Draw Card!" button (min 64px height, 300px width, pill shape, ARIA attributes) and Animation/Sound toggles.
 * 6. Attach event listeners to persist toggle changes, update motion classes, and handle accessibility.
 * 7. If data fails to load, disable the Draw button and show an error message or fallback card.
 * 8. Use `onDomReady` to execute setup when the DOM content is loaded.
 *
 * @see design/productRequirementsDocuments/prdRandomJudoka.md
 * @see design/productRequirementsDocuments/prdDrawRandomCard.md
 */
import { fetchJson } from "./dataUtils.js";
import { generateRandomCard } from "./randomCard.js";
import { toggleInspectorPanels } from "./cardUtils.js";
import { DATA_DIR } from "./constants.js";
import { createButton } from "../components/Button.js";
import { createToggleSwitch } from "../components/ToggleSwitch.js";
import { loadSettings, updateSetting } from "./settingsUtils.js";
import { applyMotionPreference } from "./motionUtils.js";
import { onDomReady } from "./domReady.js";
import { initTooltips } from "./tooltip.js";
import { toggleViewportSimulation } from "./viewportDebug.js";

const DRAW_ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="m600-200-56-57 143-143H300q-75 0-127.5-52.5T120-580q0-75 52.5-127.5T300-760h20v80h-20q-42 0-71 29t-29 71q0 42 29 71t71 29h387L544-624l56-56 240 240-240 240Z"/></svg>';

export async function setupRandomJudokaPage() {
  let settings;
  try {
    settings = await loadSettings();
  } catch (err) {
    console.error("Error loading settings:", err);
    settings = {
      sound: false,
      motionEffects: !window.matchMedia("(prefers-reduced-motion: reduce)").matches
    };
  }

  applyMotionPreference(settings.motionEffects);
  toggleViewportSimulation(Boolean(settings.featureFlags.viewportSimulation?.enabled));
  toggleInspectorPanels(Boolean(settings.featureFlags?.enableCardInspector?.enabled));
  const prefersReducedMotion =
    !settings.motionEffects || window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let cachedJudokaData = null;
  let cachedGokyoData = null;
  let dataLoaded = false;

  async function preloadData() {
    try {
      cachedJudokaData = await fetchJson(`${DATA_DIR}judoka.json`);
      cachedGokyoData = await fetchJson(`${DATA_DIR}gokyo.json`);
      dataLoaded = true;
    } catch (error) {
      console.error("Error preloading data:", error);
      dataLoaded = false;
    }
  }

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

  async function displayCard() {
    if (!dataLoaded) {
      showError("Unable to load judoka data. Please try again later.");
      drawButton.disabled = true;
      drawButton.setAttribute("aria-disabled", "true");
      return;
    }
    drawButton.disabled = true;
    drawButton.setAttribute("aria-disabled", "true");
    drawButton.classList.add("is-loading");
    // Remove error message if present
    const errorEl = document.getElementById("draw-error-message");
    if (errorEl) errorEl.textContent = "";
    const cardContainer = document.getElementById("card-container");
    await generateRandomCard(
      cachedJudokaData,
      cachedGokyoData,
      cardContainer,
      prefersReducedMotion,
      undefined,
      {
        enableInspector: settings.featureFlags.enableCardInspector.enabled
      }
    );
    // Wait for animation to finish (max 500ms), then re-enable button
    setTimeout(
      () => {
        drawButton.disabled = false;
        drawButton.removeAttribute("aria-disabled");
        drawButton.classList.remove("is-loading");
      },
      prefersReducedMotion ? 0 : 500
    );
  }

  await preloadData();

  const cardSection = document.querySelector(".card-section");
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

  // Animation and Sound toggles
  const animationToggle = createToggleSwitch("Animation", {
    id: "animation-toggle",
    checked: settings.motionEffects,
    ariaLabel: "Animation"
  });
  const soundToggle = createToggleSwitch("Sound", {
    id: "sound-toggle",
    checked: settings.sound,
    ariaLabel: "Sound"
  });
  animationToggle.style.marginTop = "24px";
  soundToggle.style.marginLeft = "16px";
  cardSection.append(animationToggle, soundToggle);

  window.addEventListener("storage", (e) => {
    if (e.key === "settings" && e.newValue) {
      try {
        const s = JSON.parse(e.newValue);
        toggleInspectorPanels(Boolean(s.featureFlags?.enableCardInspector?.enabled));
        toggleViewportSimulation(Boolean(s.featureFlags?.viewportSimulation?.enabled));
      } catch {}
    }
  });

  animationToggle.querySelector("input")?.addEventListener("change", (e) => {
    const value = e.currentTarget.checked;
    applyMotionPreference(value);
    updateSetting("motionEffects", value).catch(() => {
      e.currentTarget.checked = !value;
      applyMotionPreference(!value);
    });
  });

  soundToggle.querySelector("input")?.addEventListener("change", (e) => {
    const value = e.currentTarget.checked;
    updateSetting("sound", value).catch(() => {
      e.currentTarget.checked = !value;
    });
  });

  // Initial state: show card if data loaded, else show error
  if (dataLoaded) {
    displayCard();
  } else {
    showError("Unable to load judoka data. Please try again later.");
    drawButton.disabled = true;
    drawButton.setAttribute("aria-disabled", "true");
  }
  initTooltips();
}

onDomReady(setupRandomJudokaPage);
