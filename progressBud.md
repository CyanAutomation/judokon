# Investigation: header DOM availability and update locations

Date: 2025-09-08

Short goal
- Verify whether `header #score-display` and `header #round-message` exist during the failing Vitest runs and locate the code paths that attempt to update them.

Findings
- Tests create the header used by scoreboard/round-message via `tests/utils/testUtils.js`:
  - `createBattleHeader()` / `createScoreboardHeader()` build a `<header>` containing:
    - `<p id="round-message">`
    - `<p id="next-round-timer">`
    - `<p id="score-display">`
  - Tests append that header to `document.body` in their `beforeEach` (e.g. `statSelection.test.js`).

- DOM-updating code (the places that write to these elements):
  - `src/helpers/classicBattle/roundResolver.js`
    - `updateScoreboard(result)` dynamically imports `setupScoreboard.js` then, when running under Vitest, writes directly to `document.querySelector('header #score-display')`.
    - `emitRoundResolved(...)` emits display events and — under Vitest — writes `result.message` to `document.querySelector('header #round-message')`.
  - `src/helpers/api/battleUI.js`
    - `evaluateRound(...)` (engine path) and its fallback both attempt to write directly to `header #round-message` and `header #score-display` when `process.env.VITEST` is present and log debug info.

- Test harness wiring:
  - `tests/setup.js` mutes console and, importantly, imports `../src/helpers/classicBattle.js` via `__ensureClassicBattleBindings()` in `beforeEach` to bind dynamic handlers. In many test files the header is created and appended before the module is imported, so DOM exists before bindings run.
  - Tests also call `initClassicBattleTest({ afterMock: true })` in some setups which forces `__ensureClassicBattleBindings({ force: true })` so bindings are re-applied after mocks.

Immediate conclusion
- The header elements are created by the tests and present in the DOM before the battle module bindings run in the tests we inspected. The DOM-write code paths (in `roundResolver.js` and `battleUI.js`) are guarded by a Vitest check and do run when `process.env.VITEST` is set; they also log debug messages when active.

What I did not yet verify (next steps)
- Capture the Vitest stdout from a failing test to see the debug logs emitted by these code paths (to confirm the DOM-write branches actually execute).
- Confirm no subsequent code overwrites the textContent after these writes (look for other writes to the same selectors or for UI components that re-render later).
- Run the two failing tests (`matchEnd.test.js`, `statSelection.test.js`) locally to capture the exact ordering and logs.

Next recommended actions
1. Run the two failing tests with `VITEST` env and enable the test-only debug (they already log) and inspect logs to confirm whether the DOM writes happen and with what values.
2. If writes happen but the DOM ends up empty/0, search for later writes to the same selectors (or scoreboard component mounts) that could overwrite the values.
3. If writes do not happen, add a small failing assertion in one test to force printing the debug logs (or temporarily remove the `VITEST` guard to observe behavior).

Files referenced
- `tests/utils/testUtils.js` (creates header)
- `tests/helpers/classicBattle/statSelection.test.js` (appends header + runs flow)
- `tests/helpers/classicBattle/matchEnd.test.js`
- `src/helpers/classicBattle/roundResolver.js` (updateScoreboard, emitRoundResolved)
- `src/helpers/api/battleUI.js` (evaluateRound and fallback)
- `tests/setup.js` (test harness wiring)

Status
- Verified: header elements exist in test DOM setup — Done
- Located: DOM update code paths — Done
- Next: run failing tests and collect logs — Pending
