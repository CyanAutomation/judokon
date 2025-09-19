# Unit Test Failure Investigation: scheduleNextRound auto-dispatch

## Analysis
- Failure occurs in `tests/helpers/classicBattle/scheduleNextRound.test.js` when asserting `getterInfo?.sourceReadDebug === "function"`.
- `debugRead("handleNextRoundMachineGetter")` now returns `undefined` because `createMachineReader()` short-circuits when a `getClassicBattleMachine` override is supplied.
- The override is provided by `cooldownEnter(machine)` (`src/helpers/classicBattle/stateHandlers/cooldownEnter.js:23-32`), which passes `getClassicBattleMachine: () => machine` into `startCooldown()`.
- `startCooldown()` forwards that override to `createMachineReader()` (`src/helpers/classicBattle/roundManager.js:303-358, 463-521`).
- Inside `createMachineReader()` (`src/helpers/classicBattle/nextRound/expirationHandlers.js:92-134`), when an explicit getter override exists (i.e., `typeof getClassicBattleMachine === "function"` is true), the function returns early after emitting `handleNextRoundMachineGetterOverride`. This bypasses the logic that emits `handleNextRoundMachineGetter` with the `sourceReadDebug` value, thus the telemetry payload is never produced.

## Proposed Fix Steps
1. Update `createMachineReader()` (or its override branch) so it still records `handleNextRoundMachineGetter` telemetry with a `sourceReadDebug` value when an explicit getter override is provided.
2. Ensure the telemetry payload mirrors the previous structure (`{ sourceReadDebug: "function", hasGlobal: ... }`) to satisfy the test expectations.
3. Re-run `tests/helpers/classicBattle/scheduleNextRound.test.js` to confirm the assertion passes and verify no regressions in the broader suite as needed.
