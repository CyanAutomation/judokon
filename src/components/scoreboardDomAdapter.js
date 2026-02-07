/**
 * Create DOM adapter for scoreboard core.
 *
 * @pseudocode
 * 1. Register and track event listeners in subscribe().
 * 2. Render incoming view models through ScoreboardModel/ScoreboardView.
 * 3. Remove listeners and destroy the view during dispose().
 *
 * @param {{model: {updateScore: (player:number,opponent:number) => void}, view: {updateScore: () => void, destroy?: () => void}, eventTarget?: EventTarget|null}} deps - Adapter dependencies.
 * @returns {{subscribe: (events: Record<string, Function>) => () => void, render: (viewModel: {score?: {player:number,opponent:number}}) => void, dispose: () => void}}
 */
export function createScoreboardDomAdapter({ model, view, eventTarget = null }) {
  /** @type {Array<{type:string, listener: EventListener}>} */
  const listeners = [];

  const removeAllListeners = () => {
    if (!eventTarget || typeof eventTarget.removeEventListener !== "function") {
      listeners.length = 0;
      return;
    }
    for (const { type, listener } of listeners) {
      eventTarget.removeEventListener(type, listener);
    }
    listeners.length = 0;
  };

  return {
    subscribe(events) {
      if (!eventTarget || typeof eventTarget.addEventListener !== "function") {
        return () => {};
      }
      for (const [type, handler] of Object.entries(events || {})) {
        const listener = (event) => {
          handler(event?.detail ?? {});
        };
        listeners.push({ type, listener });
        eventTarget.addEventListener(type, listener);
      }
      return () => {
        removeAllListeners();
      };
    },
    render(viewModel = {}) {
      if (!viewModel.score) {
        return;
      }
      const { player, opponent } = viewModel.score;
      model.updateScore(player, opponent);
      view.updateScore();
    },
    dispose() {
      removeAllListeners();
      if (typeof view.destroy === "function") {
        view.destroy();
      }
    }
  };
}
