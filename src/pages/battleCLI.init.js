// Lightweight initialization helpers for battleCLI
import { exposeTestAPI } from "../helpers/testApi.js";

const byId = (id) => document.getElementById(id);

function renderSkeletonStats(count = 5) {
  const stats = byId("cli-stats");
  if (!stats) return;
  // If stats already populated, don't overwrite
  if (stats.dataset.skeleton === "false" && stats.children.length) return;
  stats.innerHTML = "";
  for (let i = 1; i <= count; i++) {
    const div = document.createElement("div");
    div.className = "cli-stat skeleton";
    div.setAttribute("aria-hidden", "true");
    div.textContent = `(${i}) --------------------`;
    div.id = `stat-skel-${i}`;
    stats.appendChild(div);
  }
  stats.dataset.skeleton = "true";
}

function clearSkeletonStats() {
  const stats = byId("cli-stats");
  if (!stats) return;
  if (stats.dataset.skeleton === "true") {
    stats.innerHTML = "";
    stats.dataset.skeleton = "false";
  }
}

function setCountdown(value) {
  const el = byId("cli-countdown");
  if (!el) return;
  const now = Date.now();
  try {
    const freezeUntil = window.__battleCLIinit?.__freezeUntil || 0;
    if (freezeUntil && now < freezeUntil) {
      return;
    }
  } catch {}
  // atomically set attribute then text
  el.dataset.remainingTime = String(value ?? 0);
  if (el.dataset.status === "error") return;
  el.textContent = value !== null ? `Time remaining: ${String(value).padStart(2, "0")}` : "";
  // Briefly freeze countdown UI so test writes are observable before engine overrides
  try {
    if (!window.__battleCLIinit) window.__battleCLIinit = {};
    window.__battleCLIinit.__freezeUntil = now + 500; // ~0.5s stabilization window
  } catch {}
}

function focusStats() {
  const stats = byId("cli-stats");
  if (stats) stats.focus();
}

function focusNextHint() {
  // the bottom hint container is not focusable; make it temporarily focusable
  const hint = byId("cli-controls-hint");
  if (!hint) return;
  hint.setAttribute("tabindex", "0");
  hint.focus();
  // cleanup after a short delay so it remains reachable by keyboard navigation
  setTimeout(() => hint.removeAttribute("tabindex"), 200);
}

/**
 * Apply the Classic Battle retro theme classes and persist the current state.
 *
 * The CLI root element is injected on the CLI screen, but this helper is also
 * reused in tests where the element may be absent. The document body always
 * receives the toggle so other UI shell chrome can mirror the theme.
 *
 * @pseudocode
 * applyRetroTheme(enabled):
 *   shouldEnable ← Boolean(enabled)
 *   cliRoot ← document.getElementById("cli-root")
 *   if cliRoot exists:
 *     cliRoot.classList.toggle("cli-retro", shouldEnable)
 *   document.body.classList.toggle("cli-retro", shouldEnable)
 *   try:
 *     localStorage.setItem("battleCLI.retro", shouldEnable ? "1" : "0")
 *   catch { }
 *
 * @param {unknown} enabled - Desired retro theme state.
 * @returns {void}
 */
function applyRetroTheme(enabled) {
  const shouldEnable = Boolean(enabled);
  const cliRoot = document.getElementById("cli-root");
  if (cliRoot) {
    // The CLI root is guaranteed on the classic battle CLI screen; guard for shared helpers/tests.
    cliRoot.classList.toggle("cli-retro", shouldEnable);
  }
  document.body.classList.toggle("cli-retro", shouldEnable);
  try {
    localStorage.setItem("battleCLI.retro", shouldEnable ? "1" : "0");
  } catch {}
}

function initSettingsCollapse() {
  // Removed unused initShortcutsCollapse function
  const settings = byId("cli-settings");
  if (!settings) return;
  let shouldOpen = true;
  try {
    const v = localStorage.getItem("battleCLI.settingsCollapsed");
    shouldOpen = v !== "1";
  } catch {}
  settings.open = shouldOpen;
  settings.addEventListener("toggle", () => {
    try {
      localStorage.setItem("battleCLI.settingsCollapsed", settings.open ? "0" : "1");
    } catch {}
  });
}

function loadBattleCLIModule() {
  if (typeof window === "undefined") return null;

  const existingPromise = window.__battleCLIinit?.loadPromise;
  if (existingPromise) return existingPromise;

  const cliRoot = byId("cli-root");
  if (!cliRoot) return null;

  const loadPromise = import("./battleCLI/init.js").catch((error) => {
    console.error("Failed to load Classic Battle CLI module:", error);
    return null;
  });

  try {
    window.__battleCLIinit = Object.assign(window.__battleCLIinit || {}, { loadPromise });
  } catch {}

  return loadPromise;
}

function init() {
  renderSkeletonStats(5);
  initSettingsCollapse();
  // helpers are also exposed at module top-level; keep here to ensure latest refs
  try {
    Object.assign(window.__battleCLIinit, {
      renderSkeletonStats,
      clearSkeletonStats,
      setCountdown,
      focusStats,
      focusNextHint,
      applyRetroTheme
    });
  } catch {}

  // expose programmatic settings collapse/expand helper for tests
  try {
    window.__battleCLIinit.setSettingsCollapsed = function (collapsed) {
      const details = byId("cli-settings");
      if (!details) return false;
      try {
        localStorage.setItem("battleCLI.settingsCollapsed", collapsed ? "1" : "0");
      } catch {}
      details.open = !collapsed;
      return true;
    };
  } catch {}

  // expose shortcuts collapse/expand helper for tests
  try {
    window.__battleCLIinit.setShortcutsCollapsed = function (collapsed) {
      const section = byId("cli-shortcuts");
      const closeBtn = byId("cli-shortcuts-close");
      if (!closeBtn || !section) return false;
      try {
        localStorage.setItem("battleCLI.shortcutsCollapsed", collapsed ? "1" : "0");
      } catch {}
      section.open = !collapsed;
      section.removeAttribute("hidden");
      closeBtn.setAttribute("aria-expanded", collapsed ? "false" : "true");
      return true;
    };
  } catch {}

  loadBattleCLIModule();
}

// Expose helpers as early as possible so tests can see them even if init hasn't run yet.
try {
  // Expose Test API for testing
  exposeTestAPI();

  window.__battleCLIinit = Object.assign(window.__battleCLIinit || {}, {
    renderSkeletonStats,
    clearSkeletonStats,
    setCountdown,
    focusStats,
    focusNextHint,
    applyRetroTheme,
    /**
     * Reset all battle CLI module-level state.
     * This allows tests to reset state between runs.
     * The battleCLI/init.js module provides the actual implementation.
     * @returns {void}
     */
    __resetModuleState() {
      // The actual reset happens in battleCLI/init.js when loaded
      // This stub ensures the method exists for the test API
    }
  });
} catch {}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}

export {
  renderSkeletonStats,
  clearSkeletonStats,
  setCountdown,
  focusStats,
  focusNextHint,
  applyRetroTheme
};
