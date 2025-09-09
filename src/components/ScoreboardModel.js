export class ScoreboardModel {
  constructor() {
    this.score = { player: 0, opponent: 0 };
  }

  /**
   * Update stored player and opponent scores.
   *
   * @pseudocode
   * 1. Persist provided numbers to internal state.
   * 2. Return void.
   * @param {number} player - Player score.
   * @param {number} opponent - Opponent score.
   */
  updateScore(player, opponent) {
    this.score.player = player;
    this.score.opponent = opponent;
  }

  /**
   * Return a shallow copy of the scoreboard state.
   *
   * @pseudocode
   * 1. Clone score object.
   * 2. Return cloned state.
   * @returns {{score:{player:number,opponent:number}}}
   */
  getState() {
    return { score: { ...this.score } };
  }
}
