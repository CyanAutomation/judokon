# PRD: Classic Battle

---

**Game Mode ID:** `1` (URL: battleClassic.html)

[Back to Game Modes Overview](prdGameModes.md)

---

## TL;DR

Classic Battle is Ju-Do-Kon!’s introductory, head-to-head mode. By offering a fast-paced, low-stakes way for new players to learn stats and game flow (match start ≤5 s after selection), it boosts retention and confidence while maintaining quick matches. This PRD defines how the mode operates, from random draws to scoring and end conditions, ensuring a smooth, accessible, and engaging experience.

> Sora starts a Classic Battle and draws her first card. She confidently taps “Speed,” seeing her stat triumph over the AI’s card. The score ticks up with a satisfying sound. Round after round, she learns which stats matter most. By the end, she feels ready to tackle harder battles — and wants to play again.

---

## Problem Statement

Classic Battle is the main and simplest mode of the game. Without it, new players lack a quick, low-stakes mode to learn stats and grasp the core mechanics. This leads to higher early player drop-off, increased frustration, and fewer repeat sessions because players don’t build mastery or confidence. By providing a fast, engaging way to compare stats, Classic Battle helps new players onboard smoothly and encourages early retention.

> **Player Feedback Example:**  
> “I tried Ranked Mode first and felt lost — I didn’t know which stat to pick or what the cards meant.” – Playtester, Age 10

This feedback highlights why Classic Battle is needed now: new players currently face an overwhelming experience without a safe mode to experiment with card stats and turn flow.

---

## Goals

- Deliver a quick head-to-head mode for new players, with average match length ≤3 minutes.
- Encourage replay through a simple, rewarding scoring system.
- Increase daily plays by new users by 15%.
- ≥70% of new players complete a Classic Battle within their first session.
- Give new players an approachable mode to learn how judoka stats impact outcomes.
- Reduce frustration by providing immediate, clear feedback on round results.
- Ensure round result messages (`#round-message`), stat selection timer (`#next-round-timer`), and score (`#score-display`) are surfaced via the Scoreboard (see prdBattleScoreboard.md) for clarity and accessibility. The "Select your move" prompt and the countdown to the next round are shown in snackbars that update their text each second. Add hidden stat descriptions referenced by `aria-describedby` on each stat button so screen readers get a short hint without opening a tooltip.

---

## Non-Goals

- Online multiplayer battles.
- Adjustable timer settings for stat selection (may be considered in future versions).

---

## User Stories

- As a new player, I want a simple match format so I can learn game mechanics quickly (**tutorial complete in ≤60 s**).
- As a player, I want clear feedback on round outcomes so I know how I’m doing.
- As a player, I want the ability to exit a match early if I need to stop playing suddenly.
- As a cautious new player, I want an easy mode to test the game without risking losses in competitive play.
- As a child learning the game, I want a colorful, exciting match flow so I stay interested and keep playing.
- As a player with motor limitations, I want enough time to make stat selections without feeling rushed.

---

## Gameplay Basics

- On first visit to `battleJudoka.html`, a modal prompts the player to select a win target of **5, 10, or 15 points** (default 10). After a choice is made, the modal closes and the match begins.
- The standard deck contains **99 unique cards**.
- Each match begins with both sides receiving **25 random cards**.
- At the start of each round, both players draw their top card.
- The player selects one stat (Power, Speed, Technique, etc.).
- Stat buttons stay disabled until the selection phase and turn off after a choice is made.
- The higher value wins the round and scores **1 point**; used cards are discarded.
- The match ends when a player reaches a **user-selected win target of 5, 10, or 15 points** (default 10) or after **25 rounds** (draw).

---

## Technical Considerations

- Classic Battle logic must reuse shared random card draw module (`generateRandomCard`).
- Round selection modal must use shared `Modal` and `Button` components for consistent accessibility.
- Card reveal and result animations should use hardware-accelerated CSS for smooth performance on low-end devices.
- Stat selection timer (30s) must be displayed in `#next-round-timer`; if the timer expires, a random stat is auto-selected. This auto-select behavior is controlled by a feature flag `autoSelect` (enabled by default). The timer must pause if the game tab is inactive or device goes to sleep, and resume on focus (see prdBattleScoreboard.md).
- Stat selection timer halts immediately once the player picks a stat.
- Detect timer drift by comparing engine state with real time; if drift exceeds 2s, display "Waiting…" and restart the countdown.
- Opponent stat selection runs entirely on the client. After the player picks a stat (or the timer auto-chooses), the opponent's choice is revealed after a short artificial delay to mimic turn-taking.
- During this delay, the Scoreboard displays "Opponent is choosing..." in `#round-message` to reinforce turn flow.
- The cooldown timer between rounds begins only after round results are shown in the Scoreboard and is displayed using one persistent snackbar that updates its text each second.
- The debug panel is available when the `enableTestMode` feature flag is enabled, appears above the player and opponent cards, and includes a copy button for exporting its text.
- A battle state progress list can be enabled via the `battleStateProgress` feature flag to show the sequence of match states beneath the battle area; disabled by default.

### Round Data Fallback

- If `battleRounds.json` fails to load, the game falls back to default round settings and surfaces an error message in `#round-message`.
- **QA:** Temporarily block `battleRounds.json` to confirm default rounds appear and the error message is displayed.

---

## Prioritized Functional Requirements Table

| Priority | Feature                 | Description                                                                                                                                                                                                                                    |
| -------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1**   | Random Card Draw        | Draw one random card per player each round; the opponent card must differ from the player's.                                                                                                                                                   |
| **P1**   | Stat Selection Timer    | Player selects stat within 30 seconds; otherwise, random stat is chosen. Auto-select is controlled by Random Stat Mode (`FF_AUTO_SELECT`), enabled by default. Timer is displayed in `#next-round-timer` and pauses/resumes on tab inactivity. |
| **P1**   | Scoring                 | Increase score by one for each round win.                                                                                                                                                                                                      |
| **P1**   | Match End Condition     | End match when either player reaches a user-selected win target of 5, 10, or 15 points (default 10) or after 25 rounds.                                                                                                                        |
| **P2**   | Tie Handling            | Show tie message; round ends without score change; continue to next round.                                                                                                                                                                     |
| **P2**   | Player Quit Flow        | Allow player to exit match early with confirmation; counts as a loss.                                                                                                                                                                          |
| **P3**   | AI Stat Selection Logic | AI stat choice follows difficulty setting (`easy` random, `medium` picks stats ≥ average, `hard` selects highest stat). Difficulty can be set via Settings or `?difficulty=` URL param; defaults to `easy`.                                    |
| **P3**   | Next Button             | Single control that starts the next round and, when pressed during stat selection or cooldown, skips the remaining timer so gameplay can move forward immediately.                                                                             |

**Additional Behavioral Requirements:**

- Behavior on tie rounds: round ends with a message explaining the tie and an option to start the next round via the **Next** button.
- Match start conditions: both players begin with a score of zero; player goes first by drawing their card.
  - Players have 30 seconds to select a stat; if no selection is made, the system randomly selects a stat from the drawn card. **The timer is displayed in `#next-round-timer` and the prompt appears in a snackbar.**
- The opponent's card must always differ from the player's card for each round.
- **Default:** 30-second timer is fixed (not adjustable by the player at launch), but can be reviewed for future difficulty settings.

---

## Acceptance Criteria

- Cards are revealed in the correct sequence each round.
- The opponent card displays a placeholder ("Mystery Judoka") until the player selects a stat ([prdMysteryCard.md](prdMysteryCard.md)).
- Player can select a stat within 30 seconds; if not, the system auto-selects a random stat automatically. **Timer is surfaced in `#next-round-timer`, and the "Select your move" prompt appears in a snackbar.**
- Stat-selection timer stops the moment a stat is chosen.
- "Time's up! Auto-selecting <stat>" appears only if no stat was chosen before the timer expires.
- After selection, the correct comparison is made, and the score updates based on round outcome.
- After the player selects a stat, the Scoreboard shows "Opponent is choosing..." in `#round-message` until the opponent's stat is revealed.
- If the selected stats are equal, a tie message displays and the round ends.
- After round results, `computeNextRoundCooldown` and `createNextRoundSnackbarRenderer` run a 3s countdown via snackbar (`Next round in: Xs`). `computeNextRoundCooldown` enforces a minimum 1 s countdown even in test mode. The **Next** button activates only after `handleNextRoundExpiration` completes the countdown. Reference [timerService.js](../../src/helpers/classicBattle/timerService.js) for exact durations to keep design and code aligned.
- After the match ends, a modal appears showing the final result and score with **Quit Match** and **Next Match** buttons; **Quit Match** exits to the main menu and **Next Match** starts a new match.
- Player can quit mid-match; confirmation prompt appears; if confirmed, match ends with player loss recorded.
- After confirming the quit action, the player is returned to the main menu (index.html).
- If AI difficulty affects stat selection, AI uses correct logic per difficulty setting.
- Animation flow: transitions between card reveal, stat selection, and result screens complete smoothly without stalling.
- Stat buttons reset between rounds so no previous selection remains highlighted. The `battle.css` rule `#stat-buttons button { -webkit-tap-highlight-color: transparent; }` combined with a reflow ensures Safari clears the red touch overlay.
- If the Judoka dataset fails to load, an error message appears with option to reload.
- **All Scoreboard content (`#round-message`, `#next-round-timer`, `#score-display`, `#round-counter`) must meet accessibility and responsiveness requirements as described in prdBattleScoreboard.md.**
- Roll back the match to the last completed round when the player navigates away mid-match.
- Roll back the match to the last completed round and display an error message when an unexpected error occurs.

---

## Edge Cases / Failure States

- **Judoka or Gokyo dataset fails to load:** error message surfaces in `#round-message` and an error dialog offers a "Retry" button to reload data or the page.
- **Player does not make a stat selection within 30 seconds:** system randomly selects a stat automatically. **Scoreboard updates `#next-round-timer`, and the snackbar prompt informs the player.**
- **AI fails to select a stat (if difficulty logic implemented):** fallback to random stat selection.
- **Round selection tooltips fail to initialize:** modal opens without tooltips and the match proceeds; error is logged.
- **Player navigates away mid-match:** roll back to the last completed round when the player returns.
- **Unexpected error occurs:** roll back to the last completed round and surface an error message.

---

## Design and UX Considerations

- Use consistent color coding for player (blue) vs opponent (red) as shown in attached mockups.
- Surface a snackbar with clear, large call-to-action text reading "Choose an attribute to challenge!" to guide new players.
- When a player selects a stat, surface a snackbar via [showSnackbar.js](../../src/helpers/showSnackbar.js) reading `You Picked: <stat>` (e.g., `You Picked: Power`) so tests can confirm the feedback.
- Snackbars slide in/out using standard fade/translate animations and auto-select feedback remains visible for at least 1s before "Opponent is choosing..." appears.
- Provide a quit confirmation when the player clicks the logo in the header to return to the Home screen.
  - Match screens should follow the style and layouts demonstrated in shared mockups:
  - Player and opponent cards side-by-side.
  - Stat selection buttons sit in a center column between the two cards on screens wider than 480px; on narrow screens they appear below the cards.
  - Central score prominently displayed.
  - Tie or win/loss messages placed centrally.
  - Clear **Next** button with distinct state (enabled/disabled). When pressed while a selection or cooldown timer is active, **Next** skips the remaining time and starts the following round. When disabled, the button should remain visible using the `--button-disabled-bg` token.
  - Ensure player and opponent cards show all stats without scrolling on common desktop resolutions (e.g., 1440px width).
  - Provide a dedicated "Quit Match" button below the controls.
    Clicking it opens a confirmation modal styled like the
    **Restore Defaults** dialog from the Settings page.
  - A small help icon (`#stat-help`) sits between the **Next** and
    **Quit Match** buttons. It displays a tooltip explaining how to pick an
    attribute and auto-opens on first visit using the storage helper to remember the
    dismissal.
  - Tooltips on stat names, country flags, weight indicators, and navigation icons provide accessible explanations.
  - The Scoreboard includes a round counter (`#round-counter`) and a field showing the player's selected stat for the current round.
  - Optional keyboard shortcuts: When `statHotkeys` feature flag is enabled, allow number keys 1–5 to select the corresponding stat button (left→right order) for power users and tests. Disabled by default. The toggle resides under **Advanced Settings** on the Settings page.
  - **Accessibility:**
  - Minimum text contrast ratio: ≥4.5:1 (per WCAG).
  - Minimum touch target size: ≥44px. See [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness) for the full rule.
  - Support keyboard navigation for stat selection, the **Next** button (for round progression and timer skipping), and quit confirmation.
  - Provide alt text for cards and labels readable by screen readers.
  - **All Scoreboard content (`#round-message`, `#next-round-timer`, `#score-display`, `#round-counter`) must be accessible and responsive as described in prdBattleScoreboard.md.**

---

## Dependencies

- Judoka dataset loaded from `judoka.json`.
- Only judoka with `isHidden` set to `false` are eligible for battle.
- Uses the shared random card draw module (`generateRandomCard`) as detailed in [prdDrawRandomCard.md](prdDrawRandomCard.md) (see `src/helpers/randomCard.js`).
- Uses the Mystery Card placeholder outlined in [prdMysteryCard.md](prdMysteryCard.md), which relies on the `useObscuredStats` flag added to `renderJudokaCard()`.
  - **Relies on Scoreboard (see prdBattleScoreboard.md) for all round messages (`#round-message`), timer (`#next-round-timer`), round counter (`#round-counter`), and score display (`#score-display`).**

---

## Contracts

This section lists small, implementer-facing contracts to reduce ambiguity between design and code.

- DOM contract (required elements & attributes)
  - `#round-message` — role="status", `aria-live="polite"`. Shows per-round messages (snackbars may duplicate for animation, but this must be the authoritative accessible region).
  - `#next-round-timer` — `aria-hidden="true"` when inactive; updated by scoreboard/timer facade while active.
  - `#round-counter` — visible counter showing current round number (readable by screen readers).
  - `#score-display` — shows player/opponent score values; each score element has an accessible label (e.g., `aria-label="Player score: 3"`).
  - `#player-card`, `#opponent-card` — contain proper `alt` text on images and `aria-describedby` for stat labels.
  - `#stat-buttons` — container for stat buttons; each button: `role="button"`, `tabindex="0"`, `data-stat-id="<statName>"` and a clear visible focus state.
  - `#next-button`, `#quit-match-button`, `#stat-help` — actionable controls with `aria-disabled` used while inactive.

- API contract (scoreboard / timer / page init)
  - `setupScoreboard` expected surface:
    - `startCountdown(durationMs, { onTick(msLeft), onComplete(), id? }) -> { cancel() }`
    - `pause()` / `resume()` for global timer control
    - `updateRoundCounter(n)` / `updateScore({ player, opponent })` / `showMessage(keyOrText)`
  - Timer facade: pause on visibility change and expose `isPaused()` for assertions in tests.
  - `classicBattle.init({ rootEl, scoreboardFacade, pointsToWin, featureFlags }) -> testAPI` where `testAPI` exposes deterministic hooks (seed injection, fast-forward, await promises listed in Observability).

- Storage keys and semantics
  - `battle.pointsToWin` — persisted preferred win target (integer). Fallback to session storage when `localStorage` is unavailable.
  - `battle.helpDismissed` — boolean: whether `#stat-help` auto-open has been dismissed for this device/user.
  - `battle.testRandomSeed` — optional test-only key to inject a deterministic RNG seed (only used when running with test flags enabled).

  ## Feature flags & defaults

  List of feature flags and their intended defaults for Classic Battle. Implementations should read these from the global feature-flag service or `src/config/battleDefaults.js` when available.
  - `autoSelect` — boolean, default: `true`. When enabled, the system auto-selects a random stat on timer expiry.
    When disabled, the timer expires without choosing a stat and the player must pick manually.
  - `battleStateProgress` — boolean, default: `false`. When enabled, display a state progress list beneath the battle area.
  - `enableTestMode` — boolean, default: `false` (test-only). When enabled, allow `battle.testRandomSeed`, fast AI delays for deterministic tests, and show a debug panel above the cards with copy/export controls.
  - `statHotkeys` — boolean, default: `false`. When enabled, number keys 1–5 map to stat buttons (left→right).
  - `skipRoundCooldown` — boolean, default: `false`. When enabled, bypass inter-round cooldown and begin the next round immediately.

  Implementations should read these flags via the global feature-flag service or from `src/config/battleDefaults.js`. The PRD and tests should reference the camelCase keys above (not `FF_*` prefixes) to avoid mismatches between code and documentation.

  ### Constants & Timers

  Define canonical constants so design and tests align with implementation:
  - `ROUND_SELECTION_MS = 30_000` (30s)
  - `DRIFT_THRESHOLD_MS = 2_000` (2s)
  - `MAX_ROUNDS = 25`
  - `POINTS_TO_WIN_OPTIONS = [5, 10, 15]` with `DEFAULT_POINTS_TO_WIN = 10`
  - `DATA_FETCH_TIMEOUT_MS = 10_000` (10s)
  - `SPINNER_DELAY_MS = 200` (ms before showing spinner)

  These constants should be implemented in `src/config/*` or referenced from `timerService.js` so tests can import and assert deterministic behavior.

  ### i18n keys

  All user-facing strings must be keyed and obtained via a `t(key, params)` adapter. Minimum required keys for Classic Battle:
  - `round.chooseStat`
  - `snackbar.youPicked` (params: { stat })
  - `snackbar.autoSelected` (params: { stat })
  - `ui.next`
  - `ui.quitMatch`
  - `ui.selectStat`
  - `stat.power`, `stat.speed`, `stat.technique`, `stat.kumikata`, `stat.newaza`
  - `stat.desc.power`, `stat.desc.speed`, ... (short accessible descriptions for screen readers)
  - `match.summary.title`, `match.summary.quit`, `match.summary.next`

  Use these keys in the UI helpers and snackbars rather than inline text.

  ### Test hooks & observability

  Exported promises and hooks (implementations under `src/helpers/classicBattle/*`) that tests will use:
  - `roundPromptPromise`
  - `countdownStartedPromise`
  - `roundResolvedPromise`
  - `roundTimeoutPromise`
  - `statSelectionStalledPromise`
  - `__ensureClassicBattleBindings()` and `__resetClassicBattleBindings()` for idempotent setup/teardown

  Include a short example for Playwright tests:

  ```js
  import { roundPromptPromise } from "src/helpers/classicBattle.js";
  await roundPromptPromise; // waits until UI prompts for stat selection
  ```

  Storage keys referenced above should be treated as optional overrides in test and debug environments only.

  ## Acceptance Criteria & Test Mapping

  This section provides concise acceptance criteria mapped to testable scenarios (Playwright / Vitest). Use these as the canonical checklist for QA and automation.
  - Happy path: Start match → player picks stat within 30s → opponent reveal → score updates → cooldown → Next → repeat until win target reached. (Test: `playwright/classic-battle/happy-path.spec.js`)
  - Auto-select on timeout: With `FF_AUTO_SELECT=true`, allow timer expiry to auto-pick a stat, show `Time's up! Auto-selecting <stat>`, proceed to resolve. (Test: `playwright/classic-battle/auto-select.spec.js`)
  - Race: Simultaneous user click and auto-select fire; ensure only one selection is processed, UI shows a single `You Picked` or `Auto-selecting` message, and score resolves once. (Test: `vitest/classic-battle/race.spec.js`)
  - Timer drift: Simulate a clock jump >2s; scoreboard shows "Waiting..." and restarts countdown correctly. (Test: `vitest/classic-battle/timer-drift.spec.js`)
  - Quit flow: Click `#quit-match-button` → confirm → match ends and recorded as player loss; final modal appears. (Test: `playwright/classic-battle/quit.spec.js`)
  - 25-round draw: Play 25 rounds with tied or alternating wins where neither player reaches the selected win target; match ends in draw UI. (Test: `playwright/classic-battle/25-round-draw.spec.js`)

  Each test should use the `testAPI` (when available) to inject deterministic RNG and fast-forward timers where appropriate. Tests must assert ARIA attributes and accessible regions for messages and timer updates.

## Tasks

- [x] 1.0 Implement Classic Battle Match Flow
- [x] 1.1 Create round loop: random card draw, stat selection, comparison
  - [x] 1.2 Implement 30-second stat selection timer with auto-selection fallback (displayed in `#next-round-timer`)
  - [x] 1.3 Handle scoring updates on win, loss, and tie
  - [x] 1.4 Add "Next" (round advance/timer skip) and "Quit Match" buttons to controls
  - [x] 1.5 End match after the user-selected win target (5, 10, or 15 points; default 10) or 25 rounds
- [x] 2.0 Add Early Quit Functionality
  - [x] 2.1 Trigger quit confirmation when the header logo is clicked
  - [x] 2.2 Create confirmation prompt flow
  - [x] 2.3 Record match as player loss upon quit confirmation
- [ ] 3.0 Handle Edge Cases
  - [x] 3.1 Handle Judoka dataset load failure with error prompt and reload option (see [cardRender.js](../../src/helpers/cardRender.js))
  - [x] 3.2 Add fallback stat selection for AI if difficulty logic fails
- [x] 4.0 Polish UX and Accessibility
  - [x] 4.1 Integrate consistent color coding (blue for player, red for AI)
  - [x] 4.2 Apply WCAG-compliant contrast ratios
  - [x] 4.3 Ensure touch targets ≥44px and support keyboard navigation (see [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness) and prdBattleScoreboard.md; implemented in [buttons.css](../../src/styles/buttons.css))
  - [x] 4.4 Add alt text to cards and UI elements (see [cardSelection.js](../../src/helpers/classicBattle/cardSelection.js))
- [x] 5.0 Optimize Animations
  - [x] 5.1 Implement card reveal, stat selection, and result transitions using transform/opacity for GPU acceleration

---

**See also:**

- [Battle Scoreboard PRD](prdBattleScoreboard.md) for Scoreboard UI, timer, and accessibility requirements.
