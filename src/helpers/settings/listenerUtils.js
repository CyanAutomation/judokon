import { applyDisplayMode, normalizeDisplayMode } from "../displayMode.js";
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
 *       i. Normalize the `previous` display mode from `getCurrentSettings()` to a supported value.
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
    headerThemeRadios,
    typewriterToggle,
    tooltipsToggle,
    cardOfTheDayToggle,
    fullNavigationMapToggle
  } = controls;
  const displayRadioArray = displayRadios ? Array.from(displayRadios) : [];
  const headerRadioArray = headerThemeRadios ? Array.from(headerThemeRadios) : [];
  const syncHeaderRadios = (modeOverride) => {
    if (!headerRadioArray.length) {
      return;
    }
    const selectedDisplay = displayRadioArray.find((radio) => radio.checked);
    const currentSettings = getCurrentSettings();
    const targetValue =
      modeOverride ??
      selectedDisplay?.value ??
      normalizeDisplayMode(currentSettings.displayMode) ??
      headerRadioArray[0]?.value ??
      "light";
    headerRadioArray.forEach((radio, index) => {
      const isMatch = targetValue ? radio.value === targetValue : index === 0;
      radio.checked = isMatch;
      radio.tabIndex = isMatch ? 0 : -1;
    });
  };
  const applyDisplayRadioSelection = (selectedRadio, eventTarget) => {
    if (!selectedRadio) {
      return;
    }
    const currentSettings = getCurrentSettings();
    const previous =
      normalizeDisplayMode(currentSettings.displayMode) ?? displayRadioArray[0]?.value ?? "light";
    const mode = selectedRadio.value;
    displayRadioArray.forEach((radio) => {
      const isSelected = radio === selectedRadio;
      radio.checked = isSelected;
      radio.tabIndex = isSelected ? 0 : -1;
    });
    syncHeaderRadios(mode);
    withViewTransition(() => {
      applyDisplayMode(mode);
    });
    const target = eventTarget ?? selectedRadio;
    Promise.resolve(
      handleUpdate(
        "displayMode",
        mode,
        () => {
          const prevRadio = displayRadioArray.find((radio) => radio.value === previous);
          if (prevRadio) {
            prevRadio.checked = true;
          }
          displayRadioArray.forEach((radio) => {
            radio.tabIndex = radio.value === previous ? 0 : -1;
          });
          withViewTransition(() => {
            applyDisplayMode(previous);
          });
          syncHeaderRadios(previous);
        },
        target
      )
    )
      .then(() => {
        const label = mode.charAt(0).toUpperCase() + mode.slice(1);
        showSnackbar(`${label} mode enabled`);
        syncHeaderRadios(mode);
      })
      .catch(() => {});
  };
  soundToggle?.addEventListener("change", (e) => {
    const prev = !soundToggle.checked;
    Promise.resolve(
      handleUpdate(
        "sound",
        soundToggle.checked,
        () => {
          soundToggle.checked = prev;
        },
        e.target
      )
    )
      .then(() => {
        showSnackbar(`Sound ${soundToggle.checked ? "enabled" : "disabled"}`);
      })
      .catch(() => {});
  });
  motionToggle?.addEventListener("change", (e) => {
    const prev = !motionToggle.checked;
    applyMotionPreference(motionToggle.checked);
    Promise.resolve(
      handleUpdate(
        "motionEffects",
        motionToggle.checked,
        () => {
          motionToggle.checked = prev;
          applyMotionPreference(prev);
        },
        e.target
      )
    )
      .then(() => {
        showSnackbar(`Motion effects ${motionToggle.checked ? "enabled" : "disabled"}`);
      })
      .catch(() => {});
  });
  if (displayRadios) {
    displayRadios.forEach((radio) => {
      radio.addEventListener("change", (e) => {
        if (!radio.checked) return;
        applyDisplayRadioSelection(radio, e.target);
      });
    });
  }
  if (headerRadioArray.length) {
    headerRadioArray.forEach((headerRadio) => {
      headerRadio.addEventListener("change", () => {
        if (!headerRadio.checked) return;
        const matchingDisplay = displayRadioArray.find(
          (radio) => radio.value === headerRadio.value
        );
        if (matchingDisplay) {
          if (!matchingDisplay.checked) {
            matchingDisplay.checked = true;
            applyDisplayRadioSelection(matchingDisplay, headerRadio);
          } else {
            syncHeaderRadios(matchingDisplay.value);
          }
          return;
        }
        withViewTransition(() => {
          applyDisplayMode(headerRadio.value);
        });
        Promise.resolve(
          handleUpdate(
            "displayMode",
            headerRadio.value,
            () => {
              syncHeaderRadios();
            },
            headerRadio
          )
        ).catch(() => {});
      });
    });
  }
  typewriterToggle?.addEventListener("change", (e) => {
    const prev = !typewriterToggle.checked;
    Promise.resolve(
      handleUpdate(
        "typewriterEffect",
        typewriterToggle.checked,
        () => {
          typewriterToggle.checked = prev;
        },
        e.target
      )
    )
      .then(() => {
        showSnackbar(`Typewriter effect ${typewriterToggle.checked ? "enabled" : "disabled"}`);
      })
      .catch(() => {});
  });
  tooltipsToggle?.addEventListener("change", (e) => {
    const prev = !tooltipsToggle.checked;
    Promise.resolve(
      handleUpdate(
        "tooltips",
        tooltipsToggle.checked,
        () => {
          tooltipsToggle.checked = prev;
        },
        e.target
      )
    )
      .then(() => {
        showSnackbar(`Tooltips ${tooltipsToggle.checked ? "enabled" : "disabled"}`);
      })
      .catch(() => {});
  });
  cardOfTheDayToggle?.addEventListener("change", (e) => {
    const prev = !cardOfTheDayToggle.checked;
    Promise.resolve(
      handleUpdate(
        "showCardOfTheDay",
        cardOfTheDayToggle.checked,
        () => {
          cardOfTheDayToggle.checked = prev;
        },
        e.target
      )
    )
      .then(() => {
        showSnackbar(`Card of the Day ${cardOfTheDayToggle.checked ? "enabled" : "disabled"}`);
      })
      .catch(() => {});
  });
  fullNavigationMapToggle?.addEventListener("change", (e) => {
    const prev = !fullNavigationMapToggle.checked;
    Promise.resolve(
      handleUpdate(
        "fullNavigationMap",
        fullNavigationMapToggle.checked,
        () => {
          fullNavigationMapToggle.checked = prev;
        },
        e.target
      )
    )
      .then(() => {
        showSnackbar(
          `Full navigation map ${fullNavigationMapToggle.checked ? "enabled" : "disabled"}`
        );
      })
      .catch(() => {});
  });
  syncHeaderRadios();
}
