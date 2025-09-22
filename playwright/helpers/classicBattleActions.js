import selectors from "./selectors.js";

/**
 * Choose a stat button for the player that guarantees a win for deterministic tests.
 *
 * @pseudocode
 * wait until the battle store exposes current judoka stats
 * determine the stat with the largest player-vs-opponent delta
 * if no positive delta exists, boost the player's stat above the opponent's
 * click the resolved stat button for the player
 * return the stat key so callers can perform follow-up assertions
 *
 * @param {import("@playwright/test").Page} page - Active Playwright page.
 * @param {{ playerIndex?: number }} [options] - Player index (defaults to 0 for the user).
 * @returns {Promise<string>} Resolves with the selected stat key.
 */
export async function selectWinningStat(page, { playerIndex = 0, statKey: preferredStat } = {}) {
  await waitForBattleStats(page);

  const statKey = await page.evaluate(resolveWinningStatInPage, {
    statKey: preferredStat
  });

  if (!statKey) {
    throw new Error("Unable to determine a winning stat for the current round.");
  }

  const button = page.locator(selectors.statButton(playerIndex, statKey)).first();
  await button.waitFor({ state: "visible" });
  await button.click();

  return statKey;
}

async function waitForBattleStats(page) {
  await page.waitForFunction(() => {
    const store = window.battleStore;
    const player = store?.currentPlayerJudoka;
    const opponent = store?.currentOpponentJudoka;
    return Boolean(player?.stats && opponent?.stats);
  });
}

function resolveWinningStatInPage({ statKey } = {}) {
  const store = window.battleStore;
  const playerStats = { ...(store?.currentPlayerJudoka?.stats || {}) };
  const opponentStats = store?.currentOpponentJudoka?.stats || {};
  const statKeys = Object.keys(playerStats);
  if (statKeys.length === 0) {
    return null;
  }

  const deltaFor = (key) => {
    const playerValue = Number(playerStats[key]);
    const opponentValue = Number(opponentStats[key]);
    const safePlayer = Number.isFinite(playerValue) ? playerValue : 0;
    const safeOpponent = Number.isFinite(opponentValue) ? opponentValue : 0;
    return safePlayer - safeOpponent;
  };

  const normalizedKey = statKey && statKeys.includes(statKey) ? statKey : null;
  const bestKey = normalizedKey
    ? normalizedKey
    : statKeys.reduce((currentBest, key, index) => {
        if (index === 0) {
          return key;
        }
        return deltaFor(key) > deltaFor(currentBest) ? key : currentBest;
      }, statKeys[0]);

  if (!bestKey) {
    return null;
  }

  if (deltaFor(bestKey) <= 0) {
    const opponentValue = Number(opponentStats[bestKey]) || 0;
    if (store?.currentPlayerJudoka?.stats) {
      store.currentPlayerJudoka.stats[bestKey] = opponentValue + 1;
    }
  }

  return bestKey;
}
