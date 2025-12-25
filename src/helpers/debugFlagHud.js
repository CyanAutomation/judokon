import {
  addDebugFlagMetricsListener,
  getDebugFlagMetrics,
  isDebugFlagProfilingEnabled,
  resetDebugFlagMetrics
} from "./debugFlagPerformance.js";
import { setDetailsOpen } from "./detailsToggle.js";

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
  #${HUD_ID}[data-alert-active="true"] {
    border-color: rgba(255, 102, 102, 0.6);
    box-shadow: 0 12px 32px rgba(255, 64, 64, 0.35);
  }
  #${HUD_ID} li.debug-flag-hud__alert {
    color: #ffecec;
    background: rgba(255, 64, 64, 0.18);
  }
  #${HUD_ID} li.debug-flag-hud__alert::before {
    content: "⚠ ";
    font-size: 12px;
  }
  #${HUD_ID} details.debug-flag-hud__history {
    border-top: 1px solid rgba(245, 251, 255, 0.08);
    background: rgba(245, 251, 255, 0.04);
    padding: 8px 12px;
    font-size: 12px;
  }
  #${HUD_ID} details.debug-flag-hud__history summary {
    cursor: pointer;
    list-style: none;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 6px;
  }
  #${HUD_ID} details.debug-flag-hud__history summary::-webkit-details-marker {
    display: none;
  }
  #${HUD_ID} details.debug-flag-hud__history[data-recent="true"] summary::after {
    content: "●";
    color: #ff8282;
    font-size: 10px;
  }
  #${HUD_ID} details.debug-flag-hud__history ol {
    margin: 8px 0 0;
    padding-left: 18px;
    max-height: 120px;
    overflow-y: auto;
    line-height: 1.4;
  }
  #${HUD_ID} details.debug-flag-hud__history li {
    margin-bottom: 6px;
  }
  #${HUD_ID} details.debug-flag-hud__history li:last-child {
    margin-bottom: 0;
  }
  #${HUD_ID} .debug-flag-hud__history-empty {
    margin-top: 8px;
    opacity: 0.7;
  }
`;
const DEFAULT_ALERT_THRESHOLD_MS = 16;
const MAX_ALERT_HISTORY = 100;
const ALERT_HISTORY_RENDER_LIMIT = 5;
let hudRoot = null;
let hudList = null;
let hudEmpty = null;
let hudHistorySection = null;
let hudHistoryList = null;
let hudHistoryEmpty = null;
let unsubscribeMetrics = null;
let lastAlertFlags = new Set();
const alertHistory =
  typeof window !== "undefined" && Array.isArray(window.__DEBUG_FLAG_ALERT_HISTORY__)
    ? window.__DEBUG_FLAG_ALERT_HISTORY__
    : [];
if (typeof window !== "undefined") {
  window.__DEBUG_FLAG_ALERT_HISTORY__ = alertHistory;
}

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
    <details class="debug-flag-hud__history" data-debug-flag-hud="history">
      <summary>Alert history</summary>
      <div class="debug-flag-hud__history-empty" data-debug-flag-hud="history-empty">No alert history recorded.</div>
      <ol data-debug-flag-hud="history-list"></ol>
    </details>
    <footer>
      <button type="button" data-debug-flag-hud="export">Copy Alerts</button>
      <button type="button" data-debug-flag-hud="clear">Clear</button>
    </footer>
  `;
  const closeBtn = root.querySelector("[data-debug-flag-hud='close']");
  const clearBtn = root.querySelector("[data-debug-flag-hud='clear']");
  const exportBtn = root.querySelector("[data-debug-flag-hud='export']");
  hudList = root.querySelector("[data-debug-flag-hud='list']");
  hudEmpty = root.querySelector("[data-debug-flag-hud='empty']");
  hudHistorySection = root.querySelector("[data-debug-flag-hud='history']");
  hudHistoryList = root.querySelector("[data-debug-flag-hud='history-list']");
  hudHistoryEmpty = root.querySelector("[data-debug-flag-hud='history-empty']");
  closeBtn?.addEventListener("click", teardownDebugFlagHud);
  clearBtn?.addEventListener("click", () => {
    resetDebugFlagMetrics();
  });
  exportBtn?.addEventListener("click", () => {
    exportAlertHistory()
      .then((result) => {
        setExportStatus(result ? "copied" : "empty");
      })
      .catch(() => {
        setExportStatus("failed");
      });
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

function formatTimestamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "unknown time";
  }
  return date.toISOString();
}

function getRecentAlertHistory() {
  const start = Math.max(0, alertHistory.length - ALERT_HISTORY_RENDER_LIMIT);
  return alertHistory.slice(start).reverse();
}

function formatHistoryMetrics(metrics) {
  if (!Array.isArray(metrics) || metrics.length === 0) {
    return "";
  }
  return metrics
    .map(
      (metric) =>
        `${metric.flag}: avg ${formatDuration(metric.avg)} • max ${formatDuration(metric.max)} • last ${formatDuration(metric.last)} • n=${metric.count}`
    )
    .join(" | ");
}

function renderAlertHistorySection(expandOnLatest = false) {
  if (!hudHistoryList || !hudHistoryEmpty) {
    return;
  }
  const entries = getRecentAlertHistory();
  hudHistoryList.textContent = "";
  if (entries.length === 0) {
    hudHistoryEmpty.hidden = false;
    if (hudHistorySection) {
      setDetailsOpen(hudHistorySection, false);
      hudHistorySection.removeAttribute("data-recent");
    }
    return;
  }
  hudHistoryEmpty.hidden = true;
  entries.forEach((entry) => {
    const item = document.createElement("li");
    const threshold = Number.isFinite(entry.thresholdMs)
      ? formatDuration(Number(entry.thresholdMs))
      : "n/a";
    const metricsLabel = formatHistoryMetrics(entry.metrics);
    const flagsLabel =
      metricsLabel ||
      (Array.isArray(entry.flags) && entry.flags.length > 0 ? entry.flags.join(", ") : "");
    const parts = [`${formatTimestamp(entry.timestamp)}`, `threshold ${threshold}`];
    if (flagsLabel) {
      parts.push(flagsLabel);
    }
    item.textContent = parts.join(" • ");
    hudHistoryList.appendChild(item);
  });
  if (hudHistorySection) {
    if (expandOnLatest) {
      setDetailsOpen(hudHistorySection, true);
      hudHistorySection.setAttribute("data-recent", "true");
    } else {
      hudHistorySection.removeAttribute("data-recent");
    }
  }
}

function resolveAlertThreshold() {
  let threshold = DEFAULT_ALERT_THRESHOLD_MS;
  if (typeof window !== "undefined") {
    const candidate = window.__DEBUG_FLAG_ALERT_THRESHOLD__;
    if (candidate !== undefined && candidate !== null) {
      const parsed = Number(candidate);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        threshold = parsed;
      }
    }
  }
  if (typeof process !== "undefined" && process.env) {
    const envValue = process.env.DEBUG_FLAG_ALERT_THRESHOLD;
    if (envValue) {
      const parsed = Number(envValue);
      if (!Number.isNaN(parsed) && parsed >= 0) {
        threshold = parsed;
      }
    }
  }
  return threshold;
}

function setsEqual(a, b) {
  if (a.size !== b.size) return false;
  for (const value of a) {
    if (!b.has(value)) return false;
  }
  return true;
}

function dispatchAlertEvent(flags, threshold) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("debug-flag-hud:alert", {
      detail: {
        flags: flags.slice(),
        thresholdMs: threshold
      }
    })
  );
}

function recordAlertHistory(summary, alertFlags, threshold) {
  if (alertFlags.size === 0) {
    return;
  }
  const metricsForFlags = summary
    .filter((entry) => alertFlags.has(entry.flag))
    .map((entry) => ({
      flag: entry.flag,
      count: entry.count,
      avg: entry.avg,
      max: entry.max,
      last: entry.last
    }));
  const record = {
    timestamp: Date.now(),
    thresholdMs: threshold,
    flags: Array.from(alertFlags),
    metrics: metricsForFlags
  };
  alertHistory.push(record);
  while (alertHistory.length > MAX_ALERT_HISTORY) {
    alertHistory.shift();
  }
  renderAlertHistorySection(true);
}

function renderHud(metrics) {
  renderAlertHistorySection(false);
  if (!hudList || !hudEmpty) return;
  hudList.textContent = "";
  if (!Array.isArray(metrics) || metrics.length === 0) {
    hudEmpty.hidden = false;
    if (hudRoot) {
      hudRoot.setAttribute("data-alert-active", "false");
    }
    if (lastAlertFlags.size > 0) {
      lastAlertFlags = new Set();
      dispatchAlertEvent([], resolveAlertThreshold());
    }
    return;
  }
  hudEmpty.hidden = true;
  const summary = summarizeMetrics(metrics);
  const threshold = resolveAlertThreshold();
  const alertFlags = new Set();
  summary.forEach((entry) => {
    if (
      threshold >= 0 &&
      (entry.last >= threshold || entry.max >= threshold || entry.avg >= threshold)
    ) {
      alertFlags.add(entry.flag);
    }
  });
  summary.slice(0, 8).forEach((entry) => {
    const item = document.createElement("li");
    if (alertFlags.has(entry.flag)) {
      item.classList.add("debug-flag-hud__alert");
    }
    item.innerHTML = `<strong>${entry.flag}</strong><br>avg ${formatDuration(entry.avg)} • last ${formatDuration(entry.last)} • max ${formatDuration(entry.max)} • n=${entry.count}`;
    hudList.appendChild(item);
  });
  if (hudRoot) {
    hudRoot.setAttribute("data-alert-active", alertFlags.size > 0 ? "true" : "false");
  }
  if (!setsEqual(lastAlertFlags, alertFlags)) {
    lastAlertFlags = new Set(alertFlags);
    if (alertFlags.size > 0) {
      recordAlertHistory(summary, alertFlags, threshold);
    }
    dispatchAlertEvent(Array.from(alertFlags), threshold);
  }
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
  hudHistorySection = null;
  hudHistoryList = null;
  hudHistoryEmpty = null;
}

function setExportStatus(status) {
  if (!hudRoot) return;
  hudRoot.setAttribute("data-export-status", status);
}

function fallbackDownload(payload) {
  if (typeof document === "undefined" || typeof URL === "undefined") {
    return false;
  }
  try {
    const blob = new Blob([payload], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `debug-flag-alerts-${Date.now()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    return true;
  } catch (error) {
    if (typeof console !== "undefined" && console.warn) {
      console.warn("[debugFlagPerf] Failed to download alert history", error);
    }
    return false;
  }
}

function writeToClipboard(payload) {
  if (typeof navigator !== "undefined" && navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard
      .writeText(payload)
      .then(() => true)
      .catch(() => false);
  }
  return Promise.resolve(false);
}

function exportAlertHistory() {
  if (alertHistory.length === 0) {
    return Promise.resolve(false);
  }
  const payload = JSON.stringify(alertHistory, null, 2);
  return writeToClipboard(payload).then((copied) => {
    if (copied) {
      return true;
    }
    return Promise.resolve(fallbackDownload(payload));
  });
}
