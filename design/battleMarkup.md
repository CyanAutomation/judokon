# Classic Battle Markup

Classic battle pages rely on specific element IDs so helper scripts can attach listeners and update the UI. The following IDs must be present for scripts to function.

## Required IDs

| ID                      | Purpose                                                                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `round-message`         | Announces prompts and round outcomes.                                                                                                                        |
| `next-round-timer`      | Displays the inter-round countdown.                                                                                                                          |
| `round-counter`         | Shows current round number.                                                                                                                                  |
| `score-display`         | Lists player and opponent scores.                                                                                                                            |
| `test-mode-banner`      | Indicates when test mode is active.                                                                                                                          |
| `debug-panel`           | Collapsible container for debugging info.                                                                                                                    |
| `debug-output`          | `<pre>` element inside the debug panel.                                                                                                                      |
| `battle-area`           | Wrapper containing player and opponent cards.                                                                                                                |
| `player-card`           | Container for the player's card.                                                                                                                             |
| `opponent-card`         | Container for the opponent's card.                                                                                                                           |
| `stat-buttons`          | Group of stat selection buttons.                                                                                                                             |
| `round-result`          | Displays the result of the round.                                                                                                                            |
| `next-button`           | Advances to the next round when ready; also uses `data-role="next-round"`. Pressing it always skips the cooldown regardless of the `skipRoundCooldown` flag. |
| `stat-help`             | Opens stat selection help.                                                                                                                                   |
| `quit-match-button`     | Triggers the quit match flow.                                                                                                                                |
| `battle-state-progress` | Optional list tracking match state transitions; pre-populates from the current state and remaps interrupts to core states.                                   |

### Data attributes and test hooks

The `id="next-button"` control must also specify `data-role="next-round"` and `data-testid="next-button"` so scripts and tests can reliably target it. Other battle controls follow the same `data-testid` pattern: `id="stat-help"` pairs with `data-testid="stat-help"` and `id="quit-match-button"` with `data-testid="quit-match"`. These requirements are enforced in the DOM tests at [`tests/pages/battlePages.dom.test.js`](../tests/pages/battlePages.dom.test.js).

## Example Markup

```html
<div id="stat-buttons" role="group" aria-label="Select a stat to battle">
  <button data-stat="power"></button>
  <!-- additional stat buttons -->
</div>

<div class="action-buttons">
  <button id="next-button" data-role="next-round" class="battle-control-button" disabled>
    Next
  </button>
  <button id="stat-help" class="battle-control-button" aria-label="Stat selection help">?</button>
  <button id="quit-match-button" class="battle-control-button">Quit Match</button>
</div>
```
