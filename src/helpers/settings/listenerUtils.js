import { applyDisplayMode } from "../displayMode.js";
import { withViewTransition } from "../viewTransition.js";
import { applyMotionPreference } from "../motionUtils.js";
import { showSnackbar } from "../showSnackbar.js";

/**
 * Attaches event listeners to various settings controls (toggles and radio buttons)
 * to handle user input, persist changes, and apply immediate UI side effects.
 *
 * @summary This function centralizes the logic for updating settings, providing
 * visual feedback and error handling for each control.
 *
 * @pseudocode
 * 1. Destructure individual control elements (e.g., `soundToggle`, `motionToggle`, `displayRadios`) from the `controls` object.
 * 2. For each toggle control (sound, motion, typewriter, tooltips, card of the day, full navigation map):
 *    a. Attach a `change` event listener.
 *    b. Inside the listener, capture the `prev` (previous) state of the toggle.
 *    c. For `motionToggle`, immediately call `applyMotionPreference()` to update the UI.
 *    d. Call `handleUpdate(settingKey, newValue, revertCallback)`:
 *       i. `settingKey` is the name of the setting (e.g., "sound", "motionEffects").
 *       ii. `newValue` is the checked state of the toggle.
 *       iii. `revertCallback` is a function that restores the UI to its `prev` state and reapplies any side effects.
 *    e. If `handleUpdate` resolves, show a snackbar confirming the change.
 *    f. If `handleUpdate` rejects, call the `revertCallback`.
 * 3. For `displayRadios` (if present):
 *    a. Iterate over each radio button and attach a `change` event listener.
 *    b. Inside the listener, if the radio is checked:
 *       i. Get the `previous` display mode from `getCurrentSettings()`.
 *       ii. Update `tabIndex` for all display radios to ensure only the checked one is tabbable.
 *       iii. Use `withViewTransition()` to apply `applyDisplayMode()` for a smooth UI transition.
 *       iv. Call `handleUpdate("displayMode", newMode, revertCallback)`:
 *           - `newMode` is the value of the checked radio.
 *           - `revertCallback` finds the `previous` radio, checks it, updates `tabIndex`, and reapplies the `previous` display mode with a view transition.
 *       v. If `handleUpdate` resolves, show a snackbar confirming the mode change.
 *       vi. If `handleUpdate` rejects, call the `revertCallback`.
 *
 * @param {Object} controls - An object containing references to various DOM elements for settings controls.
 * @param {Function} getCurrentSettings - A function that returns the current settings object.
 * @param {(key: string, value: any, revert?: Function) => Promise<any>} handleUpdate - An asynchronous function that persists the changed setting and returns a Promise. It accepts a `key`, `value`, and an optional `revert` callback.
 * @returns {void}
 */
export function attachToggleListeners(controls, getCurrentSettings, handleUpdate) {
  const {
    soundToggle,
    motionToggle,
    displayRadios,
    typewriterToggle,
    tooltipsToggle,
    cardOfTheDayToggle,
    fullNavigationMapToggle
  } = controls;
  soundToggle?.addEventListener("change", () => {
    const prev = !soundToggle.checked;
    Promise.resolve(
      handleUpdate("sound", soundToggle.checked, () => {
        soundToggle.checked = prev;
      })
    )
      .then(() => {
        showSnackbar(`Sound ${soundToggle.checked ? "enabled" : "disabled"}`);
      })
      .catch(() => {});
  });
  motionToggle?.addEventListener("change", () => {
    const prev = !motionToggle.checked;
    applyMotionPreference(motionToggle.checked);
    Promise.resolve(
      handleUpdate("motionEffects", motionToggle.checked, () => {
        motionToggle.checked = prev;
        applyMotionPreference(prev);
      })
    )
      .then(() => {
        showSnackbar(`Motion effects ${motionToggle.checked ? "enabled" : "disabled"}`);
      })
      .catch(() => {});
  });
  if (displayRadios) {
    displayRadios.forEach((radio) => {
      radio.addEventListener("change", () => {
        if (!radio.checked) return;
        const previous = getCurrentSettings().displayMode;
        const mode = radio.value;
        displayRadios.forEach((r) => {
          r.tabIndex = r === radio ? 0 : -1;
        });
        withViewTransition(() => {
          applyDisplayMode(mode);
        });
        Promise.resolve(
          handleUpdate("displayMode", mode, () => {
            const prevRadio = Array.from(displayRadios).find((r) => r.value === previous);
            if (prevRadio) prevRadio.checked = true;
            displayRadios.forEach((r) => {
              r.tabIndex = r.value === previous ? 0 : -1;
            });
            withViewTransition(() => {
              applyDisplayMode(previous);
            });
          })
        )
          .then(() => {
            const label = mode.charAt(0).toUpperCase() + mode.slice(1);
            showSnackbar(`${label} mode enabled`);
          })
          .catch(() => {});
      });
    });
  }
  typewriterToggle?.addEventListener("change", () => {
    const prev = !typewriterToggle.checked;
    Promise.resolve(
      handleUpdate("typewriterEffect", typewriterToggle.checked, () => {
        typewriterToggle.checked = prev;
      })
    )
      .then(() => {
        showSnackbar(`Typewriter effect ${typewriterToggle.checked ? "enabled" : "disabled"}`);
      })
      .catch(() => {});
  });
  tooltipsToggle?.addEventListener("change", () => {
    const prev = !tooltipsToggle.checked;
    Promise.resolve(
      handleUpdate("tooltips", tooltipsToggle.checked, () => {
        tooltipsToggle.checked = prev;
      })
    )
      .then(() => {
        showSnackbar(`Tooltips ${tooltipsToggle.checked ? "enabled" : "disabled"}`);
      })
      .catch(() => {});
  });
  cardOfTheDayToggle?.addEventListener("change", () => {
    const prev = !cardOfTheDayToggle.checked;
    Promise.resolve(
      handleUpdate("showCardOfTheDay", cardOfTheDayToggle.checked, () => {
        cardOfTheDayToggle.checked = prev;
      })
    )
      .then(() => {
        showSnackbar(`Card of the Day ${cardOfTheDayToggle.checked ? "enabled" : "disabled"}`);
      })
      .catch(() => {});
  });
  fullNavigationMapToggle?.addEventListener("change", () => {
    const prev = !fullNavigationMapToggle.checked;
    Promise.resolve(
      handleUpdate("fullNavigationMap", fullNavigationMapToggle.checked, () => {
        fullNavigationMapToggle.checked = prev;
      })
    )
      .then(() => {
        showSnackbar(
          `Full navigation map ${fullNavigationMapToggle.checked ? "enabled" : "disabled"}`
        );
      })
      .catch(() => {});
  });
}
