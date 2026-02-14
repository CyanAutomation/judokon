const noop = () => {};

/**
 * Create framework-agnostic scoreboard core state manager.
 *
 * @pseudocode
 * 1. Store immutable scoreboard state in local closure.
 * 2. Optionally subscribe adapter event handlers on start.
 * 3. Apply score patches and render only when values change.
 * 4. Dispose subscriptions and adapter resources on teardown.
 *
 * @param {{subscribe?: (events: Record<string, Function>) => (() => void)|void, render: (viewModel: object) => void, dispose?: () => void}} adapter - Adapter implementation.
 * @returns {{start: () => void, updateScore: (player:number,opponent:number) => void, render: (patch?: {score?: {player:number,opponent:number}}) => void, getState: () => {score:{player:number,opponent:number}}, dispose: () => void}}
 */
export function createScoreboardCore(adapter) {
  let state = { score: { player: 0, opponent: 0 } };
  let unsubscribe = noop;

  const safeNumber = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  const applyScore = (player, opponent) => {
    const nextPlayer = safeNumber(player);
    const nextOpponent = safeNumber(opponent);
    if (nextPlayer === null || nextOpponent === null) {
      return;
    }
    const unchanged = state.score.player === nextPlayer && state.score.opponent === nextOpponent;
    if (unchanged) {
      return;
    }
    state = {
      score: {
        player: nextPlayer,
        opponent: nextOpponent
      }
    };
    adapter.render({ score: { ...state.score } });
  };

  const eventHandlers = {
    "score.update": (detail = {}) => {
      applyScore(detail.player, detail.opponent);
    }
  };

  return {
    start() {
      if (typeof adapter.subscribe === "function") {
        const disposeSubscription = adapter.subscribe(eventHandlers);
        unsubscribe = typeof disposeSubscription === "function" ? disposeSubscription : noop;
      }
    },
    updateScore(player, opponent) {
      applyScore(player, opponent);
    },
    render(patch = {}) {
      // Validate and process score patch if present
      if (patch.score) {
        // Only update if both player and opponent are provided
        const nextPlayer = safeNumber(patch.score.player);
        const nextOpponent = safeNumber(patch.score.opponent);
        if (nextPlayer === null || nextOpponent === null) {
          // If validation fails, don't pass score to adapter
          const patchWithoutScore = {};
          for (const key in patch) {
            if (key !== "score") {
              patchWithoutScore[key] = patch[key];
            }
          }
          if (Object.keys(patchWithoutScore).length > 0) {
            adapter.render(patchWithoutScore);
          }
          return;
        }
      }
      // Pass full patch to adapter for rendering
      adapter.render(patch);
      // Update internal score state if provided and valid
      if (patch.score) {
        applyScore(patch.score.player, patch.score.opponent);
      }
    },
    getState() {
      return { score: { ...state.score } };
    },
    dispose() {
      unsubscribe();
      unsubscribe = noop;
      if (typeof adapter.dispose === "function") {
        adapter.dispose();
      }
    }
  };
}
