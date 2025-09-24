/**
 * Parse the scoreboard text into discrete player and opponent scores.
 *
 * @param {string} value - The raw text content from the scoreboard display.
 * @returns {{ player: number, opponent: number }} Parsed player/opponent scores.
 * @pseudocode
 * parseScores(value):
 *   playerMatch <- match "You:" followed by digits (case-insensitive)
 *   opponentMatch <- match "Opponent:" followed by digits (case-insensitive)
 *   return {
 *     player: playerMatch exists ? number(playerMatch[1]) : NaN,
 *     opponent: opponentMatch exists ? number(opponentMatch[1]) : NaN
 *   }
 */
export function parseScores(value) {
  const playerMatch = value.match(/You:\s*(\d+)/i);
  const opponentMatch = value.match(/Opponent:\s*(\d+)/i);
  return {
    player: playerMatch ? Number(playerMatch[1]) : Number.NaN,
    opponent: opponentMatch ? Number(opponentMatch[1]) : Number.NaN
  };
}

/**
 * Build a safe regular expression that matches a complete scoreboard string.
 *
 * @param {number|string} player - The expected player score value.
 * @param {number|string} opponent - The expected opponent score value.
 * @returns {RegExp} A case-insensitive regex targeting the formatted scoreboard.
 * @pseudocode
 * buildScorePattern(player, opponent):
 *   escapedPlayer <- escapeRegex(String(player))
 *   escapedOpponent <- escapeRegex(String(opponent))
 *   pattern <- `You:\\s*${escapedPlayer}\\s+Opponent:\\s*${escapedOpponent}`
 *   return new RegExp(pattern, "i")
 */
export function buildScorePattern(player, opponent) {
  const escapeRegex = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`You:\\s*${escapeRegex(player)}\\s+Opponent:\\s*${escapeRegex(opponent)}`, "i");
}
