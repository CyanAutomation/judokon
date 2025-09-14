Quick plan

Present a short prioritized list (High/Medium/Low) of tests that mutate document.body.
For each item give one-line rationale and a minimal suggested migration (mount + clearBody, or call public init/setup API).
End with recommended next step (batch size and options).
Checklist

Find tests that mutate document.body or assign innerHTML — Done (grep across tests/helpers/**).
Prioritize by risk (global leakage, timers, core app flow) — Done.
Provide per-file suggested migration pattern — Done.
Summary numbers

Matches found (grep): ~200 hits across tests/helpers (many files touched). I filtered to the most relevant test files for migration.
High-priority candidates: tests that (a) affect global app flows (classicBattle/timer/scoreboard), (b) use timers or state, or (c) are brittle when body is mutated.
High priority — migrate first (safe, small changes, tests that frequently flake or leak)

classicBattlePage.syncScoreDisplay.test.js
Why: core UI init; uses document.body.append(header) and multiple app flows.
Suggestion: use const { container } = mount(); container.appendChild(header); then call the init or setup* API; teardown with clearBody().
tests/helpers/classicBattle/*. (examples)
controlState.test.js
stateTransitions.test.js
roundSelectModal.positioning.test.js
Why: heavy use of body dataset and event-driven behavior; leaking state will break many tests.
Suggestion: mount a container and pass root/header to init* or adapter functions. Avoid body dataset modifications — set dataset on the container if needed.
timerService.test.js and related timer tests
Why: used scheduler mocks and appended buttons/timers to body; mixing timer strategies was already a source of failures.
Suggestion: mount the DOM for controls, keep using createMockScheduler() or Vitest fake timers consistently; pass root to startCooldown/startTimer where available.
selectionHandler.test.js
Why: writes document.body.innerHTML and calls initScoreboard(document.body) — a public initializer should receive a container instead.
Suggestion: build a container via mount() and call initScoreboard(container) (or pass header element).
tests/helpers/scoreboard.* (ordering, authority, waiting, adapter.prd, dom-contract)
Why: they manipulate header markup and are central to battle UI; already migrated some but ensure all scoreboard tests use container mounting.
Suggestion: ensure initBattleScoreboardAdapter() is called against a container-scoped header; teardown via clearBody().
Medium priority — migrate next (UI helpers, settings, navigation)

uiHelpers.resetBattleUI.test.js (already migrated in prior batch — verify remaining body uses)
If any direct body writes remain, move into mount.
bottomNavigation.test.js (already migrated)
Keep as-is if uses mount(). If other navigation tests still append to body, migrate same pattern.
tests/helpers/settingsPage.test.js, renderFeatureFlags.test.js (moved to mount already)
Confirm any tests still using createSettingsDom() append directly — call container.appendChild(createSettingsDom()).
tests/helpers/renderGameModes.test.js, viewTransitionTheme.test.js, syncDisplayMode.test.js
Why: append setting DOM to body; move to mount container.
Low priority — surface/utility tests and fixtures

fixtures.js (sets document.body.innerHTML = html)
Why: fixture uses global body; prefer returning a DOM fragment or expose a mountFixture() helper.
Suggestion: change fixtures to export an element or a string that tests pass to mount(...).
tests/helpers/randomJudokaPage.* (drawButton/historyPanel)
They append whole sections; move to mount.
tests/helpers/svgFallback.test.js, layoutDebugPanel.test.js, svg-related tests
Easy to migrate to mount().
Tests that should use public APIs rather than direct DOM mutation

Any test that calls document.body.append(...) then calls an init* function using document implicitly:
Examples: setupScoreboard, setupChangeLogPage, populateNavbar, setupBottomNavbar, initScoreboardAdapter, initBattleScoreboardAdapter
Why: these modules typically accept or could accept a root/parent — tests should construct the DOM and pass that element into the public initializer instead of assuming global DOM.
Suggestion: update tests to create the minimal required element(s) in container and call the corresponding init* or setup* function with that element (or pass { root: container } when available). If the source function doesn't accept root, add a small, backward-compatible root argument (default to document) in the implementation and use it in tests.
Tests that target behavior rather than markup:
If a test is manipulating markup to simulate internal rendering, but the same behavior is accessible via initFoo() or fooApi, prefer calling the public API and asserting on public outputs (events emitted, callbacks invoked, DOM changes inside container).
Examples: resetNextButton should be driven via the store or control API where possible; selectionHandler should be exercised through startRound/dispatchBattleEvent rather than by hacking body.
Prioritization rationale

Start with tests that:
mutate document.body and interact with timers or battle state (high risk of leakage and flakiness).
call global init* functions expecting body — migrating these yields the largest stability wins.
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
For each: replace document.body mutations with const { container } = mount(htmlOrElement) or create elements and append to container; call public init functions with the container/header argument; add afterEach(() => clearBody()).