## Status
- Running `npx vitest run tests/classicBattle/resolution.test.js` currently reports four failing tests (`score updates after auto-select on expiry`, `timer expiry falls back to store stats when DOM is obscured`, `scoreboard reconciles directly to round result`, and `match end forwards outcome to end modal`).
- At the moment none of these tests see the mocked `computeRoundResult`, the stat buttons never materialize, and the mocked `roundResolved` handler is never wired — all symptoms point to the harness falling back to the real runtime path.

## Investigation
- The integration harness resets modules (`vi.resetModules()`) during `setup()`, which runs before the tests register their mocks when we call `createClassicBattleHarness()` and then import `battleClassic.init.js`. As a result, the `vi.doMock` calls defined in `tests/classicBattle/resolution.test.js` are undone and the real timer/round resolver modules stay in place.
- Without the mocks, `beginSelectionTimer()` runs the non-Vitest branch and never reaches `computeRoundResult`, so the expectations on the spy fail. The scoreboard also never renders stat buttons, and `onBattleEvent` never receives the `roundResolved` handler.
- Confirmed that the tests already set `globalThis.__TEST__` and `process.env.VITEST` so the Vitest timer branch could run if the mocks were preserved, reinforcing that mock registration timing is the missing piece.

## Next steps
1. Update the harness (or test setup) so that the per-test mock map is registered *after* `vi.resetModules()` but *before* the first import. One approach is to pass the `mocks` object into `createClassicBattleHarness({ mocks })` so the harness can register them internally after reset. Another option is to architect `mockModules` to register via a harness hook executed inside `setup()`.
2. Verify that the mocked `computeRoundResult` and `roundSelectModal` now remain in place, then re-run `npx vitest run tests/classicBattle/resolution.test.js` to confirm the four failing cases resolve.
3. After the mocks stick, confirm the stat buttons render and the `roundResolved` handler is registered so the remaining assertions pass.
