import { ToggleSwitch } from "../../components/ToggleSwitch.js";
import { showSnackbar } from "../showSnackbar.js";
import { toggleViewportSimulation } from "../viewportDebug.js";
import { toggleTooltipOverlayDebug } from "../tooltipOverlayDebug.js";
import { toggleLayoutDebugPanel } from "../layoutDebugPanel.js";

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
 * @returns {Promise} Resolves when persistence completes.
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
    handleUpdate("featureFlags", updated, () => {
      input.checked = prev;
    })
  )
    .then(() => {
      showSnackbar(`${label} ${input.checked ? "enabled" : "disabled"}`);
      if (flag === "viewportSimulation") {
        toggleViewportSimulation(input.checked);
      }
      if (flag === "tooltipOverlayDebug") {
        toggleTooltipOverlayDebug(input.checked);
      }
      if (flag === "layoutDebugPanel") {
        toggleLayoutDebugPanel(input.checked);
      }
    })
    .catch(() => {});
}

function formatFlagLabel(flag) {
  return String(flag)
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase());
}

/**
 * Render feature flag toggle switches.
 *
 * @pseudocode
 * 1. For each flag, generate a labelled toggle switch element and description.
 * 2. When tooltip text is missing, convert the flag name to a readable label.
 * 3. Persist updates via `handleUpdate` when toggled.
 * 4. After saving, show a snackbar confirming the new state.
 * 5. When toggling `viewportSimulation`, call `toggleViewportSimulation`.
 *
 * @param {HTMLElement} container - Container for the switches.
 * @param {Record<string, { enabled: boolean, tooltipId?: string }>} flags - Feature flag metadata.
 * @param {Function} getCurrentSettings - Returns current settings.
 * @param {Function} handleUpdate - Persist function.
 * @param {Record<string, string>} [tooltipMap] - Flattened tooltip lookup.
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
    const tipId = info.tooltipId || `settings.${flag}`;
    const label = tooltipMap[`${tipId}.label`] || formatFlagLabel(flag);
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
    const desc = document.createElement("p");
    desc.className = "settings-description";
    desc.id = `feature-${kebab}-desc`;
    desc.textContent = description;
    wrapper.appendChild(desc);
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
        label: tooltipMap[`${tipId}.label`] || flag,
        getCurrentSettings,
        handleUpdate
      })
    );
  });
}
