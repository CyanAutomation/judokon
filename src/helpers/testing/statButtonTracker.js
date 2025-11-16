const identityMap = new WeakMap();
let lastSnapshot = createEmptySnapshot();
const defaultDocument = typeof document !== "undefined" ? document : null;
const elementCtor = typeof HTMLElement === "function" ? HTMLElement : null;

function createEmptySnapshot() {
  return {
    capturedAt: null,
    containerReady: null,
    buttonCount: 0,
    buttons: []
  };
}

function cloneSnapshot(snapshot) {
  if (!snapshot) {
    return createEmptySnapshot();
  }
  return {
    capturedAt: snapshot.capturedAt,
    containerReady: snapshot.containerReady,
    buttonCount: snapshot.buttonCount,
    buttons: snapshot.buttons.map((btn) => ({ ...btn }))
  };
}

function ensureIdentity(button, index) {
  if (identityMap.has(button)) {
    return identityMap.get(button);
  }

  const baseParts = [];
  if (typeof button.id === "string" && button.id) {
    baseParts.push(button.id);
  }
  const statKey = button?.dataset?.stat;
  if (typeof statKey === "string" && statKey) {
    baseParts.push(statKey);
  }
  baseParts.push(String(index));
  const tokenBase = baseParts.join(":") || "stat-button";
  const token = `${tokenBase}#${(Date.now() + Math.random()).toString(36)}`;
  identityMap.set(button, token);
  return token;
}

function isElement(candidate) {
  if (!candidate) {
    return false;
  }
  if (!elementCtor) {
    return typeof candidate === "object";
  }
  return candidate instanceof elementCtor;
}

function normalizeButtons(collection) {
  if (!collection) {
    return [];
  }
  if (Array.isArray(collection)) {
    return collection.filter((btn) => isElement(btn));
  }
  return Array.from(collection).filter((btn) => isElement(btn));
}

function toButtonSnapshot(button, index) {
  const ariaDisabled =
    typeof button.getAttribute === "function" ? button.getAttribute("aria-disabled") : null;
  const snapshot = {
    id: ensureIdentity(button, index),
    stat: button?.dataset?.stat ?? null,
    testId: button?.dataset?.testid ?? null,
    disabled: button.disabled === true,
    ariaDisabled: ariaDisabled === "true",
    selected: Boolean(button?.classList?.contains("selected")),
    tabIndex: Number.isFinite(button.tabIndex) ? button.tabIndex : null,
    text: typeof button.textContent === "string" ? button.textContent.trim() : "",
    isConnected:
      typeof button.isConnected === "boolean"
        ? button.isConnected
        : defaultDocument
          ? button.ownerDocument === defaultDocument
          : null
  };
  return snapshot;
}

function createSnapshot(buttons, container) {
  const containerReady =
    container && typeof container.dataset === "object"
      ? container.dataset.buttonsReady === "true"
      : null;
  return {
    capturedAt: Date.now(),
    containerReady,
    buttonCount: buttons.length,
    buttons: buttons.map((btn, index) => toButtonSnapshot(btn, index))
  };
}

function storeSnapshot(snapshot) {
  lastSnapshot = snapshot;
  if (typeof window !== "undefined") {
    try {
      window.__STAT_BUTTON_SNAPSHOT__ = snapshot;
    } catch {}
  }
}

/**
 * Capture a normalized snapshot for the provided stat button collection.
 *
 * @pseudocode
 * 1. Normalize the buttons argument into a filtered array of HTMLElements.
 * 2. Build a snapshot object with stable identifiers and metadata for each button.
 * 3. Cache the snapshot for later reads and mirror it on `window` for debugging.
 *
 * @param {ArrayLike<HTMLElement>|HTMLElement[]|null|undefined} buttons - Button references to inspect.
 * @param {HTMLElement|null|undefined} container - Optional stat button container.
 * @returns {{ capturedAt: number, containerReady: boolean|null, buttonCount: number, buttons: Array }} Snapshot data.
 */
export function captureStatButtonSnapshot(buttons, container) {
  try {
    const normalized = normalizeButtons(buttons);
    const snapshot = createSnapshot(normalized, container);
    storeSnapshot(snapshot);
    return cloneSnapshot(snapshot);
  } catch {
    return cloneSnapshot(lastSnapshot);
  }
}

/**
 * Read the most recently captured stat button snapshot.
 *
 * @pseudocode
 * 1. Return a cloned copy of the last cached snapshot to avoid external mutation.
 *
 * @returns {{ capturedAt: number|null, containerReady: boolean|null, buttonCount: number, buttons: Array }} Snapshot data.
 */
export function readStatButtonSnapshot() {
  return cloneSnapshot(lastSnapshot);
}

/**
 * Query the DOM for current stat button state and cache a snapshot.
 *
 * @pseudocode
 * 1. Resolve the stat button container using test-friendly selectors.
 * 2. When present, capture the snapshot via the normalized helper; otherwise store an empty snapshot.
 * 3. Return a cloned snapshot for callers to consume.
 *
 * @returns {{ capturedAt: number, containerReady: boolean|null, buttonCount: number, buttons: Array }} Snapshot data.
 */
export function refreshStatButtonSnapshotFromDom() {
  if (typeof document === "undefined") {
    return readStatButtonSnapshot();
  }
  try {
    const container =
      document.querySelector("[data-testid='stat-buttons']") ?? document.getElementById("stat-buttons");
    if (!container) {
      const snapshot = createSnapshot([], null);
      storeSnapshot(snapshot);
      return cloneSnapshot(snapshot);
    }
    const buttons = container.querySelectorAll("[data-testid='stat-button'], button[data-stat]");
    const snapshot = createSnapshot(normalizeButtons(buttons), container);
    storeSnapshot(snapshot);
    return cloneSnapshot(snapshot);
  } catch {
    return readStatButtonSnapshot();
  }
}
