import { ToggleSwitch } from "../../components/ToggleSwitch.js";
import { showSnackbar } from "../showSnackbar.js";
import { toggleTooltipOverlayDebug } from "../tooltipOverlayDebug.js";
import { toggleLayoutDebugPanel } from "../layoutDebugPanel.js";
import { isDebugProfileEnabled, setDebugProfile } from "../debugProfiles.js";

const DEBUG_PROFILE_ORDER = ["ui", "battle", "cli"];

function getDebugProfileLabel(profile, tooltipMap) {
  const tooltipLabel = tooltipMap[`settings.debugProfiles.${profile}.label`];
  if (tooltipLabel) return tooltipLabel;
  return `Debug Profile: ${profile.toUpperCase()}`;
}

function getDebugProfileDescription(profile, tooltipMap) {
  return tooltipMap[`settings.debugProfiles.${profile}.description`] || "";
}

/**
 * Render grouped debug profile toggles in the settings UI.
 *
 * @pseudocode
 * 1. Iterate through the fixed debug profile order.
 * 2. Build toggle label, description, and checked state for each profile.
 * 3. Render a switch and wire change handling to persist profile state.
 * 4. Apply UI debug side effects when the `ui` profile changes.
 *
 * @param {HTMLElement} container - Element that receives rendered debug profile toggles.
 * @param {() => Record<string, any>} getCurrentSettings - Getter for current settings snapshot.
 * @param {Record<string, string>} [tooltipMap={}] - Localized tooltip content map.
 * @returns {void}
 */
export function renderDebugProfileSwitches(container, getCurrentSettings, tooltipMap = {}) {
  DEBUG_PROFILE_ORDER.forEach((profile) => {
    const label = getDebugProfileLabel(profile, tooltipMap);
    const description = getDebugProfileDescription(profile, tooltipMap);
    const id = `debug-profile-${profile}`;
    const toggle = new ToggleSwitch(label, {
      id,
      name: `debugProfiles.${profile}`,
      checked: isDebugProfileEnabled(profile, { settings: getCurrentSettings() }),
      ariaLabel: label,
      tooltipId: `settings.debugProfiles.${profile}`
    });
    const { element: wrapper, input } = toggle;
    if (!input) return;
    input.dataset.flag = `debugProfiles.${profile}`;
    const desc = toggle.setDescription(description, { id: `${id}-desc` });
    input.setAttribute("aria-describedby", desc.id);
    input.addEventListener("change", async () => {
      const previous = !input.checked;
      try {
        await setDebugProfile(profile, input.checked);
        showSnackbar(`${label} ${input.checked ? "enabled" : "disabled"}`);
        if (profile === "ui") {
          toggleLayoutDebugPanel(input.checked);
          toggleTooltipOverlayDebug(input.checked);
        }
      } catch {
        input.checked = previous;
      }
    });
    container.appendChild(wrapper);
  });
}

/**
 * Handle a feature flag toggle change.
 *
 * @pseudocode
 * 1. Clone current feature flag settings with the updated value.
 * 2. Persist via `handleUpdate`; on failure revert the checkbox.
 * 3. Trigger side effects for specific flags.
 * 4. Show a snackbar confirming the new state.
 *
 * @param {{
 *   input: HTMLInputElement,
 *   flag: string,
 *   info: object,
 *   label: string,
 *   getCurrentSettings: Function,
 *   handleUpdate: Function
 * }} params - Handler dependencies.
 * @returns {Promise<void>} Resolves when persistence completes.
 */
export function handleFeatureFlagChange({
  input,
  flag,
  info,
  label,
  getCurrentSettings,
  handleUpdate
}) {
  const prev = !input.checked;
  const updated = {
    ...getCurrentSettings().featureFlags,
    [flag]: { ...info, enabled: input.checked }
  };
  return Promise.resolve(
    handleUpdate(
      "featureFlags",
      updated,
      () => {
        input.checked = prev;
      },
      input
    )
  )
    .then(() => {
      showSnackbar(`${label} ${input.checked ? "enabled" : "disabled"}`);
    })
    .catch(() => {});
}

const ROUND_STORE_FLAG = "roundStore";
const ROUND_STORE_EXPERIMENTAL_LABEL = "Round Store (Experimental)";

function formatFlagLabel(flag) {
  return String(flag)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

function resolveFlagLabel(flag, tipId, tooltipMap) {
  const tooltipLabel = tooltipMap[`${tipId}.label`];
  if (tooltipLabel) {
    return tooltipLabel;
  }
  if (flag === ROUND_STORE_FLAG) {
    return ROUND_STORE_EXPERIMENTAL_LABEL;
  }
  return formatFlagLabel(flag);
}

/**
 * Render feature flag toggle switches.
 *
 * @description
 * For each flag in `flags`, create a labelled `ToggleSwitch` with an optional
 * description pulled from the `tooltipMap`. Wire the `change` event to
 * `handleFeatureFlagChange` so changes are persisted and side effects applied.
 *
 * @pseudocode
 * 1. Validate `container` and `flags`. Return early if invalid.
 * 2. Iterate over flags and create `ToggleSwitch` instances with labels and descriptions.
 * 3. Append toggles into the container, attempting to insert before the first hidden child.
 * 4. Wire `change` events to `handleFeatureFlagChange` to persist and apply side effects.
 *
 * @param {HTMLElement} container - DOM element that will receive toggle controls.
 * @param {Record<string, { enabled: boolean, tooltipId?: string }>} flags - Map of flag names to metadata.
 * @param {() => Object} getCurrentSettings - Function that returns the current settings object.
 * @param {(key: string, value: any, onError?: Function) => Promise} handleUpdate - Function to persist setting updates.
 * @param {Record<string, string>} [tooltipMap={}] - Optional map of tooltip ids to localized text.
 * @returns {void}
 */
export function renderFeatureFlagSwitches(
  container,
  flags,
  getCurrentSettings,
  handleUpdate,
  tooltipMap = {}
) {
  if (!container || !flags) return;
  Object.keys(flags).forEach((flag) => {
    const kebab = flag.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    const info = flags[flag];
    if (info && info.hidden) {
      return;
    }
    const tipId = info.tooltipId || `settings.${flag}`;
    const label = resolveFlagLabel(flag, tipId, tooltipMap);
    const getDescription = () => tooltipMap[`${tipId}.description`] || "";
    const description = getDescription();
    const toggle = new ToggleSwitch(label, {
      id: `feature-${kebab}`,
      name: flag,
      checked: Boolean(getCurrentSettings().featureFlags[flag]?.enabled),
      ariaLabel: label,
      tooltipId: tipId
    });
    const { element: wrapper, input } = toggle;
    if (input) input.dataset.flag = flag;
    const desc = toggle.setDescription(description, {
      id: `feature-${kebab}-desc`
    });
    if (input) {
      input.setAttribute("aria-describedby", desc.id);
      input.removeAttribute("tabindex");
      input.tabIndex = 0;
    }
    const firstHidden = container.querySelector(":scope > [hidden]");
    if (firstHidden) {
      container.insertBefore(wrapper, firstHidden);
    } else {
      container.appendChild(wrapper);
    }
    if (!input) return;
    input.addEventListener("change", () =>
      handleFeatureFlagChange({
        input,
        flag,
        info,
        label,
        getCurrentSettings,
        handleUpdate
      })
    );
  });
}
