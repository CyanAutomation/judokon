Top 10 Lower-Performing Tests (scored 0–2 per rubric, total out of 10)
Test file	Intent clarity	Behavioral relevance	Assertion quality	Isolation & robustness	Cost vs. coverage	Total	Segment
## Top 10 lower-performing unit tests

The list below shows the ten lowest-scoring tests according to the rubric (each category scored 0–2, total possible = 10). Use this as a prioritized checklist for cleanup: remove or merge noisy/duplicative tests, and refactor tests that assert implementation details instead of observable behavior.

| # | Test file | Intent clarity | Behavioral relevance | Assertion quality | Isolation & robustness | Cost vs coverage | Total | Action |
|---:|---|:--:|:--:|:--:|:--:|:--:|:--:|---|
| 1 | `tests/integration/manualDomComparison.test.js` | 1 | 0 | 1 | 1 | 0 | 3 | Remove / merge |
| 2 | `tests/examples/testArchitectureDemo.test.js` | 1 | 0 | 1 | 2 | 0 | 4 | Remove / merge |
| 3 | `tests/classicBattle/opponent-message-handler.simplified.test.js` | 1 | 0 | 1 | 1 | 1 | 4 | Remove / merge |
| 4 | `tests/integration/battleClassic.integration.test.js` | 1 | 1 | 1 | 1 | 0 | 4 | Remove / merge |
| 5 | `tests/pages/battleCLI.helpers.test.js` | 1 | 1 | 1 | 1 | 0 | 4 | Remove / merge |
| 6 | `tests/pages/battleCLI.cliShortcutsFlag.test.js` | 2 | 1 | 1 | 1 | 0 | 5 | Refactor |
| 7 | `tests/classicBattle/page-scaffold.test.js` | 2 | 1 | 1 | 1 | 0 | 5 | Refactor |
| 8 | `tests/pages/battleCLI.standardDOM.test.js` | 2 | 1 | 1 | 2 | 0 | 6 | Refactor |
| 9 | `tests/styles/battleContrast.test.js` | 2 | 1 | 1 | 2 | 0 | 6 | Refactor |
| 10 | `tests/styles/battleCLI.focusContrast.test.js` | 2 | 1 | 2 | 2 | 0 | 7 | Refactor |

### Notes on selected tests

- `tests/integration/manualDomComparison.test.js` — Illustrative comparison between hand-built DOM and real HTML. Low value vs. maintenance cost.
- `tests/examples/testArchitectureDemo.test.js` — Tutorial/demo content; it doesn't assert production behavior.
- `tests/classicBattle/opponent-message-handler.simplified.test.js` — Educational example that duplicates coverage available elsewhere.
- `tests/integration/battleClassic.integration.test.js` — Loads full HTML and logs internal state but only asserts element existence. High setup cost for weak assertions.
- `tests/pages/battleCLI.helpers.test.js` — Heavily mocked; asserts implementation details instead of user-observable outcomes.

These tests tend to: duplicate coverage, assert incidental DOM structure, or focus on internal wiring rather than observable contracts.

### Recommendations

- Remove or consolidate tests marked “Remove / merge.” Replace them with smaller, behavior-focused tests where necessary.
- For tests marked “Refactor”:
	- Assert user-observable behavior (DOM text, emitted events, public API calls), not implementation details.
	- Reduce heavy fixture/setup cost where possible (use lightweight factories or component test utils).
	- Use fake timers and `withMutedConsole` in tests that are timing- or logging-sensitive to keep them deterministic.
	- Add one clear acceptance-style assertion per test (happy path) and a targeted edge-case where relevant.

### Next steps

1. Delete or archive the “Remove / merge” tests after confirming no unique coverage is lost.
2. Create refactor tasks for each test flagged “Refactor” with a short acceptance criterion (e.g., "Assert X observable behavior; no private API access").
3. Re-run the test suite and measure improvements in run time and flakiness.

If you want, I can create a small PR that removes the truly redundant tests and opens issues for the refactors with suggested acceptance criteria.