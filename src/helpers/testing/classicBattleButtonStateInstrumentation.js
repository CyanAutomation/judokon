const HISTORY_LIMIT = 15;
const snapshots = [];
const snapshotsByPhase = Object.create(null);
let latestSnapshot = null;
let statButtonsApi = null;

function getWindow() {
  try {
    return typeof window !== "undefined" ? window : undefined;
  } catch {
    return undefined;
  }
}

function getDocument() {
  try {
    return typeof document !== "undefined" ? document : undefined;
  } catch {
    return undefined;
  }
}

function cloneSnapshot(snapshot) {
  if (!snapshot) return null;
  return { ...snapshot };
}

function getStatButtonsContainer() {
  const doc = getDocument();
  if (!doc) return null;
  try {
    return doc.getElementById("stat-buttons") ?? doc.querySelector("[data-testid='stat-buttons']");
  } catch {
    return null;
  }
}

function readButtonState(button) {
  const container = getStatButtonsContainer();
  let ariaDisabled = null;
  try {
    if (button && typeof button.getAttribute === "function") {
      const value = button.getAttribute("aria-disabled");
      if (value === "true") ariaDisabled = true;
      else if (value === "false") ariaDisabled = false;
    }
  } catch {
    ariaDisabled = null;
  }

  const selectionAttr = container?.dataset?.selectionInProgress ?? null;
  const buttonsReady = container?.dataset?.buttonsReady ?? null;

  return {
    disabled: typeof button?.disabled === "boolean" ? button.disabled : null,
    hasDisabledAttr: Boolean(button?.hasAttribute?.("disabled")),
    hasDisabledClass: Boolean(button?.classList?.contains?.("disabled")),
    ariaDisabled,
    stat: button?.dataset?.stat ?? null,
    selectionAttr,
    buttonsReadyAttr: buttonsReady,
    selectionInProgress: selectionAttr === "true",
    buttonsReady: buttonsReady === "true"
  };
}

function buildSnapshot(phase, button) {
  return {
    phase,
    timestamp: Date.now(),
    ...readButtonState(button)
  };
}

function getStatButtonsApi() {
  if (statButtonsApi) {
    return statButtonsApi;
  }
  statButtonsApi = {
    getPhaseSnapshot(phase) {
      const key = typeof phase === "string" ? phase : String(phase ?? "");
      if (!key) return null;
      return cloneSnapshot(snapshotsByPhase[key]);
    },
    getLatestSnapshot() {
      return cloneSnapshot(latestSnapshot);
    },
    getSnapshotHistory() {
      return snapshots.map((snapshot) => cloneSnapshot(snapshot));
    },
    clearSnapshots() {
      clearSnapshotsInternal();
      return true;
    }
  };
  Object.defineProperty(statButtonsApi, "__classicBattleStatApi", {
    value: true,
    enumerable: false,
    configurable: true
  });
  return statButtonsApi;
}

function attachApiToTestRoot(root) {
  if (!root || typeof root !== "object") {
    return null;
  }
  const state = (root.state = root.state || {});
  const api = getStatButtonsApi();
  if (state.statButtons === api) {
    return api;
  }
  state.statButtons = api;
  return api;
}

function ensureTestApiState(rootOverride) {
  if (rootOverride) {
    return attachApiToTestRoot(rootOverride);
  }
  const win = getWindow();
  if (!win) return null;
  const root = (win.__TEST_API = win.__TEST_API || {});
  return attachApiToTestRoot(root);
}

function clearSnapshotsInternal() {
  snapshots.length = 0;
  latestSnapshot = null;
  for (const key of Object.keys(snapshotsByPhase)) {
    delete snapshotsByPhase[key];
  }
}

function storeSnapshot(snapshot) {
  const phase = snapshot.phase;
  snapshotsByPhase[phase] = snapshot;
  latestSnapshot = snapshot;
  snapshots.push(snapshot);
  if (snapshots.length > HISTORY_LIMIT) {
    snapshots.shift();
  }
  ensureTestApiState();
}

/**
 * Capture a snapshot of the active stat button state for test diagnostics.
 *
 * @param {string} phase - Identifier describing when the snapshot was taken.
 * @param {HTMLButtonElement|null} button - The stat button associated with the snapshot.
 * @returns {void}
 * @pseudocode
 * 1. Normalize the `phase` label.
 * 2. Build a snapshot capturing DOM state for the target button.
 * 3. Store the snapshot in history for later inspection.
 */
export function recordClassicButtonStateSnapshot(phase, button) {
  const normalizedPhase = typeof phase === "string" ? phase : String(phase ?? "");
  if (!normalizedPhase) return;
  try {
    const snapshot = buildSnapshot(normalizedPhase, button);
    storeSnapshot(snapshot);
  } catch {}
}

/**
 * Reset all recorded stat button snapshots.
 *
 * @returns {void}
 * @pseudocode
 * 1. Ensure the Test API state segment exists.
 * 2. Invoke the API's `clearSnapshots` helper when available.
 * 3. Fallback to local cache clearing when the API is unavailable.
 */
export function clearClassicButtonSnapshots() {
  const api = ensureTestApiState();
  if (api) {
    api.clearSnapshots();
  } else {
    clearSnapshotsInternal();
  }
}

/**
 * Attach the stat button instrumentation API to the provided Test API root.
 *
 * @param {{ state?: object }|null} targetRoot - Object that should expose the API under `state.statButtons`.
 * @returns {{ clearSnapshots: () => boolean }|null}
 * @pseudocode
 * 1. Create the `state` segment when missing.
 * 2. Assign the shared stat button API implementation to `state.statButtons`.
 * 3. Return the attached API for convenience.
 */
export function attachClassicBattleStatButtonStateApi(targetRoot) {
  return ensureTestApiState(targetRoot);
}

if (typeof window !== "undefined") {
  ensureTestApiState();
}
