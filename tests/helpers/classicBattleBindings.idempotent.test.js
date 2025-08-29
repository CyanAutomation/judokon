import { describe, it, expect } from 'vitest';

describe('__ensureClassicBattleBindings idempotency', () => {
  it('can be called multiple times without throwing', async () => {
    document.body.innerHTML = `
      <header class="header battle-header">
        <div id="scoreboard-left">
          <p id="round-message"></p>
          <p id="next-round-timer"></p>
          <p id="round-counter"></p>
        </div>
        <div id="scoreboard-right">
          <p id="score-display"><span>You: 0</span><span>Opponent: 0</span></p>
        </div>
      </header>
      <main>
        <section id="battle-area">
          <div id="player-card"></div>
          <div id="controls">
            <div id="stat-buttons">
              <button data-stat="power">Power</button>
              <button data-stat="speed">Speed</button>
              <button data-stat="technique">Technique</button>
              <button data-stat="kumikata">Kumi-kata</button>
              <button data-stat="newaza">Ne-waza</button>
            </div>
          </div>
          <div id="opponent-card"></div>
        </section>
      </main>`;

    const battle = await import('../../src/helpers/classicBattle.js');
    await expect(battle.__ensureClassicBattleBindings()).resolves.not.toThrow();
    await expect(battle.__ensureClassicBattleBindings()).resolves.not.toThrow();
  });
});

