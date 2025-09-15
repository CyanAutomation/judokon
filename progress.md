Quick plan

Present a short prioritized list (High/Medium/Low) of tests that mutate document.body.
For each item give one-line rationale and a minimal suggested migration (mount + clearBody, or call public init/setup API).
End with recommended next step (batch size and options).
Checklist

Find tests that mutate document.body or assign innerHTML — Done (grep across tests/helpers/\*\*).
Prioritize by risk (global leakage, timers, core app flow) — Done.
Provide per-file suggested migration pattern — Done.
Summary numbers

Matches found (grep): ~200 hits across tests/helpers (many files touched). I filtered to the most relevant test files for migration.
High-priority candidates: tests that (a) affect global app flows (classicBattle/timer/scoreboard), (b) use timers or state, or (c) are brittle when body is mutated.

Verification updates (repo scan on 2025-09-14)

- Confirmed counts: 213 lines with `document.body` and 150 with `innerHTML =` under `tests/helpers`.
- Filenames verified: all high-priority examples exist and mutate body.
- Correction: the timer suite file is `tests/helpers/classicBattle/timerService.nextRound.test.js` (not `timerService.test.js`).
- Correction: `tests/helpers/settingsPage.test.js` still appends to `document.body` (not yet migrated).
- Correction: `tests/helpers/uiHelpers.resetBattleUI.test.js` still uses `document.body.*` patterns (not yet migrated).
- Verified: `tests/helpers/bottomNavigation.test.js` is already using `mount()` + `clearBody()`.
- Verified: `tests/helpers/selectionHandler.test.js` initializes scoreboard with `initScoreboard(document.body)` — should pass a container-scoped header instead.
  High priority — migrate first (safe, small changes, tests that frequently flake or leak)

classicBattlePage.syncScoreDisplay.test.js
Why: core UI init; uses document.body.append(header) and multiple app flows.
Suggestion: use const { container } = mount(); container.appendChild(header); then call the init or setup*API; teardown with clearBody().
tests/helpers/classicBattle/*. (examples)
controlState.test.js
stateTransitions.test.js
roundSelectModal.positioning.test.js
Why: heavy use of body dataset and event-driven behavior; leaking state will break many tests.
Suggestion: mount a container and pass root/header to init* or adapter functions. Avoid body dataset modifications — set dataset on the container if needed.
timerService.nextRound.test.js and related timer tests
Why: used scheduler mocks and appended buttons/timers to body; mixing timer strategies was already a source of failures.
Suggestion: mount the DOM for controls, keep using createMockScheduler() or Vitest fake timers consistently; pass root to startCooldown/startTimer where available.
selectionHandler.test.js
Why: writes document.body.innerHTML and calls initScoreboard(document.body) — a public initializer should receive a container instead.
Suggestion: build a container via mount() and call initScoreboard(container) (or pass header element).
tests/helpers/scoreboard.* (ordering, authority, waiting, adapter.prd, dom-contract)
Why: they manipulate header markup and are central to battle UI; already migrated some but ensure all scoreboard tests use container mounting.
Suggestion: ensure initBattleScoreboardAdapter() is called against a container-scoped header; teardown via clearBody().
Medium priority — migrate next (UI helpers, settings, navigation)

uiHelpers.resetBattleUI.test.js
Move remaining direct body writes into `mount()`; pass the contained root to helpers.
bottomNavigation.test.js (already migrated — keep as-is)
Keep as-is if uses mount(). If other navigation tests still append to body, migrate same pattern.
tests/helpers/settingsPage.test.js, renderFeatureFlags.test.js

- renderFeatureFlags.test.js is already on `mount()` — keep as-is.
- settingsPage.test.js still appends to body — change to `const { container } = mount(); container.appendChild(createSettingsDom());`.
  tests/helpers/renderGameModes.test.js, viewTransitionTheme.test.js, syncDisplayMode.test.js
  Why: append setting DOM to body; move to mount container.
  Low priority — surface/utility tests and fixtures

fixtures.js (sets document.body.innerHTML = html)
Why: fixture uses global body; prefer returning a DOM fragment or expose a mountFixture() helper.
Suggestion: change fixtures to export an element or a string that tests pass to mount(...).
tests/helpers/randomJudokaPage.\* (drawButton/historyPanel)
They append whole sections; move to mount.
tests/helpers/svgFallback.test.js, layoutDebugPanel.test.js, svg-related tests
Easy to migrate to mount().
Tests that should use public APIs rather than direct DOM mutation

Any test that calls document.body.append(...) then calls an init*function using document implicitly:
Examples: setupScoreboard, setupChangeLogPage, populateNavbar, setupBottomNavbar, initScoreboardAdapter, initBattleScoreboardAdapter
Why: these modules typically accept or could accept a root/parent — tests should construct the DOM and pass that element into the public initializer instead of assuming global DOM.
Suggestion: update tests to create the minimal required element(s) in container and call the corresponding init* or setup\* function with that element (or pass { root: container } when available).
Note: avoid modifying public APIs without explicit approval. Prefer wrapper helpers in tests that adapt existing APIs to container-scoped elements (e.g., construct a header inside the container and pass that element), or use adapter modules that already accept a root.
Tests that target behavior rather than markup:
If a test is manipulating markup to simulate internal rendering, but the same behavior is accessible via initFoo() or fooApi, prefer calling the public API and asserting on public outputs (events emitted, callbacks invoked, DOM changes inside container).
Examples: resetNextButton should be driven via the store or control API where possible; selectionHandler should be exercised through startRound/dispatchBattleEvent rather than by hacking body.
Prioritization rationale

Start with tests that:
mutate document.body and interact with timers or battle state (high risk of leakage and flakiness).
call global init\* functions expecting body — migrating these yields the largest stability wins.
are small, self-contained (easy 1-file fixes). Use these as quick wins to validate the mount pattern.
Suggested immediate next batch (I can implement)

Batch size: 6 (safe, fast).
Files to migrate next (recommended order):
classicBattlePage.syncScoreDisplay.test.js
selectionHandler.test.js
controlState.test.js
roundSelectModal.positioning.test.js
timerService.nextRound.test.js
randomJudokaPage.drawButton.test.js
settingsPage.test.js

For each: replace document.body mutations with const { container } = mount(htmlOrElement) or create elements and append to container; call public init functions with the container/header argument; add afterEach(() => clearBody()).

Additional opportunities for improvement (beyond body mutations)

- Replace synthetic event dispatching with natural interactions or shared helpers where possible.
  - Example: instead of `element.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }))`, use a utility like `pressKey(element, "ArrowDown")` from `tests/utils/componentTestUtils.js` or expose a small helper in `tests/helpers/domUtils.js`.
- Timer discipline: favor `vi.useFakeTimers()` + `await vi.runAllTimersAsync()` for deterministic timing. Where a scheduler abstraction exists (e.g., `createMockScheduler()`), keep tests on the mock and avoid mixing with real timers.
- Console discipline: prefer `withMutedConsole()` over raw `vi.spyOn(console, ...)` for warnings/errors to satisfy repo policy consistently.
- Dataset usage: avoid `document.body.dataset.*` in tests; if needed, set dataset on the mounted container (`container.dataset.*`) and adjust initializers to read from passed elements rather than body.
- Guardrails in CI: add a targeted grep to flag ad‑hoc body writes in tests (allowing the centralized `mount()` wrapper):
  - Allowlist `tests/helpers/domUtils.js` and `tests/utils/componentTestUtils.js` and flag other `document.body\.(innerHTML|append|appendChild)` occurrences.

Quick code patterns

- Mounting: `const { container } = mount(); container.appendChild(header);` then `clearBody()` in `afterEach`.
- Scoreboard: create `header` inside container; `initScoreboard(header)` instead of `initScoreboard(document.body)`.
- Settings: `const { container } = mount(); container.appendChild(createSettingsDom());`.
- Random card: mount `{ section, container, template }` into a wrapper with `container.append(...)` instead of `document.body.append(...)`.
