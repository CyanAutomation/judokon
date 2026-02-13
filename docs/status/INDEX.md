# Status Documentation Index & Policy

## Policy

Status documentation is organized by lifecycle:

- `docs/status/active/`: current work, ongoing investigations, and open proposals.
- `docs/status/archive/`: closed work, historical incident notes, completed investigations.
- `docs/status/reference/`: evergreen technical references intended for long-term reuse.

## Naming Convention

- Time-bound reports (status updates, incidents, proposals, investigations):
  - `YYYY-MM-DD_topic.md`
- Evergreen technical references:
  - `topic-reference.md`

## Legacy Root Redirect Mapping

Historical root-level redirect files are mapped in [`docs/status/MOVED.md`](./MOVED.md) so old links remain discoverable:

| Old path | Canonical path |
| --- | --- |
| `LAYOUT_EDITOR_IMPLEMENTATION_PROPOSAL.md` | [`active/2025-12-30_layout-editor-implementation-proposal.md`](./active/2025-12-30_layout-editor-implementation-proposal.md) |
| `quitFlowIssue.md` | [`archive/2025-12-31_quit-flow-issue.md`](./archive/2025-12-31_quit-flow-issue.md) |
| `report.md` | [`archive/2025-12-31_dom-manipulation-bug-report.md`](./archive/2025-12-31_dom-manipulation-bug-report.md) |
| `sample-test-failures.md` | [`archive/2025-01-01_sample-test-failures.md`](./archive/2025-01-01_sample-test-failures.md) |
| `snackBarIssue.md` | [`archive/2025-12-31_snackbar-behavior-issue.md`](./archive/2025-12-31_snackbar-behavior-issue.md) |

## Index

| Document                                                                                                                     | Summary                                                                              | Status    | Last updated | Canonical replacement                                                  |
| ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | --------- | ------------ | ---------------------------------------------------------------------- |
| [`active/NEXT_SESSION_ROADMAP.md`](./active/NEXT_SESSION_ROADMAP.md)                                                         | Forward-looking session roadmap and priorities for upcoming agent work.              | active    | 2026-02-01   | —                                                                      |
| [`active/2025-12-30_layout-editor-implementation-proposal.md`](./active/2025-12-30_layout-editor-implementation-proposal.md) | Layout editor implementation proposal and current feasibility assessment.            | active    | 2025-12-30   | —                                                                      |
| [`reference/progressHarness.md`](./reference/progressHarness.md)                                                             | Detailed refactor report for the Vitest test harness architecture.                   | reference | 2026-02-01   | —                                                                      |
| [`reference/progressPlaywright.md`](./reference/progressPlaywright.md)                                                       | Playwright quality assessment and recommendations for deterministic E2E coverage.    | reference | 2026-02-01   | —                                                                      |
| [`archive/2025-12-31_quit-flow-issue.md`](./archive/2025-12-31_quit-flow-issue.md)                                           | Historical quit-flow issue analysis and resolution details.                          | archive   | 2025-12-31   | [`docs/initialization-sequence.md`](../initialization-sequence.md)     |
| [`archive/2025-12-31_snackbar-behavior-issue.md`](./archive/2025-12-31_snackbar-behavior-issue.md)                           | Historical snackbar behavior issue analysis and implementation notes.                | archive   | 2025-12-31   | [`reference/progressPlaywright.md`](./reference/progressPlaywright.md) |
| [`archive/2025-12-31_dom-manipulation-bug-report.md`](./archive/2025-12-31_dom-manipulation-bug-report.md)                   | Historical bug report covering unsafe DOM manipulation findings.                     | archive   | 2025-12-31   | [`reference/progressHarness.md`](./reference/progressHarness.md)       |
| [`archive/2025-01-01_sample-test-failures.md`](./archive/2025-01-01_sample-test-failures.md)                                 | Historical snapshot of representative test failure output.                           | archive   | 2025-01-01   | [`reference/progressHarness.md`](./reference/progressHarness.md)       |
| [`archive/progressBrowse.md`](./archive/progressBrowse.md)                                                                   | Historical investigation into `readFileSync` failures in jsdom tests.                | archive   | 2026-02-01   | [`reference/progressHarness.md`](./reference/progressHarness.md)       |
| [`archive/progressCLI.md`](./archive/progressCLI.md)                                                                         | Historical classic battle CLI cooldown investigation (resolved).                     | archive   | 2026-02-01   | [`reference/progressPlaywright.md`](./reference/progressPlaywright.md) |
| [`archive/progressFlags.md`](./archive/progressFlags.md)                                                                     | Historical verification notes for opponent delay test flags.                         | archive   | 2026-02-01   | [`reference/progressPlaywright.md`](./reference/progressPlaywright.md) |
| [`archive/playwrightTestFailures.md`](./archive/playwrightTestFailures.md)                                                   | Historical log of Playwright failures and corresponding fixes.                       | archive   | 2026-02-07   | [`reference/progressPlaywright.md`](./reference/progressPlaywright.md) |
| [`archive/TASK3_DIAGNOSTICS_SUMMARY.md`](./archive/TASK3_DIAGNOSTICS_SUMMARY.md)                                             | Implementation summary for exposing diagnostics in development mode.                 | archive   | 2026-02-01   | [`reference/progressHarness.md`](./reference/progressHarness.md)       |
| [`archive/TEST_INVESTIGATION_SUMMARY.md`](./archive/TEST_INVESTIGATION_SUMMARY.md)                                           | Consolidated investigation summary for Playwright test failures.                     | archive   | 2026-02-01   | [`reference/progressPlaywright.md`](./reference/progressPlaywright.md) |
| [`archive/SCOREBOARD_TEST_FAILURE_INVESTIGATION.md`](./archive/SCOREBOARD_TEST_FAILURE_INVESTIGATION.md)                     | Root-cause investigation report for scoreboard integration test failures.            | archive   | 2026-02-02   | [`reference/progressHarness.md`](./reference/progressHarness.md)       |
| [`archive/SCOREBOARD_TEST_FIX_SUMMARY.md`](./archive/SCOREBOARD_TEST_FIX_SUMMARY.md)                                         | Root-cause and fix summary for scoreboard timer test failures.                       | archive   | 2026-02-02   | [`reference/progressHarness.md`](./reference/progressHarness.md)       |
| [`archive/OPPONENT_DELAY_TEST_ANALYSIS.md`](./archive/OPPONENT_DELAY_TEST_ANALYSIS.md)                                       | Historical analysis of opponent-delay-related test breakage.                         | archive   | 2026-02-01   | [`reference/progressPlaywright.md`](./reference/progressPlaywright.md) |
| [`archive/TEST_FAILURE_ANALYSIS_2.md`](./archive/TEST_FAILURE_ANALYSIS_2.md)                                                 | Follow-up analysis for snackbar DOM rendering test failures.                         | archive   | 2026-02-01   | [`reference/progressHarness.md`](./reference/progressHarness.md)       |
| [`archive/FIX_SUMMARY.md`](./archive/FIX_SUMMARY.md)                                                                         | Historical fix summary for random judoka draw state machine issues.                  | archive   | 2026-02-02   | [`reference/progressHarness.md`](./reference/progressHarness.md)       |
| [`archive/IMPLEMENTATION_SUMMARY.md`](./archive/IMPLEMENTATION_SUMMARY.md)                                                   | Historical implementation report for state machine and diagnostic improvements.      | archive   | 2026-02-01   | [`reference/progressHarness.md`](./reference/progressHarness.md)       |
| [`archive/cardAspectAnalysis.md`](./archive/cardAspectAnalysis.md)                                                           | Historical bug analysis and implementation notes for judoka card aspect ratio fixes. | archive   | 2026-02-01   | [`reference/progressPlaywright.md`](./reference/progressPlaywright.md) |
