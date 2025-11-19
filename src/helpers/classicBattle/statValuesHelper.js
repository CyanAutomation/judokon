/**
 * Stat value resolution utilities for round UI.
 *
 * Provides helpers for consistently retrieving and normalizing stat values
 * from player/opponent cards.
 *
 * @module statValuesHelper
 */

import { getCardStatValue } from "./cardStatUtils.js";
import { getOpponentJudoka } from "./cardSelection.js";

/**
 * Resolve stat values for both player and opponent cards.
 *
 * @pseudocode
 * 1. Get player stat value directly from card element.
 * 2. Get opponent stat value from card, fallback to judoka data.
 * 3. Return normalized values or handle missing data gracefully.
 *
 * @param {HTMLElement} playerCard - Player card element
 * @param {HTMLElement} opponentCard - Opponent card element
 * @param {string} stat - Stat name to retrieve
 * @returns {{
 *   playerVal: number,
 *   opponentVal: number
 * }}
 */
export function resolveStatValues(playerCard, opponentCard, stat) {
  const playerVal = getCardStatValue(playerCard, stat);
  let opponentVal = getCardStatValue(opponentCard, stat);

  try {
    const opp = getOpponentJudoka();
    if (opp?.stats) {
      const raw = Number(opp.stats[stat]);
      if (Number.isFinite(raw)) {
        opponentVal = raw;
      }
    }
  } catch {
    // Silently fall back to card-based value
  }

  return { playerVal, opponentVal };
}
