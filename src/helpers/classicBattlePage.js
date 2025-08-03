/**
 * Page wrapper for Classic Battle mode.
 *
 * @pseudocode
 * 1. Import battle helpers, settings loader and DOM ready utility.
 * 2. Define `enableStatButtons` to toggle disabled state on all stat buttons.
 * 3. Define `startRoundWrapper` that:
 *    a. Disables stat buttons.
 *    b. Calls `startRound` from `classicBattle.js`.
 *    c. Waits for the Mystery card to render using `waitForComputerCard`.
 *    d. Enables stat buttons.
 * 4. Define `setupClassicBattlePage` to:
 *    a. Attach click and keyboard listeners on stat buttons that call
 *       `handleStatSelection`.
 *    b. Set `window.startRoundOverride` to `startRoundWrapper` so the battle
 *       module uses it for subsequent rounds.
 *    c. Load feature flags, set `data-*` attributes on `#battle-area`, and
 *       toggle the debug panel based on the `battleDebugPanel` flag.
 *    d. Toggle the `.simulate-viewport` class based on the viewport flag.
 *    e. Invoke `startRoundWrapper` to begin the match.
 *    f. Initialize tooltips and show the stat help tooltip once for new users.
 *    g. Watch for orientation changes and update the battle header's
 *       `data-orientation` attribute.
 *    h. Listen for `storage` events and update the Test Mode banner and
 *       `data-test-mode` attribute when settings change.
 * 5. Execute `setupClassicBattlePage` with `onDomReady`.
 */
import { startRound as classicStartRound, handleStatSelection } from "./classicBattle.js";
import { onDomReady } from "./domReady.js";
import { waitForComputerCard } from "./battleJudokaPage.js";
import { loadSettings } from "./settingsUtils.js";
import { initTooltips } from "./tooltip.js";
import { setTestMode } from "./testModeUtils.js";
import { toggleViewportSimulation } from "./viewportDebug.js";
import { loadStatNames } from "./stats.js";
import { STATS } from "./battleEngine.js";

function enableStatButtons(enable = true) {
  document.querySelectorAll("#stat-buttons button").forEach((btn) => {
    btn.disabled = !enable;
    btn.tabIndex = enable ? 0 : -1;
    btn.classList.toggle("disabled", !enable);
  });
}

async function startRoundWrapper() {
  enableStatButtons(false);
  await classicStartRound();
  await waitForComputerCard();
  enableStatButtons(true);
}

function onStatSelect(stat) {
  handleStatSelection(stat);
}

async function applyStatLabels() {
  const names = await loadStatNames();
  names.forEach((n, i) => {
    const key = STATS[i];
    const btn = document.querySelector(`#stat-buttons button[data-stat="${key}"]`);
    if (btn) {
      btn.textContent = n.name;
      btn.setAttribute("aria-label", `Select ${n.name}`);
    }
  });
}

/**
 * Apply orientation data attribute on the battle header and watch for changes.
 *
 * @pseudocode
 * 1. Select the `.battle-header` element and exit if missing.
 * 2. Define `updateOrientation` that sets `data-orientation` to `portrait` or
 *    `landscape` based on `matchMedia`.
 * 3. Invoke `updateOrientation` immediately.
 * 4. Listen for `orientationchange` and `resize` events to call
 *    `updateOrientation` on each change.
 */
function watchBattleOrientation() {
  const header = document.querySelector(".battle-header");
  if (!header) return;

  const updateOrientation = () => {
    header.dataset.orientation = window.matchMedia("(orientation: portrait)").matches
      ? "portrait"
      : "landscape";
  };

  updateOrientation();
  window.addEventListener("orientationchange", updateOrientation);
  window.addEventListener("resize", updateOrientation);
}

export async function setupClassicBattlePage() {
  await applyStatLabels();
  const statButtons = document.querySelectorAll("#stat-buttons button");
  statButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!btn.disabled) {
        enableStatButtons(false);
        btn.classList.add("selected");
        onStatSelect(btn.dataset.stat);
      }
    });
    btn.addEventListener("keydown", (e) => {
      if ((e.key === "Enter" || e.key === " ") && !btn.disabled) {
        e.preventDefault();
        enableStatButtons(false);
        btn.classList.add("selected");
        onStatSelect(btn.dataset.stat);
      }
    });
  });

  let settings;
  try {
    settings = await loadSettings();
  } catch {
    settings = { featureFlags: {} };
  }

  const battleArea = document.getElementById("battle-area");
  if (battleArea) {
    battleArea.dataset.mode = "classic";
    battleArea.dataset.randomStat = String(Boolean(settings.featureFlags.randomStatMode));
    battleArea.dataset.testMode = String(Boolean(settings.featureFlags.enableTestMode?.enabled));
  }

  toggleViewportSimulation(Boolean(settings.featureFlags.viewportSimulation?.enabled));

  setTestMode(Boolean(settings.featureFlags.enableTestMode?.enabled));

  const banner = document.getElementById("test-mode-banner");
  if (banner) {
    banner.classList.toggle("hidden", !settings.featureFlags.enableTestMode?.enabled);
  }

  window.addEventListener("storage", (e) => {
    if (e.key === "settings" && e.newValue) {
      try {
        const s = JSON.parse(e.newValue);
        if (battleArea) {
          battleArea.dataset.testMode = String(Boolean(s.featureFlags?.enableTestMode?.enabled));
        }
        if (banner) {
          banner.classList.toggle("hidden", !s.featureFlags?.enableTestMode?.enabled);
        }
        setTestMode(Boolean(s.featureFlags?.enableTestMode?.enabled));
      } catch {}
    }
  });

  const debugPanel = document.getElementById("debug-panel");
  if (debugPanel) {
    const computerSlot = document.getElementById("computer-card");
    if (settings.featureFlags.battleDebugPanel?.enabled && computerSlot) {
      computerSlot.prepend(debugPanel);
      debugPanel.classList.remove("hidden");
    } else {
      debugPanel.remove();
    }
  }

  window.startRoundOverride = startRoundWrapper;
  startRoundWrapper();
  await initTooltips();
  watchBattleOrientation();

  try {
    if (typeof localStorage !== "undefined") {
      const hintShown = localStorage.getItem("statHintShown");
      if (!hintShown) {
        const help = document.getElementById("stat-help");
        help?.dispatchEvent(new Event("mouseenter"));
        setTimeout(() => {
          help?.dispatchEvent(new Event("mouseleave"));
        }, 3000);
        localStorage.setItem("statHintShown", "true");
      }
    }
  } catch {
    // ignore localStorage errors
  }
}

onDomReady(setupClassicBattlePage);
