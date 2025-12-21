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
 * @pseudocode
 * - Query for element with id 'stat-buttons'
 * - Return null if element doesn't exist
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
 * @pseudocode
 * - Query container for all button elements with data-stat attribute
 * - Return empty array if container is null or query fails
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
 * @pseudocode
 * - Query for element with id 'next-button' or data-role 'next-round'
 * - Return null if element doesn't exist
 * @param {Document} [doc=document] - Optional document reference
 * @returns {HTMLElement | null}
 */
export function getNextButton(doc = document) {
  try {
    return (
      doc?.getElementById("next-button") || doc?.querySelector('[data-role="next-round"]') || null
    );
  } catch {
    return null;
  }
}

/**
 * Get the score display element.
 * @pseudocode
 * - Query for element with id 'score-display'
 * - Return null if element doesn't exist
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
 * @pseudocode
 * - Find player score element with data-side 'player' and data-part 'value'
 * - Extract and trim textContent
 * - Return undefined if scoreEl is null or query fails
 * @param {HTMLElement | null} scoreEl - The score display element
 * @returns {string | undefined}
 */
export function getPlayerScoreValue(scoreEl) {
  if (!scoreEl) return undefined;
  try {
    return scoreEl?.querySelector('[data-side="player"] [data-part="value"]')?.textContent?.trim();
  } catch {
    return undefined;
  }
}

/**
 * Get the opponent score value from score display.
 * @pseudocode
 * - Find opponent score element with data-side 'opponent' and data-part 'value'
 * - Extract and trim textContent
 * - Return undefined if scoreEl is null or query fails
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
 * @pseudocode
 * - Query for element with id 'next-round-timer'
 * - Return null if element doesn't exist
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
 * @pseudocode
 * - Query for value element with data-part 'value'
 * - Query for label element with data-part 'label'
 * - Return both as object with null fallbacks
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
 * @pseudocode
 * - Query for element with id 'home-button'
 * - Return null if element doesn't exist
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
 * @pseudocode
 * - Query for all anchor elements within header
 * - Return empty array if query fails
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
 * @pseudocode
 * - Query for element with id 'round-select-fallback'
 * - Return null if element doesn't exist
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
 * @pseudocode
 * - Query for element with id 'round-select-error'
 * - Return null if element doesn't exist
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
 * @pseudocode
 * - Query for element with id 'round-select-fallback'
 * - Return true if found, false otherwise
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
 * @pseudocode
 * - Query for element with id 'opponent-card'
 * - Return null if element doesn't exist
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
 * @pseudocode
 * - Query for element with id 'round-counter'
 * - Return null if element doesn't exist
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
 * @pseudocode
 * - Query for element with id 'replay-button'
 * - Return null if element doesn't exist
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
 * @pseudocode
 * - Query for element with id 'quit-button'
 * - Return null if element doesn't exist
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
 * @pseudocode
 * - Query for element with id 'battle-state-badge'
 * - Return null if element doesn't exist
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
 * @pseudocode
 * - Return null if descId is not provided
 * - Query for element with the specified descId
 * - Return null if element doesn't exist
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
