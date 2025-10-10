# QA Report for `src/pages/battleClassic.html` – Updated

This revision reconciles the prior QA write-up with the current codebase and test suite. The previously documented “silent” card data failure is no longer reproducible: the live implementation surfaces load errors via dedicated UI, and regression coverage already protects that flow. The sections below document verified behaviour, assess the earlier fix plan, and note opportunities for further hardening.

---

## 1. Executive Summary

- **Current status:** Classic Battle boots successfully with the seeded data. When `judoka.json` fails to load, the user now receives a modal + retry affordance rather than an empty-state freeze (`loadJudokaData` rethrows `JudokaDataLoadError` and drives `showLoadError`; see `src/helpers/classicBattle/cardSelection.js:149-179`). No evidence of the “returns []” regression noted in the previous draft.
- **User impact:** A data fetch failure is interruptive but recoverable; the header navigation remains disabled until retry or reload because the flow assumes the modal path, not a total escape hatch.
- **Validation:** `npx vitest run` (targeted classic battle suite) and the Playwright smoke scenarios for Classic Battle both pass in the current workspace.
- **Residual risks:** Repeated load failures still rely on the retry modal without progress feedback, and the nav lock is only cleared after the first failure (repeat UX polish pending).

---

## 2. Key Findings (Verified)

### Data loading and retry path

- `loadJudokaData` throws on empty/malformed payloads and wraps unexpected errors in `JudokaDataLoadError`, resetting caches so retries fetch fresh data (`src/helpers/classicBattle/cardSelection.js:149-178`).
- `drawCards` propagates those failures; upstream callers catch them to avoid double-reporting while leaving the retry modal in place (`src/helpers/classicBattle/cardSelection.js:425-435` and `src/pages/battleClassic.init.js:1779-1785`).
- Unit tests exercise this flow, asserting that the retry modal appears and that retries re-sequence the JSON fetches (`tests/helpers/classicBattle/cardSelection.test.js:163-252`).

### Startup error handling

- The entire `init` sequence is wrapped in a top-level `try/catch` that surfaces fatal errors through `showFatalInitError`, while explicitly ignoring `JudokaDataLoadError` to avoid stacking duplicate UI (`src/pages/battleClassic.init.js:1679-1880`).
- A dedicated listener replays the round cycle when the retry modal dispatches `CARD_RETRY_EVENT`, ensuring the first successful fetch resumes normal flow (`src/pages/battleClassic.init.js:1665-1678`).

### Match completion experience

- `showEndModal` short-circuits if a modal already exists, preventing the duplicate-ID regression called out in the original report (`src/helpers/classicBattle/endModal.js:25-28`).
- The Playwright smoke test covers a full match loop and asserts the modal appears exactly once (`playwright/battle-classic/smoke.spec.js:3-58`), providing high-signal assurance for this behaviour.

---

## 3. Fix Plan Review & Adjustments

| Original phase | Status | Notes |
| -------------- | ------ | ----- |
| **Phase 1 – Immediate bugfix** (rethrow from `loadJudokaData`, handle errors in `drawCards`) | Already in place | Both behaviours are present and covered by tests; no additional action required beyond keeping coverage green. |
| **Phase 2 – Robust error handling** (global init catch, improved modal) | Complete | The current `init` guard and modal implementation match the intent. Focus should shift to UX polish when retries repeatedly fail. |
| **Phase 3 – Feature completion** (end-of-match modal) | Complete | Guard rail exists and E2E coverage verifies it. Remaining work is quality-of-life tuning rather than feature gap closure. |

Given the above, the actionable plan now centers on polish and resilience rather than foundational bug fixes.

---

## 4. Opportunities & Recommendations

- **Re-enable navigation on load failure fallback:** ✅ Implemented. `startRoundCycle` now unlocks header navigation and clears `data-battle-active` when it throws `JudokaDataLoadError`, with coverage in `tests/classicBattle/round-select.test.js` and Playwright `battle-classic/round-select.spec.js`.
- **Replace hot-path dynamic import:** ✅ Implemented. `isMatchEnded` is statically imported, eliminating the `await import()` in `startIfNotEnded` (`src/pages/battleClassic.init.js:21,1856`).
- **Harden modal telemetry without console noise:** ✅ Implemented. `showEndModal` now uses structured counters/Sentry logging and the smoke spec asserts on `window.__classicBattleEndModalCount` (`src/helpers/classicBattle/endModal.js:25-95`, `playwright/battle-classic/smoke.spec.js`).
- **Optional UX nicety:** The retry modal could indicate progress (disable the button while the retry is in flight, show a spinner) so users are less likely to spam retries; this is outside the original bug scope but would improve perceived robustness.

---

## 5. Validation Evidence

| Command | Result |
| ------- | ------ |
| `npx vitest run tests/classicBattle/bootstrap.test.js tests/classicBattle/page-scaffold.test.js tests/classicBattle/init-complete.test.js tests/classicBattle/round-select.test.js` | ✅ All 18 assertions passed |
| `npx playwright test playwright/battle-classic/bootstrap.spec.js playwright/battle-classic/round-select.spec.js playwright/battle-classic/smoke.spec.js` | ✅ All 4 scenarios passed (executed with elevated permissions to allow local web server binding) |

These suites cover the data-loading retry logic, UI scaffolding, and the end-of-match modal assertions referenced above.

---

## 6. Open Questions

- Do we want the retry modal to offer an explicit “Return to lobby” escape when repeated fetches fail? If so, UX guidance is needed for how to revert the nav lock and scoreboard state.
- Should the Classic Battle init hook emit structured telemetry (e.g., Sentry span) when `JudokaDataLoadError` occurs repeatedly? Current instrumentation only logs to the console via the modal code path.

The answers will clarify whether additional engineering work is required beyond the polish items listed in Section 4.
