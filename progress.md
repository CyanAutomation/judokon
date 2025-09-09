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

