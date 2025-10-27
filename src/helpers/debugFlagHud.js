import {
  addDebugFlagMetricsListener,
  getDebugFlagMetrics,
  isDebugFlagProfilingEnabled,
  resetDebugFlagMetrics
} from "./debugFlagPerformance.js";

const HUD_ID = "debug-flag-performance-hud";
const HUD_STYLE_ID = "debug-flag-performance-hud-style";
const HUD_STYLES = `
  #${HUD_ID} {
    position: fixed;
    bottom: 16px;
    right: 16px;
    z-index: 2147483647;
    background: rgba(12, 27, 34, 0.92);
    color: #f5fbff;
    font-family: system-ui, sans-serif;
    border-radius: 8px;
    border: 1px solid rgba(245, 251, 255, 0.2);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35);
    width: min(320px, 90vw);
    max-height: 40vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    backdrop-filter: blur(6px);
  }
  #${HUD_ID} header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    background: rgba(245, 251, 255, 0.12);
    font-weight: 600;
    letter-spacing: 0.01em;
  }
  #${HUD_ID} header button {
    background: transparent;
    border: none;
    color: inherit;
    font-size: 18px;
    line-height: 1;
    cursor: pointer;
  }
  #${HUD_ID} ul {
    list-style: none;
    margin: 0;
    padding: 0;
    overflow-y: auto;
    flex: 1 1 auto;
  }
  #${HUD_ID} li {
    padding: 8px 12px;
    border-bottom: 1px solid rgba(245, 251, 255, 0.08);
    font-size: 13px;
    line-height: 1.4;
  }
  #${HUD_ID} li:last-child {
    border-bottom: none;
  }
  #${HUD_ID} footer {
    padding: 8px 12px;
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    background: rgba(245, 251, 255, 0.08);
  }
  #${HUD_ID} footer button {
    appearance: none;
    border: 1px solid rgba(245, 251, 255, 0.3);
    background: rgba(245, 251, 255, 0.12);
    color: inherit;
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 4px;
    cursor: pointer;
  }
  #${HUD_ID} .debug-flag-hud__empty {
    padding: 12px;
    text-align: center;
    font-size: 12px;
    opacity: 0.75;
  }
`;
let hudRoot = null;
let hudList = null;
let hudEmpty = null;
let unsubscribeMetrics = null;

function ensureStyleSheet() {
  if (typeof document === "undefined") return;
  if (document.getElementById(HUD_STYLE_ID)) return;
  const style = document.createElement("style");
  style.id = HUD_STYLE_ID;
  style.textContent = HUD_STYLES;
  document.head.appendChild(style);
}

function createHudRoot() {
  if (typeof document === "undefined" || !document.body) {
    return null;
  }
  ensureStyleSheet();
  const existing = document.getElementById(HUD_ID);
  if (existing) {
    return existing;
  }
  const root = document.createElement("section");
  root.id = HUD_ID;
  root.setAttribute("role", "log");
  root.setAttribute("aria-live", "polite");
  root.innerHTML = `
    <header>
      <span>Debug Flag Performance</span>
      <button type="button" data-debug-flag-hud="close" aria-label="Close debug performance HUD">×</button>
    </header>
    <div class="debug-flag-hud__empty" data-debug-flag-hud="empty">No debug flag metrics recorded.</div>
    <ul data-debug-flag-hud="list"></ul>
    <footer>
      <button type="button" data-debug-flag-hud="clear">Clear</button>
    </footer>
  `;
  const closeBtn = root.querySelector("[data-debug-flag-hud='close']");
  const clearBtn = root.querySelector("[data-debug-flag-hud='clear']");
  hudList = root.querySelector("[data-debug-flag-hud='list']");
  hudEmpty = root.querySelector("[data-debug-flag-hud='empty']");
  closeBtn?.addEventListener("click", teardownDebugFlagHud);
  clearBtn?.addEventListener("click", () => {
    resetDebugFlagMetrics();
  });
  return root;
}

function summarizeMetrics(metrics) {
  const map = new Map();
  metrics.forEach((metric) => {
    const next = map.get(metric.flag) || {
      flag: metric.flag,
      count: 0,
      total: 0,
      max: 0,
      last: 0
    };
    next.count += 1;
    next.total += metric.duration;
    next.max = Math.max(next.max, metric.duration);
    next.last = metric.duration;
    map.set(metric.flag, next);
  });
  return Array.from(map.values())
    .sort((a, b) => b.last - a.last)
    .map((entry) => ({
      flag: entry.flag,
      count: entry.count,
      avg: entry.total / entry.count,
      max: entry.max,
      last: entry.last
    }));
}

function formatDuration(value) {
  return `${value.toFixed(1)}ms`;
}

function renderHud(metrics) {
  if (!hudList || !hudEmpty) return;
  hudList.textContent = "";
  if (!Array.isArray(metrics) || metrics.length === 0) {
    hudEmpty.hidden = false;
    return;
  }
  hudEmpty.hidden = true;
  const summary = summarizeMetrics(metrics);
  summary.slice(0, 8).forEach((entry) => {
    const item = document.createElement("li");
    item.innerHTML = `<strong>${entry.flag}</strong><br>avg ${formatDuration(entry.avg)} • last ${formatDuration(entry.last)} • max ${formatDuration(entry.max)} • n=${entry.count}`;
    hudList.appendChild(item);
  });
}

function attachHud() {
  if (!hudRoot || !document.body) return;
  if (!hudRoot.isConnected) {
    document.body.appendChild(hudRoot);
  }
}

function subscribeToMetrics() {
  if (unsubscribeMetrics) {
    return;
  }
  unsubscribeMetrics = addDebugFlagMetricsListener((metrics) => {
    renderHud(metrics);
  });
}

function clearSubscription() {
  if (typeof unsubscribeMetrics === "function") {
    unsubscribeMetrics();
  }
  unsubscribeMetrics = null;
}

/**
 * Initialize the floating HUD that surfaces debug flag performance metrics.
 *
 * @returns {{ destroy: () => void }}
 * @pseudocode
 * 1. Exit early when no DOM exists or profiling is disabled.
 * 2. Ensure style + HUD root nodes exist and attach them to `document.body`.
 * 3. Render the current metrics snapshot and subscribe to future updates.
 * 4. Return a destroy handle for tests to clean up subscriptions and DOM.
 */
export function initDebugFlagHud() {
  if (typeof document === "undefined" || !document.body || !isDebugFlagProfilingEnabled()) {
    return { destroy: () => {} };
  }
  hudRoot = createHudRoot();
  if (!hudRoot) {
    return { destroy: () => {} };
  }
  attachHud();
  renderHud(getDebugFlagMetrics());
  subscribeToMetrics();
  return { destroy: teardownDebugFlagHud };
}

/**
 * Tear down the HUD and unsubscribe from metrics updates.
 *
 * @returns {void}
 * @pseudocode
 * 1. Remove the HUD root from the DOM when attached.
 * 2. Clear the metrics subscription so updates stop flowing.
 * 3. Reset cached node references for the next initialization.
 */
export function teardownDebugFlagHud() {
  clearSubscription();
  if (hudRoot?.isConnected) {
    hudRoot.remove();
  }
  hudRoot = null;
  hudList = null;
  hudEmpty = null;
}
