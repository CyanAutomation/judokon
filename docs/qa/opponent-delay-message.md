# Opponent Delay Message QA Guide

The `opponentDelayMessage` flag controls when the “Opponent is choosing…” snackbar appears during Classic Battle. When enabled, the snackbar is deferred by the configured delay so testers can confirm pacing; when disabled, it fires immediately.

## Enablement

1. Toggle **Opponent Delay Message** on/off in Settings → Advanced _before_ loading `battleClassic.html`, or inject `window.__FF_OVERRIDES = { opponentDelayMessage: true }` prior to navigation.
2. Optionally set custom delays for local testing:
   ```js
   window.__OPPONENT_RESOLVE_DELAY_MS = 1500; // milliseconds before the opponent response
   window.__MIN_OPPONENT_MESSAGE_DURATION_MS = 750; // minimum time the snackbar stays visible
   ```
3. Reload the Classic Battle page so the overrides are respected during bootstrap.

## Verification Steps

### When the flag is **enabled**

1. Start a match (Quick/Medium/Long) and wait for stat buttons to become ready.
2. Select any stat. The snackbar should **not** appear immediately.
3. After the configured delay expires, the snackbar displays “Opponent is choosing…” and `window.__battleClassicOpponentPromptFallback` clears.
4. Timing markers update:
   - `recordOpponentPromptTimestamp` is called once the delay elapses (tracked in `tests/helpers/classicBattle/opponentPromptWaiter.test.js`).
   - `document.body.dataset.battleState` transitions through `waitingForOpponentAction` before the reveal event.

### When the flag is **disabled**

1. Clear any overrides and reload with `opponentDelayMessage` off.
2. Select a stat. The snackbar should fire immediately with no deferred timer.

## Automation Hooks

- Unit coverage:
  - `tests/components/opponentChoosing.spec.js` (immediate vs deferred snackbar)
  - `tests/classicBattle/opponent-message-handler.improved.test.js`
- Runtime helpers:
  - `prepareUiBeforeSelection` in `src/pages/battleClassic.init.js`
  - Event wiring in `src/helpers/classicBattle/uiEventHandlers.js`

Use these references when building additional probes (e.g., Playwright orchestrator tests) to assert the delay timing without duplicating logic.

## Troubleshooting

- If the snackbar never appears with the flag enabled, check that `window.__OPPONENT_RESOLVE_DELAY_MS` is a positive number or remove it to fall back to `getOpponentDelay()` defaults.
- For immediate snackbar despite the flag being on, ensure the stat selection event passed `delayOpponentMessage !== false`— custom orchestrators can override this per event.
- Remember to call `clearOpponentPromptFallbackTimer()` between tests; hanging timeouts can keep the old behavior alive.
