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
    div.textContent = `(${i}) —: —`;
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
  // atomically set attribute then text
  el.dataset.remainingTime = String(value ?? 0);
  el.textContent = value !== null ? `Timer: ${String(value).padStart(2, "0")}` : "";
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

function applyRetroTheme(enabled) {
  // document.body is guaranteed to exist in browser environments with a loaded DOM
  document.body.classList.toggle("cli-retro", Boolean(enabled));
  try {
    localStorage.setItem("battleCLI.retro", enabled ? "1" : "0");
  } catch {}
}

function initSettingsCollapse() {
  // Removed unused initShortcutsCollapse function
  const toggle = byId("cli-settings-toggle");
  const body = byId("cli-settings-body");
  if (!toggle || !body) return;
  // read saved collapsed state (0 = expanded, 1 = collapsed)
  let collapsed = false;
  try {
    const v = localStorage.getItem("battleCLI.settingsCollapsed");
    collapsed = v === "1";
  } catch {}
  const apply = (c) => {
    if (c) {
      body.style.display = "none";
      toggle.setAttribute("aria-expanded", "false");
      toggle.textContent = "Settings ▸";
    } else {
      body.style.display = "";
      toggle.setAttribute("aria-expanded", "true");
      toggle.textContent = "Settings ▾";
    }
  };
  apply(collapsed);
  toggle.addEventListener("click", () => {
    collapsed = !collapsed;
    try {
      localStorage.setItem("battleCLI.settingsCollapsed", collapsed ? "1" : "0");
    } catch {}
    apply(collapsed);
    // brief focus management: ensure settings toggle remains focusable
    toggle.focus();
  });
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
      const toggle = byId("cli-settings-toggle");
      const body = byId("cli-settings-body");
      if (!toggle || !body) return false;
      try {
        localStorage.setItem("battleCLI.settingsCollapsed", collapsed ? "1" : "0");
      } catch {}
      if (collapsed) {
        body.style.display = "none";
        toggle.setAttribute("aria-expanded", "false");
        toggle.textContent = "Settings ▸";
      } else {
        body.style.display = "";
        toggle.setAttribute("aria-expanded", "true");
        toggle.textContent = "Settings ▾";
      }
      return true;
    };
  } catch {}

  // expose shortcuts collapse/expand helper for tests
  try {
    window.__battleCLIinit.setShortcutsCollapsed = function (collapsed) {
      const closeBtn = byId("cli-shortcuts-close");
      const body = byId("cli-shortcuts-body");
      const section = byId("cli-shortcuts");
      if (!closeBtn || !body || !section) return false;
      try {
        localStorage.setItem("battleCLI.shortcutsCollapsed", collapsed ? "1" : "0");
      } catch {}
      if (collapsed) {
        body.style.display = "none";
        section.setAttribute("hidden", "");
        closeBtn.setAttribute("aria-expanded", "false");
      } else {
        body.style.display = "";
        section.removeAttribute("hidden");
        closeBtn.setAttribute("aria-expanded", "true");
      }
      return true;
    };
  } catch {}
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
    applyRetroTheme
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
