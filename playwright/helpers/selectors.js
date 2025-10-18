import mapping from "../../design/dataSchemas/battleMarkup.generated.js";

function findEntryByLogicalName(name) {
  const entry = (mapping.entries || []).find(
    (e) => e.logicalName === name || e.dataTestId === name
  );
  return entry || null;
}

function selectorFor(name) {
  const entry = findEntryByLogicalName(name);
  return entry ? entry.selector : null;
}

export function roundMessage() {
  return selectorFor("roundMessage") || "header #round-message";
}

export function nextRoundTimer() {
  return selectorFor("nextRoundTimer") || "header #next-round-timer";
}

export function roundCounter() {
  return selectorFor("roundCounter") || "header #round-counter";
}

export function scoreDisplay() {
  return selectorFor("scoreDisplay") || "header #score-display";
}

export function snackbarContainer() {
  return selectorFor("snackbarContainer") || "#snackbar-container";
}

export function modalRoot() {
  return selectorFor("modalRoot") || "#modal-root";
}

export function playerCard(playerIndex) {
  const entry = findEntryByLogicalName("playerCard");
  if (!entry) return `.player-card[data-player="${playerIndex}"]`;
  return entry.selector.replace("[data-player]", `[data-player=\"${playerIndex}\"]`);
}

/**
 * Resolve a stat button selector for the shared stat controls. The current DOM
 * renders a single `#stat-buttons` group for both players, so filtering by
 * player is no longer supported.
 *
 * @pseudocode statButton(options?): string
 * @param {object|string|undefined} [options] - Either an options object or a
 * string `statKey` for convenience.
 * @param {string} [options.statKey] - Optional stat identifier to scope the
 * selector to a specific stat button.
 * @returns {string} Selector targeting the requested stat buttons.
 * @throws {TypeError} When a legacy player index argument is supplied.
 */
export function statButton(options) {
  if (typeof options === "number") {
    throw new TypeError(
      "statButton() no longer accepts a playerIndex argument. Remove the numeric argument and optionally pass { statKey }."
    );
  }

  const normalizedOptions =
    typeof options === "string" || typeof options === "undefined"
      ? { statKey: options }
      : options || {};

  const { statKey } = normalizedOptions;
  const entry = findEntryByLogicalName("statButton");
  let sel = entry
    ? entry.selector
    : "#stat-buttons button[data-stat]"; // Matches current classic battle markup.

  if (typeof statKey !== "undefined") {
    const dataStatPattern = /\[data-stat(?:=[^\]]*)?\]/g;

    if (dataStatPattern.test(sel)) {
      let replaced = false;
      sel = sel.replace(dataStatPattern, (segment) => {
        if (replaced) {
          // Remove subsequent data-stat fragments so we don't emit duplicate
          // attribute selectors like [data-stat="foo"][data-stat="foo"].
          return "";
        }

        replaced = true;
        return `[data-stat=\"${statKey}\"]`;
      });
    } else {
      sel += `[data-stat=\"${statKey}\"]`;
    }
  }

  return sel;
}

export default {
  roundMessage,
  nextRoundTimer,
  roundCounter,
  scoreDisplay,
  snackbarContainer,
  modalRoot,
  playerCard,
  statButton
};
