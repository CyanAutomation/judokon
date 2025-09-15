## Lowest-value Playwright specs

This file lists the Playwright specs that currently provide the least value for their cost. Use it to prioritize removal, consolidation, or refactor work.

| Rank | File                                    | Score (0–10) | Action         | Intent | Relevance | Assertion | Robustness | Cost | Duration (ms) | Quick fix                                                                                                                      |
| ---: | --------------------------------------- | :----------: | -------------- | :----: | :-------: | :-------: | :--------: | :--: | :-----------: | ------------------------------------------------------------------------------------------------------------------------------ |
|    1 | `battle-cli.spec.js`                    |      3       | REMOVE / MERGE |   1    |     1     |     1     |     0      |  0   |    60,151     | Drop waitForTimeout(500), switch CSS locators to getByRole/getByTestId, and split the flow into smaller specs to trim runtime. |
|    2 | `debug-settings-click.spec.js`          |      4       | REMOVE / MERGE |   2    |     1     |     0     |     0      |  1   |       0       | Add semantic expects for the "Restore Defaults" button and replace waitForTimeout with auto‑waiting locators.                  |
|    3 | `debug-stat-loading.spec.js`            |      4       | REMOVE / MERGE |   2    |     1     |     0     |     0      |  1   |       0       | Add assertions verifying stat list population and drop the 3s waitForTimeout in favor of expect‑based waits.                   |
|    4 | `orchestrator-debug.spec.js`            |      4       | REMOVE / MERGE |   1    |     1     |     1     |     0      |  1   |     5,430     | Replace placeholder `expect(true).toBe(true)` with real checks and remove the 5s timeout.                                      |
|    5 | `battle-classic/replay.spec.js`         |      5       | REFACTOR       |   1    |     1     |     1     |     0      |  2   |     1,475     | Swap waitForTimeout/waitForSelector for expect‑based waits and prefer role/test‑id selectors.                                  |
|    6 | `win-target-sync.spec.js`               |      5       | REFACTOR       |   2    |     1     |     1     |     0      |  1   |       0       | Eliminate repeated waitForTimeout(500) calls, rely on auto‑wait, and stabilize locators for CI.                                |
|    7 | `static-pages.spec.js`                  |      6       | REFACTOR       |   1    |     1     |     0     |     2      |  2   |     1,371     | Add assertions (e.g., `toHaveURL`, `toContainText`) so the test validates page content instead of only navigating.             |
|    8 | `battle-classic/timer-clearing.spec.js` |      6       | REFACTOR       |   2    |     1     |     1     |     0      |  2   |     2,585     | Replace timeouts and selectors with expect‑based waits; convert CSS selectors to `getByRole`/`getByTestId`.                    |
|    9 | `battle-classic/stat-selection.spec.js` |      6       | REFACTOR       |   2    |     1     |     1     |     0      |  2   |     2,571     | Remove waitForTimeout/waitForSelector and assert selection via accessible locators.                                            |
|   10 | `battle-classic/cooldown.spec.js`       |      6       | REFACTOR       |   2    |     1     |     1     |     0      |  2   |     2,389     | Use auto‑waiting expectations for cooldown transitions and replace ad‑hoc CSS selectors with semantic ones.                    |

### Summary & repo-wide guidance

Common issues observed

- Heavy reliance on `page.waitForTimeout()` and `waitForSelector()` instead of Playwright's auto‑waiting expectations.
- Many specs lack meaningful assertions or use placeholder checks.
- Predominant use of brittle CSS selectors instead of accessible locators (role/test-id).
- Some specs never ran (duration = 0), offering no coverage.
- No traceability comments (Spec-ID, linked issue) to document intent.

Recommended fixes (apply repo-wide)

- Ban `waitForTimeout()` in new and refactored specs. Prefer `expect(locator).toBeVisible()`, `toHaveText()`, `toHaveURL()` for synchronization.
- Adopt `getByRole()` / `getByTestId()` or role-based Playwright locators to improve stability and accessibility alignment.
- Ensure every test asserts one semantic user outcome (happy-path) and add a focused edge-case where appropriate.
- Annotate specs with a `Spec-ID` and link to an issue/pr describing intent to avoid orphaned tests.
- Review slow or unused specs: split long flows into smaller specs and remove debug-only scripts.

Next steps

1. Remove or archive the specs flagged `REMOVE / MERGE` after confirming they don't contain unique coverage.
2. For each `REFACTOR` spec, open a small task describing the expected behavior to assert and a suggested locator strategy.
3. Re-run the Playwright suite and compare total runtime and flakiness metrics.

If you'd like, I can create a PR that implements a small subset of these quick fixes (e.g., replacing a few `waitForTimeout` usages and switching selected selectors to `getByRole`).
