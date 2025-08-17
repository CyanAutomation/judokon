import { applyDisplayMode } from "../displayMode.js";
import { withViewTransition } from "../viewTransition.js";
import { applyMotionPreference } from "../motionUtils.js";
import { showSnackbar } from "../showSnackbar.js";

/**
 * Attach change listeners that persist settings updates.
 *
 * @pseudocode
 * 1. Listen for changes on each toggle or select element.
 * 2. Use `handleUpdate` to persist the new value, reverting if it fails.
 * 3. Apply side effects like `applyMotionPreference` and `applyDisplayMode`.
 * 4. After a successful update, show a snackbar confirming the change.
 *
 * @param {Object} controls - Form controls with DOM references.
 * @param {Function} getCurrentSettings - Returns the latest settings object.
 * @param {(key: string, value: any, revert: Function) => Promise<any>} handleUpdate -
 *   Persist function that returns a Promise.
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
