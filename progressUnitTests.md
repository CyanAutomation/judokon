# Agent Assessment (Validated)

Overall, your assessment is directionally correct. The cited test files and their issues match the Unit Test Quality Standards in design/codeStandards and the Agent Guide (avoid direct DOM manipulation, avoid synthetic events, prefer behavioral assertions, use fake timers and withMutedConsole).

Below is a validation summary plus a concrete, test‑by‑test fix plan and verification checklist to make the work immediately actionable.

## Lower-Performing Unit Tests (Confirmed)

The list below shows the lowest-scoring tests according to the rubric (each category scored 0–2, total possible = 10). Use this as a prioritized checklist for cleanup: remove or merge noisy/duplicative tests, and refactor tests that assert implementation details instead of observable behavior.

|   # | Test file                                        | Intent clarity | Behavioral relevance | Assertion quality | Isolation & robustness | Cost vs coverage | Total | Action   |
| --: | ------------------------------------------------ | :------------: | :------------------: | :---------------: | :--------------------: | :--------------: | :---: | -------- |
|   1 | `tests/pages/battleCLI.cliShortcutsFlag.test.js` |       2        |          1           |         1         |           1            |        0         |   5   | Refactor |
|   2 | `tests/classicBattle/page-scaffold.test.js`      |       2        |          1           |         1         |           1            |        0         |   5   | Refactor |
|   3 | `tests/pages/battleCLI.standardDOM.test.js`      |       2        |          1           |         1         |           2            |        0         |   6   | Refactor |
|   4 | `tests/styles/battleContrast.test.js`            |       2        |          1           |         1         |           2            |        0         |   6   | Refactor |
|   5 | `tests/styles/battleCLI.focusContrast.test.js`   |       2        |          1           |         2         |           2            |        0         |   7   | Refactor |

### Validation notes (evidence)

- `tests/pages/battleCLI.cliShortcutsFlag.test.js`
  - Imports `../../src/pages/index.js` and dispatches synthetic `KeyboardEvent` directly. This bypasses the CLI’s public handlers and is brittle. Matches anti‑patterns: synthetic events and testing internals.
- `tests/classicBattle/page-scaffold.test.js`
  - Reads raw HTML, injects into JSDOM, and asserts presence/attributes. This is structural, not behavioral; low value and fragile to markup refactors.
- `tests/pages/battleCLI.standardDOM.test.js`
  - Manually constructs DOM and asserts presence/ARIA attributes. Useful as a spec, but higher value when exercised via the real initializer to ensure contracts are wired.
- `tests/styles/battleContrast.test.js` and `tests/styles/battleCLI.focusContrast.test.js`
  - Validate constant color pairs. Acceptable as guardrails but not tied to runtime. Could move to a single, consolidated style test or data‑driven matrix.

Conclusion: Findings align with your scoring. Actions should focus on making these tests assert runtime‑observable behavior via public APIs, not static structure.

### Recommendations (refined)

- Remove or consolidate tests marked “Remove.” Replace them with smaller, behavior-focused tests where necessary.
- For tests marked “Refactor”:
  - Assert user-observable behavior (DOM text, emitted events, public API calls), not implementation details.
  - Reduce heavy fixture/setup cost where possible (use lightweight factories or component test utils).
  - Use fake timers and `withMutedConsole` to keep timing/log tests deterministic (see `tests/utils/console.js`).
  - Add one clear acceptance-style assertion per test (happy path) and a targeted edge-case where relevant.

### Targeted refactor plan (per file)

- `tests/pages/battleCLI.cliShortcutsFlag.test.js`
  - Replace `import("../../src/pages/index.js")` and manual `KeyboardEvent` dispatch with invoking the public CLI key handler:
    - Import `onKeyDown` from `src/pages/battleCLI/events.js`, or call `wireEvents()` from `src/pages/battleCLI/init.js` and dispatch a real keydown on `window`.
    - Keep assertions to observable outcomes: section visibility via `hidden`, focus target, or hint text.
  - Consider parameterizing flag state via feature flag overrides instead of mocking unrelated entrypoints.

- `tests/classicBattle/page-scaffold.test.js`
  - DONE: Promoted to a minimal behavioral test. Loads the real `battleClassic.html`, runs `init()`, and asserts post‑init observable state:
    - Regions present with correct ARIA roles.
    - Visible defaults set (score “You: 0 / Opponent: 0”, counter “Round 0”).
  - Notes: Provides `__FF_OVERRIDES` and a simple `localStorage` stub to avoid side effects.

- `tests/pages/battleCLI.standardDOM.test.js`
  - DONE: Loads real `src/pages/battleCLI.html` (no fabricated DOM) and asserts presence and ARIA contracts for standard nodes in Phase 1 (hidden) state. Updated expectations to match current markup (e.g., `next-round-timer` uses `role="status"` and `aria-atomic="true"`; `round-message` carries `aria-live="polite"`).
  - Rationale: Improves determinism and maintenance by pinning to real markup without requiring heavy mocks for `init()`.

- `tests/styles/battleContrast.test.js` — DONE
  - Converted to a single data‑driven test with a shared AA text threshold (>= 4.5) and palette references.
  - Rationale: centralized thresholds and easier maintenance.

- `tests/styles/battleCLI.focusContrast.test.js` — DONE
  - Refactored to a data‑driven table using shared WCAG AA thresholds for non‑text (>= 3.0) and text (>= 4.5). Centralizes constants and reduces duplication.

Implementation notes

- Prefer public helpers and exported functions over deep imports. For keyboard flows, prefer `wireEvents()` + native dispatch, or call exported `onKeyDown` directly when that function is the public API.
- Use `vi.useFakeTimers()` where countdowns or delays are involved; drive time using `await vi.runAllTimersAsync()`.
- Wrap expected errors/warnings with `withMutedConsole()`.

### Next steps (status updated)

1. **DONE:** Delete or archive the “Remove” tests after confirming no unique coverage is lost.
   - `tests/integration/manualDomComparison.test.js`
   - `tests/examples/testArchitectureDemo.test.js`
   - `tests/classicBattle/opponent-message-handler.simplified.test.js`
2. **DONE:** Refactor items
   - **DONE (validated):** `tests/integration/battleClassic.integration.test.js` — behavioral assertions against initialized page state.
   - **DONE (validated):** `tests/pages/battleCLI.helpers.test.js` — focused behavioral tests for helpers with minimal mocking.
   - **DONE (validated):** `tests/pages/battleCLI.cliShortcutsFlag.test.js`
   - **DONE (validated):** `tests/classicBattle/page-scaffold.test.js`
   - **DONE (validated):** `tests/pages/battleCLI.standardDOM.test.js`
   - **DONE (validated):** `tests/styles/battleContrast.test.js`
   - **DONE (validated):** `tests/styles/battleCLI.focusContrast.test.js`
3. Create refactor tasks for each remaining test flagged “Refactor”. Use the following template for each:

   **Refactor Test: `[Test File Path]`**

   **Current Problem:**
   - [ ] The test currently focuses on implementation details (e.g., internal state, mock calls).
   - [ ] The test has a high setup cost for its assertions.
   - [ ] The assertions are weak (e.g., only checking for element existence).

   **Acceptance Criteria:**
   - [ ] The test is refactored to assert user-observable behavior (e.g., final DOM state, text content, emitted events).
   - [ ] Mocks are minimized, and the test interacts with the component through its public API.
   - [ ] The test is deterministic and robust, using helpers like `withMutedConsole` and fake timers where appropriate.

4. Re-run the test suite and measure improvements in run time and flakiness.

### Verification checklist (commands)

- Lint/format/jsdoc/tests/contrast:
  - `npx prettier . --check`
  - `npx eslint .`
  - `npm run check:jsdoc`
  - `npx vitest run`
  - `npm run check:contrast`

- Unit test quality spot checks:
  - `grep -r "dispatchEvent\|createEvent" tests/ && echo "Found synthetic events"`
  - `grep -r "console\.(warn\|error)" tests/ | grep -v "tests/utils/console.js" && echo "Unsilenced console found"`
  - `grep -r "setTimeout\|setInterval" tests/ | grep -v "fake\|mock" && echo "Found real timers"`

Success criteria

- Refactored tests assert behavior via public APIs and are deterministic with fake timers.
- No unsilenced console warnings/errors in tests.
- Net reduction in brittle, structure‑only assertions; equal or improved coverage.
