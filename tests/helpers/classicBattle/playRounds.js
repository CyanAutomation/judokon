/**
 * Repeat stat selection for a number of rounds.
 *
 * @param {Function} selectStat - selects the desired stat.
 * @param {number} times - number of rounds to play.
 * @returns {Promise<void>}
 * @pseudocode
 * for i from 0 to times
 *   await selectStat() // selectStat handles choosing the configured stat
 */
export async function playRounds(selectStat, times) {
  for (let i = 0; i < times; i++) {
    await selectStat("power");
  }
}
