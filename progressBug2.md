# Progress Log – Bug 2

## Summary
- Reproduced failing specs: `dispatchReadyViaBus > falls back to global dispatcher when override missing` and `dispatchReadyDirectly > prefers the shared battle dispatcher when available` in `tests/helpers/classicBattle/nextRound/expirationHandlers.test.js`.
- Failures stem from the classic “module cached before the mock/spies are applied” problem already documented in `ROOT_CAUSE_ANALYSIS.md`.

## Detailed Findings
1. `tests/setup.js:15-20` imports `initializeTestBindingsLight`, which immediately imports `src/helpers/classicBattle/eventDispatcher.js` via `testHooks.js:1-15`.  
2. The unit test mocks `eventDispatcher.js` (see `expirationHandlers.test.js:3-16`), but that `vi.mock(...)` executes **after** the setup file has already loaded the real module. Vitest retains the earlier module instance, so the mock never replaces `dispatchBattleEvent` for any helper that was imported during setup.  
3. `dispatchReadyViaBus()` resolves its dispatcher reference through `getGlobalDispatch()` (lines `368-401` of `expirationHandlers.js`). Because the cached module is real, `getGlobalDispatch()` returns the unmocked dispatcher, which immediately returns `false` in this test environment (no battle machine available). Result: the fallback path never observes a successful dispatch, so the test gets `false` instead of the expected `true`.  
4. `dispatchReadyDirectly()` (`expirationHandlers.js:492-620`) shares the same cached dispatcher reference. The “shared dispatcher” branch never succeeds, so `dedupeTracked` stays `false`, causing the second assertion failure.

## Root Cause
The dispatcher mock is registered too late. Any module imported before the mock is declared holds on to the original `dispatchBattleEvent` implementation, so resetting or spying on the module later has no effect—exactly the top-level import timing bug previously captured in `ROOT_CAUSE_ANALYSIS.md` (`lines 49-145`).

## Recommended Fix
1. Move the dispatcher mock into `tests/setup.js` **before** the `initializeTestBindingsLight` import, or restructure setup so `eventDispatcher.js` is only imported **after** tests configure mocks. That ensures every consumer, including `expirationHandlers.js`, receives the mocked dispatcher.
2. Alternatively (or additionally), make `expirationHandlers.js` fetch the dispatcher lazily (e.g., resolve from `globalThis` or a late dynamic import) so it observes Vitest’s replacement even if setup preloads the module.

## Additional Suggestions
- Audit other tests for the same anti-pattern (imports executed before `vi.resetModules()`/mocks). `ROOT_CAUSE_ANALYSIS.md` already documents two prior incidents; enforce a guideline that shared helpers never import battle modules before tests declare mocks.  
- Consider exposing a lightweight test hook to override the dispatcher via dependency injection rather than relying on global mocks. That would remove the ordering dependency entirely.
