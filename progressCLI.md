# QA Report — `src/pages/battleCLI.html`

This file contains the reviewed and reformatted QA findings for the battle CLI page. Each issue below includes: steps to reproduce, impact, likely root causes, suggested fixes (with files/areas to inspect), and a feasibility/effort estimate. At the end you'll find prioritized improvement opportunities, validation steps, and recommended next actions.

---

## Summary

- Scope: `src/pages/battleCLI.html` (battleClassic flow)
- Most critical: "Battle never starts — stuck at 'Waiting...'" (blocks all other verification)
- Goal of this document: verify the accuracy of the original QA notes, add concrete hypotheses and fix suggestions, and prioritise follow-up work.

---

## Findings

| Issue | Steps to reproduce | Impact | Likely root cause(s) | Fix feasibility / effort |
|---|---|---|---:|---:|
| Battle never starts — stuck at "Waiting…" | 1. Open `battleClassic.html`.\n2. Choose match length (Quick/Medium/Long) and close modal.\n3. Scoreboard shows "Waiting… Round 0"; no cards render; **Next** disabled. | Blocks testing of stat selection, timers, AI, scoring and end‑game logic. Critical. | Engine or orchestrator not initialising. Possible missing/failed async import (e.g. battle engine init), uncaught exception during dataset load (`judoka.json`), runtime error preventing render. | High priority — Feasibility: High; Effort: Medium. Start with console/log capture and error-handling around async imports and data loads. |
| Clickable area mis‑targets | Clicking near bottom of Quick button sometimes opens unrelated page (raw.githubusercontent link observed) | Confusing navigation; accidental context switch; accessibility/usability regression | Overlapping/transparent anchor or element capturing pointer events; z-index or modal not blocking background; stray href (template link) present in DOM. | Feasibility: High; Effort: Low — inspect DOM modal markup and event handlers; add pointer-event interception and fix stray anchors. |
| Keyboard selection does not work | Press number keys (1–3) or arrow keys while modal visible — no effect; only mouse click closes modal | Accessibility regression; fails PRD keyboard requirement | Modal does not bind keydown handlers or lacks focus management; first button not focused on open. | Feasibility: High; Effort: Low — add focus and key handlers, ensure ARIA roles. |
| Missing stat buttons and card visuals | `#stat-buttons` empty after modal close; `data-buttons-ready` never becomes `true` | Player cannot choose stats; screen readers have nothing to announce | Render flow dependent on engine initialisation or a promise that never resolves; DOM creation code gated by a flag that isn't set. | Feasibility: High; Effort: Medium — trace promise chain, add timeouts and defensive error handling. |
| Scoreboard timer never displays | `#next-round-timer` blank; scoreboard header remains "Waiting…" | Cannot validate auto‑select, pause/resume, timer drift handling | Timer start logic not reached because the round cycle did not start; or UI update code suppressed by error. | Feasibility: High; Effort: Low–Medium — same root cause as initialisation; add unit smoke test for timer start. |
| No opponent action feedback | No "Opponent is choosing…" messages or reveal delay | AI behaviour and difficulty can't be tested | AI selection code not executed due to stalled round lifecycle | Feasibility: High; Effort: Medium — re-run AI selection pathway after fixing init issues. |
| Quit flow unreachable | Quit confirmation and return-to-home modal do not appear because match never starts | Can't verify quit UX & no‑penalty requirement | Flow gating: quit confirmation may be shown only after match-start state; since match doesn't start, code path is not hit. | Feasibility: Medium; Effort: Low — make quit confirmation available pre-game or ensure state reaches started state. |
| Footer navigation accessible but breakable | Bottom nav remains active during match and allows navigation away without confirmation | Players can accidentally leave match; data loss | Footer not disabled/blocked during battle; main nav click handlers not intercepted | Feasibility: High; Effort: Low — disable or intercept during active match. |

---

## Root-cause verification checklist (quick diagnostic steps)

1. Open browser devtools console and reload `battleClassic.html`. Look for uncaught exceptions, failed network requests (404/500), or CORS errors.
2. Search for dynamic imports or promises around battle engine initialisation (look for `await import(`, `fetch('judoka.json')`, or `initBattle` / `battleClassic.init`).
3. Confirm `data-` attributes in DOM (e.g. `data-buttons-ready`, `data-round`) and whether they change after actions.
4. Reproduce clickable mis-target with an element inspector open to see stacked elements and pointer-events.
5. Run the code with verbose logging / enable test mode (if available) to trace lifecycle events.

These steps are short and should quickly indicate whether there is a fatal runtime error or a missing conditional that prevents the round loop from starting.

---

## Suggested fixes (concrete, actionable)

- Battle initialisation (critical)
  - What to inspect: `src/pages/battleCLI.html`, `src/helpers/classicBattle.js`, `src/helpers/battleEngineFacade.js`, any `initBattle`/`initClassicBattle` files, and network requests for `src/data/judoka.json`.
  - Action: Add try/catch around async imports and dataset fetches. Log and surface fatal errors using the in-app snackbar with a Retry button. Add a short unit/integration smoke test that initialises the battle engine in isolation.
  - Validation: fix is correct when selecting match length leads to a visible player card, stat buttons populate, and the scoreboard timer starts.

- Defensive DOM + event handling
  - What to inspect: the modal markup and footer DOM in `src/pages/*` and component templates.
  - Action: Ensure modal uses a backdrop that intercepts pointer events; remove/disable stray anchors; ensure z-index and pointer-events are correct. Focus the primary button on open and bind keyboard handlers for 1–3 / arrow keys / Enter / Esc.
  - Validation: keyboard selection works (1–3 selects option), clicking outside modal does not navigate away, and modal trap-focus behavior is correct.

- Accessibility & ARIA
  - Action: Add `aria-describedby` to stat buttons referencing short descriptions in a visually-hidden container; set appropriate roles on modal and buttons; ensure focus order is logical.

- Footer nav safety
  - Action: Disable or hide footer nav during active matches. If nav is clicked during a match, show a confirmation modal. Implement as a simple feature-guard so it's reversible.

- Test hooks & deterministic mode
  - Action: Expose query parameter support (e.g. `?testMode=1&seed=1234`) that sets `enableTestMode` and `seed` in the battle initialiser. Document usage in README and automated tests.

- Performance & low-end devices
  - Action: Replace JS-driven animations with CSS transitions where possible; lazy-load large images; add `prefers-reduced-motion` support.

---

## Improvement opportunities (revised and prioritized)

1. Critical — add robust error handling and visible fatal error UI (snackbar with Retry). (Effort: Medium)
2. High — fix modal focus/keyboard handlers and pointer-event interception to prevent mis-navigation. (Effort: Low)
3. High — trace and fix the initialisation promise chain so rounds start and stat buttons render. (Effort: Medium)
4. Medium — disable footer navigation during active matches (Effort: Low)
5. Medium — add ARIA descriptions to stat buttons and visual selection feedback. (Effort: Low)
6. Low — document and expose deterministic test hooks via query parameters and add a minimal integration test. (Effort: Medium)
7. Low — add optional audio cues and optimise images/animations for low-end devices. (Effort: Low–Medium)

---

## Validation / Acceptance criteria

- Selecting a match length should reliably transition the app to an "active match" state within 1s.
- Player and opponent cards should render and `#stat-buttons` should contain the stat buttons with `data-buttons-ready="true"`.
- The scoreboard timer (`#next-round-timer`) should start counting and display remaining time.
- Keyboard selection (1–3, arrow keys, Enter/Esc) must work on the match-length modal and stat selection UI.
- Footer navigation must be disabled or require confirmation while a match is active.
- Any fatal error during initialisation should show a visible snackbar with a Retry action and a concise error message.

Run the project's validation checklist after fixes (recommended):

```bash
npx prettier . --check
npx eslint .
npm run check:jsdoc
npx vitest run
npx playwright test
```

See `docs/validation-commands.md` for full verification guidance.

---

## Next steps (recommended immediate work items)

1. Reproduce the failure with browser devtools open and capture console/network errors (2–5 minutes).
2. Add a single try/catch around the battle initialisation code and display the caught error in the app's snackbar (20–60 minutes).
3. Fix modal focus and keyboard handlers (15–45 minutes).
4. Re-run the repro and validate card rendering and timer behaviour. If still blocked, attach the console logs and failing stack trace.

---

If you want, I can: run a quick grep for likely init symbols (`initClassicBattle`, `battleClassic.init`, `judoka.json`) and produce a targeted list of files to edit next. Or I can implement the defensive try/catch + snackbar patch and a minimal unit test for the initialiser — tell me which you'd prefer and I'll proceed.

---

*Revision/verification performed: reviewed original QA notes, added root-cause hypotheses and practical fixes, and prioritized tasks with feasibility/effort estimates.*

