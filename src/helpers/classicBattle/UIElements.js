/**
 * UIElements.js
 *
 * Centralized DOM element access for Classic Battle page.
 * Provides safe getters for frequently accessed DOM elements.
 *
 * @pseudocode
 * - Provide getter functions for each major DOM element
 * - Return null gracefully if element doesn't exist
 * - Support both document and custom document parameter for testing
 */

/**
 * Get the stat buttons container.
 * @param {Document} [doc=document] - Optional document reference
 * @returns {HTMLElement | null}
 */
export function getStatButtonsContainer(doc = document) {
  try {
    return doc?.getElementById("stat-buttons") || null;
  } catch {
    return null;
  }
}

/**
 * Get all stat button elements within a container.
 * @param {HTMLElement | null} container - The container element
 * @returns {HTMLButtonElement[]}
 */
export function getStatButtons(container) {
  if (!container) return [];
  try {
    return Array.from(container.querySelectorAll("button[data-stat]")) || [];
  } catch {
    return [];
  }
}

/**
 * Get the next round button.
 * @param {Document} [doc=document] - Optional document reference
 * @returns {HTMLElement | null}
 */
export function getNextButton(doc = document) {
  try {
    return (
      doc?.getElementById("next-button") ||
      doc?.querySelector('[data-role="next-round"]') ||
      null
    );
  } catch {
    return null;
  }
}

/**
 * Get the score display element.
 * @param {Document} [doc=document] - Optional document reference
 * @returns {HTMLElement | null}
 */
export function getScoreDisplay(doc = document) {
  try {
    return doc?.getElementById("score-display") || null;
  } catch {
    return null;
  }
}

/**
 * Get the player score value from score display.
 * @param {HTMLElement | null} scoreEl - The score display element
 * @returns {string | undefined}
 */
export function getPlayerScoreValue(scoreEl) {
  if (!scoreEl) return undefined;
  try {
    return scoreEl
      ?.querySelector('[data-side="player"] [data-part="value"]')
      ?.textContent?.trim();
  } catch {
    return undefined;
  }
}

/**
 * Get the opponent score value from score display.
 * @param {HTMLElement | null} scoreEl - The score display element
 * @returns {string | undefined}
 */
export function getOpponentScoreValue(scoreEl) {
  if (!scoreEl) return undefined;
  try {
    return scoreEl
      ?.querySelector('[data-side="opponent"] [data-part="value"]')
      ?.textContent?.trim();
  } catch {
    return undefined;
  }
}

/**
 * Get the next round timer element.
 * @param {Document} [doc=document] - Optional document reference
 * @returns {HTMLElement | null}
 */
export function getNextRoundTimer(doc = document) {
  try {
    return doc?.getElementById("next-round-timer") || null;
  } catch {
    return null;
  }
}

/**
 * Get timer value and label parts.
 * @param {HTMLElement | null} timerEl - The timer element
 * @returns {{value: HTMLElement | null, label: HTMLElement | null}}
 */
export function getTimerParts(timerEl) {
  if (!timerEl) {
    return { value: null, label: null };
  }
  try {
    return {
      value: timerEl.querySelector('[data-part="value"]'),
      label: timerEl.querySelector('[data-part="label"]')
    };
  } catch {
    return { value: null, label: null };
  }
}

/**
 * Get the home button.
 * @param {Document} [doc=document] - Optional document reference
 * @returns {HTMLElement | null}
 */
export function getHomeButton(doc = document) {
  try {
    return doc?.getElementById("home-button") || null;
  } catch {
    return null;
  }
}

/**
 * Get all header links.
 * @param {Document} [doc=document] - Optional document reference
 * @returns {NodeListOf<HTMLElement>}
 */
export function getHeaderLinks(doc = document) {
  try {
    return doc?.querySelectorAll("header a") || [];
  } catch {
    return [];
  }
}

/**
 * Get the round select fallback button.
 * @param {Document} [doc=document] - Optional document reference
 * @returns {HTMLElement | null}
 */
export function getRoundSelectFallback(doc = document) {
  try {
    return doc?.getElementById("round-select-fallback") || null;
  } catch {
    return null;
  }
}

/**
 * Get the round select error message element.
 * @param {Document} [doc=document] - Optional document reference
 * @returns {HTMLElement | null}
 */
export function getRoundSelectError(doc = document) {
  try {
    return doc?.getElementById("round-select-error") || null;
  } catch {
    return null;
  }
}

/**
 * Check if round select fallback exists in DOM.
 * @param {Document} [doc=document] - Optional document reference
 * @returns {boolean}
 */
export function hasRoundSelectFallback(doc = document) {
  try {
    return Boolean(doc?.getElementById("round-select-fallback"));
  } catch {
    return false;
  }
}

/**
 * Get the opponent card element.
 * @param {Document} [doc=document] - Optional document reference
 * @returns {HTMLElement | null}
 */
export function getOpponentCard(doc = document) {
  try {
    return doc?.getElementById("opponent-card") || null;
  } catch {
    return null;
  }
}

/**
 * Get the round counter element.
 * @param {Document} [doc=document] - Optional document reference
 * @returns {HTMLElement | null}
 */
export function getRoundCounter(doc = document) {
  try {
    return doc?.getElementById("round-counter") || null;
  } catch {
    return null;
  }
}

/**
 * Get the replay button.
 * @param {Document} [doc=document] - Optional document reference
 * @returns {HTMLElement | null}
 */
export function getReplayButton(doc = document) {
  try {
    return doc?.getElementById("replay-button") || null;
  } catch {
    return null;
  }
}

/**
 * Get the quit button.
 * @param {Document} [doc=document] - Optional document reference
 * @returns {HTMLElement | null}
 */
export function getQuitButton(doc = document) {
  try {
    return doc?.getElementById("quit-button") || null;
  } catch {
    return null;
  }
}

/**
 * Get the battle state badge element.
 * @param {Document} [doc=document] - Optional document reference
 * @returns {HTMLElement | null}
 */
export function getBattleStateBadge(doc = document) {
  try {
    return doc?.getElementById("battle-state-badge") || null;
  } catch {
    return null;
  }
}

/**
 * Get a stat button description element.
 * @param {Document} [doc=document] - Optional document reference
 * @param {string} descId - The description element ID
 * @returns {HTMLElement | null}
 */
export function getStatDescription(doc = document, descId) {
  if (!descId) return null;
  try {
    return doc?.getElementById(descId) || null;
  } catch {
    return null;
  }
}
