# Classic Battle Task Log

## Task Contract — 2025-10-06T21:06:22Z

```json
{
  "inputs": [
    "playwright/battle-classic/long-run-hang-probe.spec.js",
    "tests/helpers/classicBattle/roundLifecycle.sequence.test.js",
    "src/helpers/classicBattle/roundManager.js",
    "src/helpers/classicBattle/roundUI.js"
  ],
  "outputs": [
    "battleClassic.md"
  ],
  "success": [
    "targeted vitest: PASS",
    "targeted playwright: PASS",
    "no new telemetry warnings"
  ],
  "errorMode": "ask_on_public_api_change"
}
```

## 2025-10-06T21:12:00Z — Long-run hang probe iteration

- **Telemetry review**: Read through `src/helpers/classicBattle/cooldownOrchestrator.js` and related debug helpers to confirm `appendReadyTrace` instrumentation still captures cooldown lifecycle details for reproducing hangs.
- **Targeted unit test**: `npx vitest run tests/helpers/classicBattle/roundLifecycle.sequence.test.js` → PASS (1/1). Confirms cooldown-to-next-round sequencing expectations.
- **Playwright probe**: Initial run failed due to missing browsers; executed `npx playwright install chromium` to hydrate binaries. Subsequent command `npx playwright test playwright/battle-classic/long-run-hang-probe.spec.js --repeat-each=5` (requires elevated perms) timed out on every repeat because the header scoreboard (`<span data-side="opponent">Opponent: 0</span>`) intercepts pointer events while clicking the first stat button. Artifacts saved under `test-results/battle-classic-long-run-ha-bb4c0-ultiple-rounds-without-hang*/`.
- **Outcome**: No hang reproduced yet; failure points to UI overlay or z-index issue blocking stat button clicks rather than disabled-button stall. Needs follow-up to determine whether this is a legitimate gameplay regression or a probe adjustment.

## 2025-10-06T21:19:27Z — Header overlay fix

- **Layout update**: Adjusted `src/styles/battleClassic.css` so the Classic Battle header uses `position: sticky` and reduced the `home-screen` top padding. This keeps the scoreboard within document flow and prevents it from covering the stat buttons while preserving safe-area padding.
- **Targeted unit test**: `npx vitest run tests/helpers/classicBattle/roundLifecycle.sequence.test.js` → PASS (1/1).
- **Playwright probe**: `npx playwright test playwright/battle-classic/long-run-hang-probe.spec.js --repeat-each=5` (requires elevated perms) → PASS (5/5) with no pointer-interception warnings.
- **Outcome**: Stat buttons are now clickable throughout the long-run probe in Chromium headless; no hang repro or overlay detected post-fix.
