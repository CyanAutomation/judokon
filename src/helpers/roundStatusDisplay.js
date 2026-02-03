const DEFAULT_TIMER_LABEL = "Time Left:";
let messageLockedUntil = 0;

function getMessageEl() {
  try {
    return document.getElementById("round-message");
  } catch {
    return null;
  }
}

function getTimerEl() {
  try {
    return document.getElementById("next-round-timer");
  } catch {
    return null;
  }
}

function getRoundCounterEl() {
  try {
    return document.getElementById("round-counter");
  } catch {
    return null;
  }
}

function getRootEl(messageEl) {
  if (messageEl && typeof messageEl.closest === "function") {
    return messageEl.closest("header, .battle-header");
  }
  try {
    return document.querySelector("header, .battle-header");
  } catch {
    return null;
  }
}

function ensureLabelValueSpacing(container, labelSpan, valueSpan) {
  if (!container || !labelSpan || !valueSpan) return;
  const doc = container.ownerDocument || (typeof document !== "undefined" ? document : null);
  if (!doc) return;
  const labelText = String(labelSpan.textContent || "").trim();
  const valueText = String(valueSpan.textContent || "").trim();
  const separator = labelSpan.nextSibling;
  if (!labelText || !valueText) {
    if (separator && separator.nodeType === 3) {
      container.removeChild(separator);
    }
    return;
  }
  const needsSpace = !separator || separator.nodeType !== 3;
  if (needsSpace) {
    container.insertBefore(doc.createTextNode(" "), valueSpan);
  } else if (!/\s/.test(separator.textContent || "")) {
    separator.textContent = " ";
  }
}

function updateTimerElement(container, valueText, { labelText = DEFAULT_TIMER_LABEL } = {}) {
  if (!container) return;
  let labelSpan = container.querySelector('[data-part="label"]');
  const valueSpan = container.querySelector('[data-part="value"]');
  if (valueSpan) {
    if (!labelSpan && labelText) {
      try {
        const doc = container.ownerDocument || (typeof document !== "undefined" ? document : null);
        if (doc?.createElement) {
          const createdLabel = doc.createElement("span");
          createdLabel.dataset.part = "label";
          createdLabel.textContent = labelText;
          container.insertBefore(createdLabel, container.firstChild);
          labelSpan = createdLabel;
        }
      } catch {}
    }
    if (labelSpan) {
      labelSpan.textContent = valueText ? labelText : "";
    }
    valueSpan.textContent = valueText;
    ensureLabelValueSpacing(
      container,
      labelSpan || container.querySelector('[data-part="label"]'),
      valueSpan
    );
  } else {
    container.textContent = valueText ? `${labelText} ${valueText}` : "";
  }
}

/**
 * Show a round status message in the header.
 *
 * @pseudocode
 * 1. Respect the outcome lock to avoid overwriting recent results.
 * 2. Update the `#round-message` element text and outcome attributes.
 * 3. Mirror the outcome state onto the header root element.
 *
 * @param {string} text
 * @param {{ outcome?: boolean, outcomeType?: string }} [opts]
 * @returns {void}
 */
export function showMessage(text, opts = {}) {
  const now = Date.now();
  if (now < messageLockedUntil && !opts.outcome) return;
  const messageEl = getMessageEl();
  if (messageEl) {
    messageEl.textContent = text;
    if (opts.outcome) {
      messageEl.dataset.outcome = "true";
    } else {
      delete messageEl.dataset.outcome;
    }
  }
  const rootEl = getRootEl(messageEl);
  if (rootEl) {
    const type = typeof opts.outcomeType === "string" ? opts.outcomeType : null;
    if (opts.outcome && type) {
      rootEl.dataset.outcome = type;
    } else if (!opts.outcome) {
      rootEl.dataset.outcome = "none";
    }
  }
  messageLockedUntil = opts.outcome ? now + 1000 : 0;
}

/**
 * Clear the current round status message.
 *
 * @pseudocode
 * 1. Call `showMessage` with an empty string.
 *
 * @returns {void}
 */
export function clearMessage() {
  showMessage("");
}

/**
 * Show a temporary round status message.
 *
 * @pseudocode
 * 1. Display the message.
 * 2. Return a clearer that only clears if the text matches.
 *
 * @param {string} text
 * @returns {() => void}
 */
export function showTemporaryMessage(text) {
  showMessage(text);
  return () => {
    const messageEl = getMessageEl();
    if (messageEl && messageEl.textContent === text) {
      clearMessage();
    }
  };
}

/**
 * Update the round timer display.
 *
 * @pseudocode
 * 1. Write the remaining seconds into the timer element.
 * 2. Clear the label/value when the input is non-numeric.
 *
 * @param {number|string} seconds
 * @returns {void}
 */
export function updateTimer(seconds) {
  const timerEl = getTimerEl();
  if (!timerEl) return;
  if (typeof seconds === "number" && Number.isFinite(seconds)) {
    const clamped = Math.max(0, seconds);
    timerEl.setAttribute("data-remaining-time", String(clamped));
    updateTimerElement(timerEl, `${clamped}s`);
    return;
  }
  timerEl.removeAttribute("data-remaining-time");
  updateTimerElement(timerEl, "");
}

/**
 * Clear the round timer display.
 *
 * @pseudocode
 * 1. Delegate to `updateTimer` with empty input.
 *
 * @returns {void}
 */
export function clearTimer() {
  updateTimer("");
}

/**
 * Update the round counter display.
 *
 * @pseudocode
 * 1. Render `Round {n}` when the input is numeric.
 * 2. Clear the text when input is missing.
 *
 * @param {number|string} round
 * @returns {void}
 */
export function updateRoundCounter(round) {
  const roundCounterEl = getRoundCounterEl();
  if (!roundCounterEl) return;
  if (typeof round === "number") {
    roundCounterEl.textContent = `Round ${round}`;
  } else {
    roundCounterEl.textContent = "";
  }
}

/**
 * Clear the round counter display.
 *
 * @pseudocode
 * 1. Delegate to `updateRoundCounter` with empty input.
 *
 * @returns {void}
 */
export function clearRoundCounter() {
  updateRoundCounter("");
}

/**
 * Show an auto-selection message in the round status display.
 *
 * @pseudocode
 * 1. Format an auto-selected message.
 * 2. Delegate to `showMessage`.
 *
 * @param {string} stat
 * @returns {void}
 */
export function showAutoSelect(stat) {
  showMessage(`Auto-selected ${stat}`);
}
