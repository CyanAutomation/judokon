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
 * Resolve a stat button selector for a given player and statKey.
 * If statKey is omitted, returns the per-player stat buttons selector.
 */
export function statButton(playerIndex, statKey) {
  const entry = findEntryByLogicalName("statButton");
  if (!entry) {
    if (typeof statKey !== "undefined")
      return `#stat-buttons button[data-player="${playerIndex}"][data-stat="${statKey}"]`;
    return `#stat-buttons button[data-player="${playerIndex}"]`;
  }
  let sel = entry.selector;
  // Replace data-player placeholder if present
  sel = sel.replace(/\[data-player\]/, `[data-player=\"${playerIndex}\"]`);
  if (typeof statKey !== "undefined") {
    sel = sel
      .replace(/\[data-stat\]/, `[data-stat=\"${statKey}\"]`)
      .replace(/\[data-stat\]/g, `[data-stat=\"${statKey}\"]`);
    // If original selector used generic attribute, ensure it's applied
    if (!/data-stat/.test(sel)) {
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
