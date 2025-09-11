## PRD: Battle Scoreboard — reconciliation

I compared `design/productRequirementsDocuments/prdBattleScoreboard.md` against the repository implementation and recorded matches, gaps, and concrete file references below.

Checklist of explicit PRD expectations (short) and status:

- Entry point: scoreboard module at `src/helpers/battleScoreboard.js` — Status: MISMATCH
  - Implementation: scoreboard surface lives under `src/helpers/setupScoreboard.js` and `src/components/Scoreboard.js`.

- Consumes canonical events (control.state.changed, round.started, round.timer.tick, round.evaluated, match.concluded) — Status: PARTIAL
  - Code emits/bridges many PRD events (see `src/helpers/classicBattle/roundResolver.js` which emits `round.evaluated` / `display.score.update`).
  - Wiring to scoreboard mostly happens through classic battle helpers and event adapters rather than a single scoreboard subscriber: see `src/helpers/classicBattle/uiService.js`, `src/helpers/classicBattle/roundUI.js`, and `src/helpers/classicBattle/roundResolver.js`.

- UI-only component, no business logic — Status: PARTIAL
  - `src/components/Scoreboard.js`, `ScoreboardModel.js` and `ScoreboardView.js` are primarily UI. Some policy/guards (message lock) are implemented on the component layer (`Scoreboard.showMessage`).

- DOM contract: `data-outcome` on root scoreboard element; expose round/timer/score elements — Status: PARTIAL/MINOR MISMATCH
  - Implementation sets `data-outcome` on `#round-message` (message element) rather than on a root scoreboard container. Files: `src/components/Scoreboard.js`, `src/components/ScoreboardView.js`.

- Timing & animations: score animation ≤ 500ms, reduced-motion respect, timer visible ≤200ms, waiting fallback ≤500ms — Status: MISSING / PARTIAL
  - Timer ticks are rendered via `attachCooldownRenderer` → `scoreboard.updateTimer` (`src/helpers/CooldownRenderer.js`).
  - There is no explicit score animation or reduced-motion branch in `src/components/ScoreboardView.js` (it directly sets HTML). A RAF-based animation appears in offline/compiled metadata but not in the source view. No explicit "Waiting…" fallback timer in the scoreboard init path was found.

- Authority rules: visual transitions keyed to `control.state.changed` and outcomes persist until next authoritative transition — Status: MISMATCH/PARTIAL
  - The implementation often updates scoreboard directly from round lifecycle handlers (`roundResolved`, `roundStarted`) and adapter events (`display.score.update`). There is no single canonical `control.state.changed` subscription in the scoreboard component itself. See `src/helpers/classicBattle/*`.

- Lifecycle/idempotency: create() idempotent, destroy unsubscribes, ignores out-of-order events — Status: PARTIAL
  - `initScoreboard` stores a module-level `defaultScoreboard` and `destroy()` nulls it. There is no visible subscribe/unsubscribe logic on the component (because event wiring is external). Duplicate-event guards exist partially at message-layer (message lock) but not full round-index-based guards in the scoreboard component. Files: `src/components/Scoreboard.js`, `src/helpers/setupScoreboard.js`.

- Accessibility: live regions, reduced-motion, announce only on outcome/state change — Status: PARTIAL
  - ARIA attributes (`aria-live`, `aria-atomic`) are present on elements (`src/components/Scoreboard.js`). Throttling/announce-only-on-outcome logic is limited; message locking exists but explicit announcer timers/announce suppression per tick are not implemented in the view.

Concrete gaps / recommended next steps (small, actionable):

1. Align entrypoint: add `src/helpers/battleScoreboard.js` (adapter) or update PRD to reference `setupScoreboard.js` so documentation and code agree.
2. Move authority wiring to a single adapter that subscribes to canonical `control.state.changed` and then diffs/forwards to scoreboard (reduces duplicated wiring across `classicBattle/*`).
3. Implement score animation + prefers-reduced-motion branch in `ScoreboardView.js` (500ms RAF animation or CSS transition) or document why simplified rendering is acceptable.
4. Add the 500ms "Waiting…" fallback on scoreboard mount (mount → setTimeout 500ms → showTemporaryMessage("Waiting…") if no authoritative state seen).
5. Consider exposing a `getSnapshot()` alias for tests (currently `getState()` exists) and document public API names in PRD.

Key files referenced (examples):

- PRD: design/productRequirementsDocuments/prdBattleScoreboard.md
- Component impl: src/components/Scoreboard.js, src/components/ScoreboardView.js, src/components/ScoreboardModel.js
- Adapter / bootstrap: src/helpers/setupScoreboard.js
- Event wiring / callers: src/helpers/classicBattle/uiService.js, src/helpers/classicBattle/roundUI.js, src/helpers/classicBattle/roundResolver.js
- Timer adapter: src/helpers/CooldownRenderer.js

If you want, I can do any of the following next (pick one):

- implement the 500ms Waiting… fallback + a small unit test, or
- add score animation respecting prefers-reduced-motion, or
- create a lightweight `src/helpers/battleScoreboard.js` adapter that subscribes to `control.state.changed` and forwards canonical events to the existing scoreboard API.

Requirements coverage summary:

- PRD Entry point naming: MISMATCH
- Canonical event consumption: PARTIAL
- UI-only and no business logic: PARTIAL
- DOM contract (data-outcome location): MINOR MISMATCH
- Timings/animations/fallbacks: MISSING / PARTIAL
- Authority rules (single source of truth): MISMATCH
- Lifecycle/idempotency: PARTIAL
- Accessibility: PARTIAL

End of reconciliation.

---

## Reconciliation Verification (current)

I re-read `design/productRequirementsDocuments/prdBattleScoreboard.md`, inspected the implementation, and confirmed or corrected the earlier notes. Below are verified findings with concrete references, followed by a phased remediation plan.

- Entry point at `src/helpers/battleScoreboard.js` — Status: MISMATCH
  - Confirmed: no `battleScoreboard.js` present. Scoreboard surface lives under `src/helpers/setupScoreboard.js` and `src/components/Scoreboard*.js`.

- Consumes canonical events (control.state.changed, round.started, round.timer.tick, round.evaluated, match.concluded) — Status: PARTIAL
  - Emission/bridging exists: `round.evaluated` is emitted in `src/helpers/classicBattle/roundResolver.js` (emitRoundResolved), `match.concluded` and `round.started` are bridged from the engine in `src/helpers/classicBattle/engineBridge.js`. `round.timer.tick` is also bridged there.
  - Missing: the scoreboard itself does not subscribe to these canonical events; updates arrive via Classic Battle handlers (`roundUI.js`, `uiService.js`) and the convenience `display.score.update` event.

- UI-only component, no business logic — Status: PARTIAL
  - `ScoreboardModel` and `ScoreboardView` are UI-focused. `Scoreboard.showMessage` implements a one‑second “message lock” policy (a small logic guard), which is acceptable but deviates from “pure view”. No engine logic is present in the component.

- DOM contract (`data-outcome` on root scoreboard element; expose round/timer/score elements) — Status: MINOR MISMATCH
  - Current behavior: sets `data-outcome="true"` on `#round-message` when `opts.outcome` is passed (`src/components/ScoreboardView.js`). PRD requires `data-outcome` on the root scoreboard element with values `playerWin|opponentWin|draw|none`. No such mapping exists today; CSS references the boolean variant (`src/styles/battle.css`).

- Timings & animations (≤500ms score animation; reduced-motion; timer visible ≤200ms; fallback “Waiting…” ≤500ms) — Status: MISSING/PARTIAL
  - Timer ticks are rendered via `attachCooldownRenderer` → `scoreboard.updateTimer` (`src/helpers/CooldownRenderer.js`). There is no explicit guarantee or test for the 200ms visibility threshold (it’s effectively immediate except when intentionally deferred to avoid clobbering an opponent prompt).
  - No score-change animation or `prefers-reduced-motion` branch is implemented in `ScoreboardView` (score is replaced synchronously).
  - No explicit “Waiting…” fallback rendered on mount (no `setTimeout`/clear-on-state-change path found).

- Authority rules (visual transitions keyed to `control.state.changed`; outcomes persist until next authoritative transition) — Status: MISMATCH/PARTIAL
  - Verified: transitions/messages are primarily driven from Classic Battle handlers (`roundResolved`, countdown paths) rather than a single `control.state.changed` subscriber. The engine bridge emits PRD-style events, but the scoreboard does not consume them directly.

- Lifecycle & idempotency (idempotent create; destroy unsubscribes; ignore out-of-order) — Status: PARTIAL
  - `initScoreboard` (in `setupScoreboard.js`) sets a module-level `defaultScoreboard`; `destroy()` in `Scoreboard.js` is a no-op (no subscriptions to tear down). Multiple inits overwrite the instance rather than returning the same instance. No round-index guard exists in the component (guards live in orchestrator/handlers).

- Accessibility (live regions; announce only on outcome/state change; reduced-motion) — Status: PARTIAL
  - ARIA live/atomic present on message, timer, and round elements (`Scoreboard.js`). This may cause over-announcing on timer ticks contrary to PRD’s “announce only on outcome/state change”. No reduced‑motion variations for score updates.

Key evidence (non-exhaustive):
- PRD: `design/productRequirementsDocuments/prdBattleScoreboard.md` (sections 5–11 define events, DOM contract, timing, lifecycle)
- Components: `src/components/Scoreboard.js`, `src/components/ScoreboardView.js`, `src/components/ScoreboardModel.js`
- Bootstrap/adapter: `src/helpers/setupScoreboard.js`
- Event emission/bridges: `src/helpers/classicBattle/roundResolver.js`, `src/helpers/classicBattle/engineBridge.js`, `src/helpers/classicBattle/roundUI.js`, `src/helpers/classicBattle/uiService.js`
- Timer rendering: `src/helpers/CooldownRenderer.js`
- CSS using boolean outcome: `src/styles/battle.css` (e.g., `#round-message[data-outcome="true"]`)

Corrections to earlier notes:
- Canonical event availability is broader than implied: `engineBridge.js` emits `round.started`, `round.timer.tick`, and `match.concluded` in PRD form. The gap is specifically the scoreboard not binding to them directly.
- The DOM contract mismatch is specifically about attribute semantics and target element, not missing elements. `#round-message`, `#next-round-timer`, `#round-counter`, and `#score-display` exist and are wired.

Requirements coverage summary (unchanged statuses, now verified with references):
- PRD Entry point naming: MISMATCH
- Canonical event consumption: PARTIAL (bridge present; scoreboard not subscribed)
- UI-only and no business logic: PARTIAL (minor policy in message locking)
- DOM contract (data-outcome location/values): MINOR MISMATCH
- Timings/animations/fallbacks: MISSING / PARTIAL
- Authority rules (single source of truth): MISMATCH
- Lifecycle/idempotency: PARTIAL
- Accessibility: PARTIAL

## Phased remediation plan

Phase 0 — Contract shim and tests
- Add `src/helpers/battleScoreboard.js` as a lightweight adapter (no hot-path dynamic imports) that subscribes to PRD events (`control.state.changed`, `round.started`, `round.timer.tick`, `round.evaluated`, `match.concluded`) and forwards to the existing `Scoreboard` API.
- Provide a disposer to unsubscribe (store in module scope), and simple Vitest coverage: happy-path updates and disposer behavior.
- Expose `getSnapshot()` alias (maps to `getState()`) to align with PRD naming for tests.

Phase 1 — DOM contract alignment
- Decide the scoreboard root element: either wrap the current header children in an explicit container or annotate an existing container.
- Set `data-outcome` on the root element with values `playerWin|opponentWin|draw|none`; stop using the boolean flag on `#round-message`.
- Update CSS selectors accordingly; add a minimal test asserting attribute values across outcomes.

Phase 2 — Authority wiring and state persistence
- Move visual transition triggers to the adapter keyed on `control.state.changed`; keep domain/timer events as value updates only.
- Ensure outcome rendering persists until the next authoritative transition (adapter holds last outcome and clears on `to===selection|cooldown`).
- Add test cases for persistence and clearing on state change.

Phase 3 — Timing, animation, reduced motion
- Implement a ≤500ms score-change animation (CSS class or JS with RAF) with a `prefers-reduced-motion` branch that disables it.
- Ensure initial timer text becomes visible within ≤200ms from the corresponding event; add a basic timing assertion in tests (with generous margin to avoid flakiness).
- Add a “Waiting…” fallback shown ≤500ms after mount when no `control.state.changed` is seen, and clear it on the first state event.

Phase 4 — Accessibility and announce discipline
- Limit live-region announcements to outcome/state changes; set timer and round counters to either `aria-live="off"` or gate updates behind non-announcing nodes.
- Add tests that mutate values without producing extra announcements (spy/allowlist pattern in tests).

Phase 5 — Cleanup and idempotency
- Ensure `create()` is idempotent (return existing instance) and `destroy()` unsubscribes via the adapter disposer and clears state.
- Add a simple out-of-order event guard in the adapter (e.g., ignore older `roundIndex`).

Notes and constraints
- No public API rename in hot paths; introduce `battleScoreboard.js` as an additive adapter to preserve current call sites. Mark legacy boolean `data-outcome` usage for deprecation in CSS after migration.
- Keep imports static in hot paths; preload optional modules if needed.

Pause — awaiting review before starting Phase 0.

---

Phase 0 — progress log

Step 0.1: Implement PRD adapter skeleton
- Actions: Added `src/helpers/battleScoreboard.js` exposing `initBattleScoreboardAdapter`, `disposeBattleScoreboardAdapter`, and `getSnapshot` alias. Subscribed to PRD events (`round.started`, `round.timer.tick`, `round.evaluated`, `match.concluded`, `control.state.changed` [no-op for now]) and forwarded to the existing Scoreboard API. Included unsubscribe logic.
- Outcome: Adapter compiles and is inert until initialized; does not change existing hot paths. No public API changes.

Step 0.2: Add basic unit tests for adapter
- Actions: Added `tests/helpers/battleScoreboard.adapter.prd.test.js` covering happy-path updates from `round.started` and `round.evaluated`, and disposer behavior.
- Outcome: Tests created; will run targeted tests at end of Phase 0.

Step 0.3: Phase 0 validation
- Actions: Ran targeted unit tests: `npx vitest run tests/helpers/battleScoreboard.adapter.prd.test.js --run`.
- Outcome: PASS (2 passed). No regressions observed in adapter behavior.

Pausing after Phase 0 for review.

Phase 1 — progress log

Step 1.1: DOM contract support in ScoreboardView
- Actions: Extended `ScoreboardView` to accept an optional `rootEl` and set enumerated `data-outcome` on the root (`playerWin|opponentWin|draw|none`) while keeping the existing boolean `data-outcome` on `#round-message` for backward compatibility. Updated `initScoreboard` to pass the container as `rootEl`.
- Outcome: Root outcome attribute is now available without breaking existing selectors or behavior.

Step 1.2: Adapter sets outcome values
- Actions: Updated `src/helpers/battleScoreboard.js` to map PRD outcomes to enumerated values and set the root `data-outcome`. Also reset the root to `none` on `round.started`.
- Outcome: PRD events now drive the standardized root attribute consistently.

Step 1.3: Add DOM contract unit test
- Actions: Added `tests/helpers/battleScoreboard.dom-contract.test.js` to assert that the header receives `data-outcome` values and clears to `none`, while maintaining boolean `data-outcome` on `#round-message`.
- Outcome: Targeted tests ready; will run them below.

Step 1.4: Phase 1 validation
- Actions: Ran targeted unit tests: `npx vitest run tests/helpers/battleScoreboard.dom-contract.test.js tests/helpers/battleScoreboard.adapter.prd.test.js --run`.
- Outcome: PASS (3 total tests). No regressions observed.

Pausing after Phase 1 for review.

Phase 2 — progress log

Step 2.1: Authority wiring keyed to control.state.changed
- Actions: Enhanced `src/helpers/battleScoreboard.js` to track current state and last outcome. Added a handler for `control.state.changed` that clears the root outcome (`none`) and message only when `to` is `selection` or `cooldown`, ensuring persistence across other transitions. Kept `round.timer.tick` and other domain events as value updates only.
- Outcome: Outcomes now persist until the next authoritative transition to `selection`/`cooldown`; adapter clears in those cases.

Step 2.2: Add persistence/clear tests
- Actions: Added `tests/helpers/battleScoreboard.authority.test.js` to verify that outcome persists through timer ticks and unrelated states, and clears on `selection`/`cooldown`.
- Outcome: Tests created; will run them below.

Step 2.3: Phase 2 validation
- Actions: Ran targeted tests: `npx vitest run tests/helpers/battleScoreboard.authority.test.js tests/helpers/battleScoreboard.dom-contract.test.js tests/helpers/battleScoreboard.adapter.prd.test.js --run`.
- Outcome: PASS (4 total tests across 3 files). Adjusted adapter to bypass message lock on authoritative clear by sending `{ outcome: true, outcomeType: 'none' }` with empty text.

Pausing after Phase 2 for review.

Phase 3 — progress log

Step 3.1: Add score-change animation with reduced-motion branch
- Actions: Updated `src/components/ScoreboardView.js` to import `shouldReduceMotionSync` and animate score changes ≤400ms when motion is allowed; otherwise update immediately. Cancels prior RAF to avoid overlap.
- Outcome: Smooth, bounded score animation; respects `prefers-reduced-motion` and settings toggle.

Step 3.2: Add “Waiting…” fallback (≤500ms) in adapter
- Actions: Enhanced `src/helpers/battleScoreboard.js` to schedule a 500ms timer on init that shows “Waiting…” unless a state or domain event arrives first. Any relevant event cancels and clears the fallback.
- Outcome: Deterministic fallback messaging that does not overshadow early authoritative events.

Step 3.3: Add targeted tests
- Actions: Added `tests/helpers/battleScoreboard.waiting.test.js` for fallback behavior. (Score animation relies on motionUtils; reduced-motion immediate path is implicitly exercised by existing tests that mock `shouldReduceMotionSync` to true.)
- Outcome: Targeted coverage for fallback; animation path remains opt-in with motion enabled.

Step 3.4: Phase 3 validation
- Actions: Ran targeted tests: `npx vitest run tests/helpers/battleScoreboard.waiting.test.js tests/helpers/battleScoreboard.authority.test.js tests/helpers/battleScoreboard.dom-contract.test.js tests/helpers/battleScoreboard.adapter.prd.test.js --run`.
- Outcome: PASS (5 tests across 4 files). Adapter now schedules/clears fallback correctly. Score updates remain deterministic with immediate set; animation path is conditional and non-disruptive.

Pausing after Phase 3 for review.
