TBC
## 2025-09-27 — Phase: CLI selection guard and reset cleanup

- Implemented reentrancy guard in `src/pages/battleCLI/init.js:selectStat` to prevent duplicate selections/highlights during rapid inputs. Guard uses `selectionApplying` and existing `state.roundResolving`.
- Enhanced `resetMatch()` to synchronously clear lingering `.selected` and `aria-selected` states and remove `data-selected-index` on the stat list. Also resets guard state.
- Focused unit tests run:
  - Ran Vitest with pattern "classicBattle stat selection" → PASS (subset only).
- Playwright: not run in this phase (will request elevation in next phase when needed).

Outcome: No regressions detected in targeted unit tests. Ready for review.
