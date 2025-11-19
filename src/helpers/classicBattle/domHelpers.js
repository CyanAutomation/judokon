/**
 * @summary DOM helper utilities for opponent card management.
 * @module domHelpers
 */

import { OPPONENT_PLACEHOLDER_ID } from "./opponentPlaceholder.js";

/**
 * @summary Get the opponent card container element from the DOM.
 *
 * @description Retrieves the opponent card container by ID, returning null on error or if document unavailable.
 *
 * @pseudocode
 * 1. Return null if document is undefined.
 * 2. Safely query and return the opponent-card element.
 * 3. Catch any errors and return null.
 *
 * @returns {HTMLElement|null} The opponent card container or null if not found.
 */
export function getOpponentCardContainer() {
  if (typeof document === "undefined") return null;
  try {
    return document.getElementById("opponent-card");
  } catch {
    return null;
  }
}

/**
 * @summary Determine whether the container currently holds a rendered opponent card.
 *
 * @description Safely queries the container for a judoka card element, returning false on error.
 *
 * @pseudocode
 * 1. Return false if container is null or lacks querySelector.
 * 2. Query for .judoka-card selector.
 * 3. Return true if found, false otherwise or on error.
 *
 * @param {HTMLElement|null} container - The container to inspect.
 * @returns {boolean} True when a real opponent card is present.
 */
export function hasRealOpponentCard(container) {
  if (!container || typeof container.querySelector !== "function") return false;
  try {
    return !!container.querySelector(".judoka-card");
  } catch {
    return false;
  }
}

/**
 * @summary Determine whether the container has an opponent placeholder element.
 *
 * @description Safely queries the container for a placeholder element by ID.
 *
 * @pseudocode
 * 1. Return false if container is null or lacks querySelector.
 * 2. Query for the placeholder ID selector.
 * 3. Return true if found, false otherwise or on error.
 *
 * @param {HTMLElement|null} container - The container to inspect.
 * @returns {boolean} True when a placeholder element exists.
 */
export function hasOpponentPlaceholder(container) {
  if (!container || typeof container.querySelector !== "function") return false;
  try {
    return !!container.querySelector(`#${OPPONENT_PLACEHOLDER_ID}`);
  } catch {
    return false;
  }
}

/**
 * @summary Hide the opponent container when a real opponent card is visible.
 *
 * @description Adds or removes the opponent-hidden class based on card presence.
 *
 * @pseudocode
 * 1. Return null if container is null.
 * 2. If a real opponent card exists, add opponent-hidden class and return container.
 * 3. Otherwise remove opponent-hidden class and return container.
 * 4. Silently ignore classList errors.
 *
 * @param {HTMLElement|null} container - The container to potentially hide.
 * @returns {HTMLElement|null} The container reference for chaining.
 */
export function hideOpponentCardIfRealVisible(container) {
  if (!container) return null;
  if (hasRealOpponentCard(container)) {
    try {
      container.classList.add("opponent-hidden");
    } catch {
      // Silently ignore errors when modifying classList
    }
    return container;
  }
  try {
    container.classList.remove("opponent-hidden");
  } catch {
    // Silently ignore errors when modifying classList
  }
  return container;
}

/**
 * @summary Ensure the opponent placeholder remains visible when no real card is rendered.
 *
 * @description Removes the opponent-hidden class when placeholder exists and no real card is present.
 *
 * @pseudocode
 * 1. Return early if container is null.
 * 2. Check if placeholder exists and real card does not exist.
 * 3. Remove opponent-hidden class and silently ignore errors.
 *
 * @param {HTMLElement|null} container - The container whose visibility should be adjusted.
 * @returns {void}
 */
export function ensureOpponentPlaceholderVisibility(container) {
  if (!container) return;
  if (hasOpponentPlaceholder(container) && !hasRealOpponentCard(container)) {
    try {
      container.classList.remove("opponent-hidden");
    } catch {
      // Silently ignore errors when modifying classList
    }
  }
}
