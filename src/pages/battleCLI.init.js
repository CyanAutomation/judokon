// Lightweight initialization helpers for battleCLI
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
  const root = document.documentElement;
  if (enabled) {
    root.classList.add("cli-retro");
  } else {
    root.classList.remove("cli-retro");
  }
  try {
    localStorage.setItem("battleCLI.retro", enabled ? "1" : "0");
  } catch {}
}

function initRetroToggle() {
  // Prefer an explicit retro-toggle control in the header (id=retro-toggle). If missing, add next to verbose-toggle.
  let input = byId("retro-toggle");
  if (!input) {
    const toggle = byId("verbose-toggle");
    if (!toggle) return;
    const label = document.createElement("label");
    label.style.marginLeft = "8px";
    label.textContent = "Retro:";
    input = document.createElement("input");
    input.type = "checkbox";
    input.id = "retro-toggle";
    input.setAttribute("aria-label", "Toggle retro theme");
    label.appendChild(input);
    toggle.parentNode?.insertBefore(label, toggle.nextSibling);
  }
  try {
    const saved = localStorage.getItem("battleCLI.retro");
    if (saved === "1") input.checked = true;
  } catch {}
  input.addEventListener("change", () => applyRetroTheme(input.checked));
  // apply initial
  applyRetroTheme(input.checked);
}

function init() {
  renderSkeletonStats(5);
  initRetroToggle();
  // expose helpers for the main controller
  window.__battleCLIinit = {
    renderSkeletonStats,
    clearSkeletonStats,
    setCountdown,
    focusStats,
    focusNextHint,
    applyRetroTheme
  };
}

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
