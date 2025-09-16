# Lowest-value Playwright specs

This file lists the Playwright specs that currently provide the least value for their cost. Use it to prioritize removal, consolidation, or refactor work.

| Rank | File                                    | Score (0–10) | Action         | Intent | Relevance | Assertion | Robustness | Cost | Duration (ms) | Quick fix                                                                                                                                                            |
| ---: | --------------------------------------- | :----------: | -------------- | :----: | :-------: | :-------: | :--------: | :--: | :-----------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
|    1 | `battle-cli.spec.js`                    |      3       | REMOVE / MERGE |   1    |     1     |     1     |     0      |  0   |    61,336     | Split CLI coverage into focused specs that drive the UI (start → play → restart), drop the instrumentation-heavy state polling, and adopt role/test-id locators.     |
|    2 | `debug-settings-click.spec.js`          |      0       | REMOVED ✅     |   0    |     0     |     0     |     0      |  0   |       —       | Spec removed 2025-09-15; settings flows remain covered by `settings.spec.js`, so no user-facing coverage was lost.                                                   |
|    3 | `debug-stat-loading.spec.js`            |      0       | REMOVED ✅     |   0    |     0     |     0     |     0      |  0   |       —       | Spec removed 2025-09-15; CLI stat loading remains covered by battle/classic CLI flows, so this diagnostic logger is no longer needed.                                |
|    4 | `orchestrator-debug.spec.js`            |      0       | REMOVED ✅     |   0    |     0     |     0     |     0      |  0   |       —       | Spec removed 2025-09-15; orchestrator behavior is exercised in `battle-cli.spec.js`, so this diagnostic harness is obsolete.                                         |
|    5 | `battle-classic/replay.spec.js`         |      5       | REFACTOR       |   1    |     1     |     1     |     0      |  2   |     5,274     | Drive the replay flow through user-facing locators (add test IDs for Replay/scoreboard) and rely on `expect` waits instead of CSS queries plus dynamic imports.      |
|    6 | `win-target-sync.spec.js`               |      5       | REFACTOR       |   2    |     1     |     1     |     0      |  1   |    19,014     | Collapse the four identical modal flows into one table-driven run, reuse a helper for the settings panel, and lean on locator expectations to trim the 19s cost.     |
|    7 | `static-pages.spec.js`                  |      6       | REFACTOR       |   1    |     1     |     0     |     2      |  2   |     1,915     | Augment `verifyPageBasics` with page-specific assertions (headings, hero copy) and metadata so each static page proves its real content, not just nav visibility.    |
|    8 | `battle-classic/timer-clearing.spec.js` |      6       | REFACTOR       |   2    |     1     |     1     |     0      |  2   |     5,688     | Add semantic/test-id locators for timers and buttons, swap modal `waitForSelector` calls for `expect` polls, and validate the visible countdown behavior directly.   |
|    9 | `battle-classic/stat-selection.spec.js` |      6       | REFACTOR       |   2    |     1     |     1     |     0      |  2   |     7,057     | Introduce accessible locators for the stat buttons and Next control, cover enable/disable transitions with `expect`, and drop the brittle CSS selectors.             |
|   10 | `battle-classic/cooldown.spec.js`       |      6       | REFACTOR       |   2    |     1     |     1     |     0      |  2   |     4,339     | Drive the cooldown flow via the UI (click Next, observe scoreboard/timer) instead of importing modules inside `page.evaluate` + timers, matching user-facing checks. |

Durations reflect single local runs of `npx playwright test <spec> --reporter=json` on 2025‑09‑15.

## Summary & repo-wide guidance

Common issues observed

- The three `debug-*.spec.js` files are diagnostic scripts: they log telemetry without real assertions, so they never catch regressions. These should be removed.
- `battle-cli.spec.js` depends on Test API instrumentation (`waitForBattleStateHelper` with 10s timeouts, manual fetch mocks), so it burns ~61s validating internals rather than user-visible behavior.
- Classic battle specs lean on raw `#id` selectors and `page.evaluate` imports instead of the role/test-id locators encouraged by `design/codeStandards/evaluatingPlaywrightTests.md`.
- None of these low-value specs carry Spec-ID/Linked-Req metadata, so the value evaluator cannot capture intent or requirement coverage.

Recommended fixes (apply repo-wide)

- Retire the diagnostic specs so each file contains meaningful assertions in line with the Playwright rubric (`design/codeStandards/evaluatingPlaywrightTests.md`).
- Refactor the CLI and classic battle specs to drive the UI with role/test-id locators and Playwright `expect` polls instead of instrumentation or module imports.
- Introduce Spec-ID/Linked-Req headers so evaluation tooling can score intent clarity and track coverage.
- After refactors, re-run `npm run e2e:value` (or the full `npm run e2e:flake-scan`) to confirm improved scores, durations, and stability.

Next steps

1. Remove the `debug-*` specs once we've confirmed no user behavior depends on them.
2. Plan the CLI/battle refactors: add the necessary test IDs, convert flows to UI-driven assertions, and break the monolithic CLI spec into focused files.
3. - Execute `npm run e2e:value` (or `npm run e2e:flake-scan`) and compare score/runtime deltas to verify the clean-up.

## Agent Evaluation

An independent verification of this audit was performed. The findings are **accurate and well-documented**.

The investigation correctly identifies several critical anti-patterns that reduce test reliability and increase maintenance cost:

- **Excessive Instrumentation**: Specs like `battle-cli.spec.js` rely on internal helper functions (`waitForBattleStateHelper`) and direct state manipulation, making them slow and brittle.
- **Implementation-Detail Selectors**: The classic battle specs depend on `#id` selectors, which are prone to breaking during refactors.
- **Bypassing User Interactions**: Tests frequently use `page.evaluate` with dynamic `import` statements to call internal application logic directly, failing to test the actual user-facing behavior.

The proposed fixes are **strongly recommended**. Refactoring these tests to use user-facing locators (such as `role` and `data-testid` attributes) and Playwright's web-first assertions (`expect`) will produce faster, more robust, and more valuable tests that accurately reflect the user experience. The recommendations align with the project's documented standards in `GEMINI.md` and `design/codeStandards/evaluatingPlaywrightTests.md`.

Proceeding with the "Next steps" is advised.
