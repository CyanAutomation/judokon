# Opportunities for Improvement — Phased Plans

This document expands each improvement suggestion into a clear, phased implementation plan. Each item contains: phased steps, short acceptance criteria, estimated effort (1–5), and recommended verification steps.

---

## 1) Improve shared test mocking utilities

Summary: Create small helper factories and utilities for common UI components used in tests (stat buttons, snackbar, scoreboard), plus DOM-interaction helpers that mirror real behavior (attach handlers, respect disabled state, ARIA attributes).

Effort: 1–2

Phases:

- Phase 0 — Audit & contract (1 day)
  - Inventory existing inline mocks and ad-hoc helpers across `tests/` and `playwright/helpers`.
  - Define a minimal API contract for helpers (factories return DOM node + public helper methods, e.g., `click()`, `setDisabled()`, `getAria()`).
  - Acceptance: Inventory doc + API contract PR created.

- Phase 1 — Implement core helpers (2–3 days)
  - Implement `tests/helpers/domFactory.js` with small factories:
    - `createStatButton({ label, aria, disabled })`
    - `createSnackbar()` (show/hide, lastMessage)
    - `createScoreboard()` (updateScore, render)
  - Provide small utilities: `attachEventSpy(el, eventName)` and `withMutedConsole(fn)` wrapper (if not present).
  - Add unit tests for each helper ensuring they behave like real DOM nodes (click triggers attached handler, disabled prevents click, aria reflected).
  - Acceptance: New tests pass; helper exports are documented.

- Phase 2 — Migrate high-value tests (3–4 days)
  - Identify 5–10 flakiest tests and replace inline mocks with helpers.
  - Run test suite; fix regressions caused by subtle differences.
  - Acceptance: Reduced duplication and no new test failures.

- Phase 3 — Stabilize & docs (1 day)
  - Add README in `tests/helpers/` showing examples and recommended patterns.
  - Add linter/test rule examples (optional) to prefer helpers in new tests.
  - Acceptance: Documentation merged and referenced in CONTRIBUTING.md.

Quick verification: Run the unit tests covering modified files and a sample of migrated tests (vitest quick run).

---

## 2) Add a queue-based animation frame mock helper

Summary: Extract and standardize the RAF mock used in some tests into `tests/helpers/rafMock.js` with APIs: `install()`, `uninstall()`, `enqueue(callback)`, `flushNext()`, `flushAll()`, `cancel(id)`.

Effort: 1

Phases:

- Phase 0 — Research & API design (0.5 day)
  - Find existing inline RAF mocks (e.g., `tests/helpers/classicBattle/utils.js`) and gather behaviors needed (queue ordering, cancellation semantics, integration with fake timers).
  - Define API and a small behavior matrix (single frame vs. multi-frame callbacks, nested RAFs).
  - Acceptance: API doc + short examples.

- Phase 1 — Implement helper (0.5–1 day)
  - Implement `tests/helpers/rafMock.js` that exposes the API and stores instrumentation (calls, order, canceled ids).
  - Provide `install()` to replace global `requestAnimationFrame` & `cancelAnimationFrame` and `uninstall()` to restore.
  - Implement integration helpers: `withRafMock(fn)` to auto-install/uninstall.
  - Acceptance: Unit tests for ordering, nested RAF behavior, and cancellation.

- Phase 2 — Replace inline mocks & adopt in tests (1–2 days)
  - Replace a few representative inline mocks with the helper, update tests to use `flushNext()`/`flushAll()` explicitly.
  - Acceptance: Tests that previously used inline mocks now use the helper and continue to pass.

- Phase 3 — Optional: expose debug tooling (0.5 day)
  - Add small debug output for test runs (counts, pending callbacks) that can be turned on via env var.
  - Acceptance: Debugging flag works and does not affect normal runs.

Verification: Add unit tests for `rafMock` and run a subset of timing-sensitive tests.

---

## 3) Publish a fake-timers playbook & canonical test setup

Summary: Document and enforce a canonical pattern for using Vitest fake timers to avoid ad-hoc global API mocking and improve test determinism.

Effort: 2

Phases:

- Phase 0 — Audit (1 day)
  - Scan `tests/` for uses of `vi.useFakeTimers`, manual timer stubs, direct `requestAnimationFrame` patches, and real timers in tests. Produce a short spreadsheet of problem areas.
  - Acceptance: Audit spreadsheet and prioritized list.

- Phase 1 — Draft playbook & test fixtures (0.5–1 day)
  - Create `tests/setup/fakeTimers.js` which exports a `useCanonicalTimers()` helper that calls `vi.useFakeTimers()` and provides teardown with `vi.useRealTimers()`.
  - Add documentation to `docs/testing-guide.md` and `tests/README.md` with examples for async helpers: `vi.runAllTimersAsync()`, `vi.advanceTimersByTimeAsync()`, and best practices for mixing RAF mocks and fake timers.
  - Acceptance: Playbook doc + helper file added.

- Phase 2 — Migrate critical tests (2–3 days)
  - Update critical suites (classic battle, scheduler tests) to import and use `useCanonicalTimers()`.
  - Fix test logic that relied on implicit real timers.
  - Acceptance: Tests pass and follow the playbook pattern.

- Phase 3 — Linting & CI enforcement (1 day, optional)
  - Add a lint rule or test that flags new tests that directly call `setTimeout`/`setInterval` without `useCanonicalTimers()` (soft warning) or require `/* use real timers */` opt-in.
  - Acceptance: CI warns / fails if new tests deviate from the playbook (configurable).

Verification: Run full vitest suite (or filtered critical suites) to verify no regressions.

---

## 4) Shared mock helpers for high-traffic UI components

Summary: Provide richer factories for complex components (scoreboard, stat buttons, modals) so tests can rely on realistic behavior without copying wiring logic.

Effort: 2–3

Phases:

- Phase 0 — Requirements & API (1 day)
  - Interview maintainers / review existing usage patterns for the target components.
  - Define a small API surface for factories (mount into container, simulate interactions, observe emitted events).
  - Acceptance: Signed-off API doc.

- Phase 1 — Implement factories (2–4 days)
  - Implement factories in `tests/helpers/components/` for each targeted component.
  - Ensure they expose observable hooks (event spies, DOM queries) and configuration options for typical states.
  - Acceptance: Unit tests for factories and example usages added to test suite.

- Phase 2 — Migration & sample conversions (2–3 days)
  - Convert several high-traffic tests to use factories and update assertions.
  - Acceptance: Tests that used to replicate component wiring now use factories and remain stable.

- Phase 3 — Documentation & onboarding (1 day)
  - Add examples to `tests/helpers/components/README.md` and reference in CONTRIBUTING.md.
  - Acceptance: Documentation merged and referenced in PR template.

Verification: Run converted tests and record improved readability and reduced duplication.

---

## 5) Add test assertions / utilities to verify event listener wiring

Summary: Provide small utilities to assert that event listeners are attached, to inspect registered handlers (where possible), and to validate handler invocation order.

Effort: 2

Phases:

- Phase 0 — Design & constraints (0.5 day)
  - Determine which patterns can be tested without fragile internals (e.g., using adding spies before initialization, or wrapping `addEventListener` via helper install).
  - Acceptance: Small design note explaining constraints.

- Phase 1 — Implement test utilities (1–2 days)
  - Implement `tests/helpers/listenerUtils.js` offering helpers:
    - `withListenerSpy(target, eventName, fn)` — attaches spy that records handler calls.
    - `expectListenerAttached(target, eventName)` — asserts a handler was added (best-effort via wrapping `addEventListener`).
    - `wrapAddEventListener()` — optional installation that proxies `addEventListener` to capture registrations (only installed for tests that opt-in).
  - Acceptance: Unit tests demonstrating detection of attached listeners and invocation order.

- Phase 2 — Adopt in flaky tests (1–2 days)
  - Replace brittle `console.log` assertions with `withListenerSpy()` in selection/wiring-sensitive tests.
  - Acceptance: Flaky tests show fewer false negatives and clearer failures.

Verification: Run migrated tests under fake timers and raf mocks to confirm consistent behavior.

---

## 6) Replace brittle inline mocks with integration-style refactors for priority tests

Summary: For the most flaky tests, move from heavy mocking to integration-style tests using real modules wired together but with deterministic fakes for externalities (timers, RAF, fixtures).

Effort: 3

Phases:

- Phase 0 — Identify priority tests (0.5 day)
  - From flaky-test reports, identify the set of tests that produce the majority of CI flakes.
  - Acceptance: Short list of priority tests.

- Phase 1 — Design integration harness (1–2 days)
  - Create a test harness template that boots real modules and provides deterministic inputs (fixtures, fake timers, raf mock).
  - Acceptance: Harness README and example.

- Phase 2 — Rework tests (3–5 days)
  - Rewrite selected tests to use harness; remove deep internal mocking and rely on public APIs and observable DOM/side effects.
  - Acceptance: Reworked tests pass locally and in CI; they are more resilient to implementation changes.

- Phase 3 — Monitor & iterate (ongoing)
  - Track flakiness pre/post change and iterate where needed.
  - Acceptance: Statistically measurable reduction in flakes for targeted tests.

Verification: Compare flaky counts before/after on CI runs; create a small dashboard or log for tracking.

---

## 7) Centralize round state management / single source of truth

Summary: Introduce a small battle-session store or state manager for canonical round number, timers, and selected stat to reduce duplication and provide a stable testing seam.

Effort: 4–5 (feature-flagged rollout recommended)

Phases:

- Phase 0 — Spike & API design (3–5 days)
  - Prototype a tiny `RoundStore` (observable or event-emitter) API, showing how UI and orchestrator read/write round state.
  - Create a migration plan and compatibility layer for existing consumers.
  - Acceptance: Prototype PR + design doc explaining migration.

- Phase 1 — Implement store behind feature flag (5–8 days)
  - Add `RoundStore` module and wire it into a small subset of consumers behind a runtime/config flag.
  - Keep current behavior as default; new flag enables store wiring.
  - Acceptance: Tests for both legacy and store-enabled behavior.

- Phase 2 — Migrate incrementally (2–4 weeks, incremental PRs)
  - Gradually migrate consumers (UI components, orchestrator, analytics) to read from/write to the store.
  - Maintain toggles to validate parity and roll back if issues arise.
  - Acceptance: Parity tests and feature-flag rollout plan executed.

- Phase 3 — Deprecate legacy paths & cleanup (1–2 weeks)
  - Remove legacy round-management code after confidence window.
  - Acceptance: Clean codebase and updated docs.

Verification: Add integration tests exercising round transitions via the store; run full test suite with flag on/off to compare parity.

Risks & mitigations: Cross-cutting change; keep small PRs and feature flags to reduce blast radius.

---

## 8) Scheduler test-friendly hooks & deterministic control

Summary: Add optional test hooks to the scheduler so tests can inject a deterministic timing source and control frame progression without global monkey-patching.

Effort: 4

Phases:

- Phase 0 — Design & compatibility review (3–4 days)
  - Propose API such as `scheduler.withTimingSource({ requestFrame, cancelFrame, now })` or `scheduler.createTestController()` that returns `advanceFrame()`.
  - Review with maintainers and identify hot paths that must stay static-import-only.
  - Acceptance: Design doc and sign-off.

- Phase 1 — Implement minimal test hooks (1–2 weeks)
  - Implement hooks guarded by a `__TEST__` flag or exported behind an explicit test-only API surface.
  - Ensure default behavior remains unchanged.
  - Acceptance: Unit tests using the test controller to deterministically advance frames.

- Phase 2 — Migrate tests to hooks (1–2 weeks)
  - Replace global RAF mocks in tests that need deterministic control with the new controller.
  - Acceptance: Deterministic tests that no longer rely on global patching.

- Phase 3 — Documentation & hardened API (3 days)
  - Document public test API, examples, and migration notes.
  - Add small integration tests proving backward compatibility.
  - Acceptance: Docs merged and examples added to `tests/helpers`.

Verification: Run the scheduler test suite and timing-sensitive integration tests using the new controller.

Risks: Changing scheduler surfaces risks production behavior. Mitigate by keeping hooks opt-in and behind test-only exports and feature flags.

---

## 9) Add scheduler safeguards to detect/prevent infinite loops (watchdog)

Summary: Add optional watchdog logic to the scheduler to detect pathological synchronous frame spirals or runaway loops during tests and surface actionable diagnostics (errors/warnings) rather than hanging the test runner.

Effort: 4–5

Phases:

- Phase 0 — Heuristics & policy (2–3 days)
  - Define detection heuristics (max synchronous frame depth, max callbacks-per-microtask, elapsed time threshold) and decide on behavior (throw error in tests, warn in dev, no-op in prod).
  - Acceptance: Policy doc and sample thresholds.

- Phase 1 — Implement watchdog (3–5 days)
  - Implement a lightweight watchdog in scheduler (opt-in via `scheduler.enableWatchdog({ thresholds })` or via test-only flags).
  - Instrument counters and provide helpful diagnostics (stack traces, callback counts, last N callbacks) when triggered.
  - Acceptance: Unit tests that intentionally trigger watchdog and assert diagnostic content.

- Phase 2 — Integrate with test harness & CI (2–3 days)
  - Enable watchdog for test runs by default (or for specific suites) so tests fail fast instead of timing out.
  - Add guidance for how to relax the watchdog for stress tests.
  - Acceptance: Tests surface watchdog errors for runaway loops rather than long timeouts.

- Phase 3 — Monitoring & refinement (ongoing)
  - Monitor occurrences in CI; tune heuristics to minimize false positives.
  - Acceptance: Reasonable false-positive rate and helpful diagnostics.

Risks & mitigations: False positives could block legitimate stress tests — make it opt-in per-suite and provide clear escape hatches (configurable thresholds).

---

## Consolidated prioritized list (short summary)

1. Improve shared test mocking utilities (score: 1)
2. Add a queue-based RAF mock helper (score: 1)
3. Publish fake-timers playbook & canonical test setup (score: 2)
4. Shared mock helpers for high-traffic UI components (score: 2)
5. Add test assertions/utilities to verify event listener wiring (score: 2)
6. Replace brittle inline mocks with integration-style refactors for priority tests (score: 3)
7. Centralize round state management / single source of truth (score: 4)
8. Scheduler test-friendly hooks & deterministic control (score: 4)
9. Add scheduler watchdogs to detect/prevent infinite loops (score: 5)

---

## Suggested immediate next steps (quick wins)

- Implement items 1 and 2 (raf mock + shared helpers) in a single sprint to immediately reduce flakiness.
- Draft the fake-timers playbook and add `tests/setup/fakeTimers.js` so teams have a canonical pattern.
- Run a targeted vitest run of the classic battle tests to validate the small helpers and RAF mock reduce flakes.

---

## Verification checklist

- [ ] Unit tests for new helpers + raf mock pass.
- [ ] A set of 5 high-flakiness tests migrated to use helpers and pass reliably.
- [ ] Playbook doc added and referenced from `tests/README.md`.
- [ ] Scheduler changes (if undertaken) are gated behind flags/test-only exports.

---

## Audit Results: Phase 0 Inventory (Items 1–3)

### Item 1: Inline Mocks & Ad-hoc Helpers

**vi.mock Usage:**

- 20+ files use `vi.mock()` for module mocking (e.g., `renderFeatureFlags.test.js`, `timerService.test.js`, `carouselController.test.js`, etc.)
- Common patterns: mocking feature flags, UI helpers, timer services, data utils
- Duplication: Many tests re-mock the same modules (e.g., `setupScoreboard.js`, `showSnackbar.js`)

**Manual DOM Creation:**

- 20+ instances of `document.createElement()` in tests (e.g., `timerService.test.js`, `scrollButtonState.test.js`, `classicBattlePage.syncScoreDisplay.test.js`)
- Common elements: buttons, divs, nav, headers
- Patterns: Inline creation without shared factories; repeated wiring of event listeners

**Ad-hoc Helpers:**

- Some tests have inline helper functions (e.g., in `classicBattle/utils.js` for RAF mocking)
- No centralized `tests/helpers/domFactory.js` yet

### Item 2: RAF Mock Usage

**Existing RAF Mock:**

- `tests/helpers/rafMock.js` already exists with `installRAFMock()` API (queue-based, flushAll/flushNext/cancel)
- Provides instrumentation and deterministic control

**Inline RAF Mocks:**

- `tests/classicBattle/page-scaffold.test.js`: Manual RAF stubbing (lines 822–842, 1104)
- `tests/setup.js`: Fallback RAF polyfill using setTimeout
- `tests/helpers/classicBattle/utils.js`: Commented-out RAF mock code (lines 38–40)

**Behaviors Needed:**

- Queue ordering, cancellation semantics, integration with fake timers
- Nested RAF callbacks, error handling in flushes

### Item 3: Timer Usage in Tests

**vi.useFakeTimers Usage:**

- 20+ test files call `vi.useFakeTimers()` (e.g., `domReady.test.js`, `selectionHandler.test.js`, `timerService.cooldownGuard.test.js`, many in `classicBattle/` subdir)
- Common in timing-sensitive tests: cooldowns, selections, round timers

**Real Timer Usage:**

- `setTimeout`: 20+ instances (e.g., in mocks like `mockScheduler.js`, real usage in `roundTimerMock.js`, `roundResolver.resolveRound.test.js`)
- `setInterval`: 9 instances (e.g., in `commonMocks.js`, `scoreboard.integration.test.js`, `battleCLI` tests)
- Some tests use real timers for async delays (e.g., `new Promise((r) => setTimeout(r, 0))`)

**RAF Patches:**

- Inline patches in `page-scaffold.test.js` (stubGlobal for RAF)
- `timerUtils.js` adapts global setTimeout/clearTimeout for mocks

**Problem Areas:**

- Inconsistent teardown: Some tests call `vi.useRealTimers()`, others don't
- Mixed real/fake timers in same suite (e.g., `battleCLI` tests)
- No canonical `useCanonicalTimers()` helper yet

---

## Next Steps

- **Item 1 Acceptance:** Inventory doc created (above); API contract PR ready.
- **Item 2 Acceptance:** Existing rafMock.js documented; inline mocks identified for replacement.
- **Item 3 Acceptance:** Spreadsheet of problem areas (above); prioritized list: migrate classicBattle/ tests first.

Proceed to Phase 1 for items 1–3?

## Phase 1 Completion: Item 1 (Improve shared test mocking utilities)

**Actions Taken:**
- Created `tests/helpers/domFactory.js` with factories: `createStatButton()`, `createSnackbar()`, `createScoreboard()`.
- Added utilities: `attachEventSpy()`, `withMutedConsole()`.
- Created comprehensive unit tests in `tests/helpers/domFactory.test.js` covering all helpers.
- Ran unit tests: 10/10 passed.
- Ran regression tests: `timerService.test.js` (8 tests passed), `scrollButtonState.test.js` (8 tests passed).
- Ran Playwright test: `navigation.spec.js` (1 test passed).

**Outcome:**
- New helpers provide consistent DOM mocks with realistic behavior (disabled states, ARIA, event handling).
- No regressions in existing DOM-heavy tests.
- Acceptance criteria met: Helper exports documented, unit tests pass.

**Next:** Proceed to Item 1 Phase 2 (migrate high-value tests) or move to another item?
