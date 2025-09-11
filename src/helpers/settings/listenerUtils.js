import { applyDisplayMode } from "../displayMode.js";
import { withViewTransition } from "../viewTransition.js";
import { applyMotionPreference } from "../motionUtils.js";
import { showSnackbar } from "../showSnackbar.js";

/**
 * Attach event listeners to settings controls that persist changes and apply
 * side effects.
 *
 * @pseudocode
 * 1. For each control in `controls`, attach a 'change' listener.
 * 2. Capture the previous UI value in `prev` so the UI can be reverted on error.
 * 3. Apply any immediate side-effect (e.g. display/motion) synchronously.
 * 4. Call `handleUpdate(key, value, revert)` to persist the change.
 *    - If the promise resolves, show a snackbar confirming the change.
 *    - If it rejects, call `revert()` to restore prior UI state.
 *
 * @param {Object} controls - DOM elements for the settings controls.
 * @param {Function} getCurrentSettings - Returns the current settings object.
 * @param {(key: string, value: any, revert?: Function) => Promise<any>} handleUpdate
 *   Persist helper that writes the changed setting and returns a Promise.
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
