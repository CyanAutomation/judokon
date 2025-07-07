import { loadSettings, updateSetting } from "./settingsUtils.js";
import { fetchDataWithErrorHandling } from "./dataUtils.js";
import { DATA_DIR } from "./constants.js";

/**
 * Display a temporary popup when a settings update fails.
 *
 * @pseudocode
 * 1. Remove any existing popup element with the `.settings-error-popup` class.
 * 2. Create a new div with that class containing an error message.
 * 3. Append the div to `document.body`.
 * 4. Add a `.show` class so CSS can fade it in.
 * 5. Remove the `.show` class after 1.8 seconds to fade it out.
 * 6. Remove the popup after 2 seconds.
 */
export function showSettingsError() {
  const existing = document.querySelector(".settings-error-popup");
  existing?.remove();
  const popup = document.createElement("div");
  popup.className = "settings-error-popup";
  popup.setAttribute("role", "alert");
  popup.setAttribute("aria-live", "assertive");
  popup.textContent = "Failed to update settings.";
  document.body.appendChild(popup);
  requestAnimationFrame(() => {
    popup.classList.add("show");
  });
  setTimeout(() => popup.classList.remove("show"), 1800);
  setTimeout(() => popup.remove(), 2000);
}

function applyInputState(element, value) {
  if (!element) return;
  if (element.type === "checkbox") {
    element.checked = Boolean(value);
  } else {
    element.value = value;
  }
}

function initializeControls(settings, gameModes) {
  let currentSettings = { ...settings };

  const soundToggle = document.getElementById("sound-toggle");
  const navToggle = document.getElementById("navmap-toggle");
  const motionToggle = document.getElementById("motion-toggle");
  const displaySelect = document.getElementById("display-mode-select");
  const modesContainer = document.getElementById("game-mode-toggle-container");

  applyInputState(soundToggle, currentSettings.sound);
  applyInputState(navToggle, currentSettings.fullNavMap);
  applyInputState(motionToggle, currentSettings.motionEffects);
  applyInputState(displaySelect, currentSettings.displayMode);

  function handleUpdate(key, value, revert) {
    updateSetting(key, value)
      .then((updated) => {
        currentSettings = updated;
      })
      .catch((err) => {
        console.error("Failed to update setting", err);
        revert();
        showSettingsError();
      });
  }

  soundToggle?.addEventListener("change", () => {
    const prev = !soundToggle.checked; // previous state
    handleUpdate("sound", soundToggle.checked, () => {
      soundToggle.checked = prev;
    });
  });

  navToggle?.addEventListener("change", () => {
    const prev = !navToggle.checked;
    handleUpdate("fullNavMap", navToggle.checked, () => {
      navToggle.checked = prev;
    });
  });

  motionToggle?.addEventListener("change", () => {
    const prev = !motionToggle.checked;
    handleUpdate("motionEffects", motionToggle.checked, () => {
      motionToggle.checked = prev;
    });
  });

  displaySelect?.addEventListener("change", () => {
    const previous = currentSettings.displayMode;
    handleUpdate("displayMode", displaySelect.value, () => {
      displaySelect.value = previous;
    });
  });

  if (modesContainer && Array.isArray(gameModes)) {
    const mainModes = gameModes.filter((m) => m.category === "mainMenu");
    mainModes.forEach((mode) => {
      const label = document.createElement("label");
      label.className = "settings-item";
      const input = document.createElement("input");
      input.type = "checkbox";
      input.id = `mode-${mode.id}`;
      input.checked = currentSettings.gameModes[mode.id] !== false;
      const span = document.createElement("span");
      span.textContent = mode.name;
      label.appendChild(input);
      label.appendChild(span);
      modesContainer.appendChild(label);

      input.addEventListener("change", () => {
        const prev = !input.checked;
        const updated = {
          ...currentSettings.gameModes,
          [mode.id]: input.checked
        };
        handleUpdate("gameModes", updated, () => {
          input.checked = prev;
        });
      });
    });
  }
}

async function initializeSettingsPage() {
  try {
    const settings = await loadSettings();
    const gameModes = await fetchDataWithErrorHandling(`${DATA_DIR}gameModes.json`);
    initializeControls(settings, gameModes);
  } catch (error) {
    console.error("Error loading settings page:", error);
    showSettingsError();
  }
}

document.addEventListener("DOMContentLoaded", initializeSettingsPage);
