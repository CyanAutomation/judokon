const ROUND_PATTERN = /Round\s+(\d+)/i;

/**
 * Read the scoreboard round number from the provided locator.
 *
 * @pseudocode
 * 1. Read the locator text.
 * 2. Delegate to the text parser to extract a numeric round.
 * 3. Return the parsed number or null when unavailable.
 *
 * @param {import('@playwright/test').Locator} roundLocator
 * @returns {Promise<number|null>}
 */
export async function readScoreboardRound(roundLocator) {
  const text = await roundLocator.textContent();
  return parseScoreboardRound(text);
}

/**
 * Parse a scoreboard label for the round number.
 *
 * @param {string|null} text
 * @returns {number|null}
 */
export function parseScoreboardRound(text) {
  if (!text) return null;
  const match = String(text).match(ROUND_PATTERN);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}
