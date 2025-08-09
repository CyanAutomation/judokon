# PRD: Classic Battle

---

**Game Mode ID:** `1` (URL: battleJudoka.html)

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
- Ensure all round messages, stat selection timer, and score are surfaced via the Info Bar (see prdBattleInfoBar.md) for clarity and accessibility. The countdown to the next round is shown in a snackbar.

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

- On first visit to `battleJudoka.html`, a modal prompts the player to select a win target of **5, 10, or 15 points** (default 10).
- The standard deck contains **99 unique cards**.
- Each match begins with both sides receiving **25 random cards**.
- At the start of each round, both players draw their top card.
- The player selects one stat (Power, Speed, Technique, etc.).
- The higher value wins the round and scores **1 point**; used cards are discarded.
- The match ends when a player reaches a **user-selected win target of 5, 10, or 15 points** (default 10) or after **25 rounds** (draw).

---

## Technical Considerations

- Classic Battle logic must reuse shared random card draw module (`generateRandomCard`).
- Card reveal and result animations should use hardware-accelerated CSS for smooth performance on low-end devices.
- Stat selection timer (30s) must be displayed in the Info Bar; if timer expires, a random stat is auto-selected. Timer must pause if the game tab is inactive or device goes to sleep, and resume on focus (see prdBattleInfoBar.md).
- Stat selection timer halts immediately once the player picks a stat.
- Detect timer drift by comparing engine state with real time; if drift exceeds 2s, display "Waiting…" and restart the countdown.
- Opponent stat selection runs entirely on the client. After the player picks a stat (or the timer auto-chooses), the opponent's choice is revealed after a short artificial delay to mimic turn-taking.
- During this delay, the Info Bar displays "Opponent is choosing..." to reinforce turn flow.
- The cooldown timer between rounds begins only after round results are shown in the Info Bar and is displayed using a snackbar countdown.
- The debug panel is available when the `battleDebugPanel` feature flag is enabled and appears beside the opponent's card.

---

## Prioritized Functional Requirements Table

| Priority | Feature                 | Description                                                                                                                                                                      |
| -------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1**   | Random Card Draw        | Draw one random card per player each round; the opponent card must differ from the player's.                                                                                     |
| **P1**   | Stat Selection Timer    | Player selects stat within 30 seconds; otherwise, random stat is chosen. Default timer is fixed at 30s. Timer is displayed in the Info Bar and pauses/resumes on tab inactivity. |
| **P1**   | Scoring                 | Increase score by one for each round win.                                                                                                                                        |
| **P1**   | Match End Condition     | End match when either player reaches a user-selected win target of 5, 10, or 15 points (default 10) or after 25 rounds.                                                                                                                                       |
| **P2**   | Tie Handling            | Show tie message; round ends without score change; continue to next round.                                                                                                       |
| **P2**   | Player Quit Flow        | Allow player to exit match early with confirmation; counts as a loss.                                                                                                            |
| **P3**   | AI Stat Selection Logic | AI stat choice follows difficulty setting (`easy` random, `medium` picks stats ≥ average, `hard` selects highest stat). Difficulty can be set via Settings or `?difficulty=` URL param; defaults to `easy`. |
| **P3**   | Skip Control            | Optional control that bypasses round and cooldown timers so testers can fast-forward gameplay or users can quickly move through a match. |

**Additional Behavioral Requirements:**

- Behavior on tie rounds: round ends with a message explaining the tie and an option to start the next round.
- Match start conditions: both players begin with a score of zero; player goes first by drawing their card.
- Players have 30 seconds to select a stat; if no selection is made, the system randomly selects a stat from the drawn card. **The timer and prompt are displayed in the Info Bar.**
- The opponent's card must always differ from the player's card for each round.
- **Default:** 30-second timer is fixed (not adjustable by the player at launch), but can be reviewed for future difficulty settings.

---

## Acceptance Criteria

- Cards are revealed in the correct sequence each round.
- The opponent card displays a placeholder ("Mystery Judoka") until the player selects a stat ([prdMysteryCard.md](prdMysteryCard.md)).
- Player can select a stat within 30 seconds; if not, the system auto-selects a random stat automatically. **Timer and prompt are surfaced in the Info Bar.**
- Stat-selection timer stops the moment a stat is chosen.
- "Time's up! Auto-selecting <stat>" appears only if no stat was chosen before the timer expires.
- After selection, the correct comparison is made, and the score updates based on round outcome.
- After the player selects a stat, the Info Bar shows "Opponent is choosing..." until the opponent's stat is revealed.
- If the selected stats are equal, a tie message displays and the round ends.
- Cooldown timer to enable the next round starts only after round results are shown.
- After the match ends, a modal appears showing the final result and score with **Quit Match** and **Next Match** buttons; **Quit Match** exits to the main menu and **Next Match** starts a new match.
- Player can quit mid-match; confirmation prompt appears; if confirmed, match ends with player loss recorded.
- After confirming the quit action, the player is returned to the main menu (index.html).
- If AI difficulty affects stat selection, AI uses correct logic per difficulty setting.
- Animation flow: transitions between card reveal, stat selection, and result screens complete smoothly without stalling.
- Stat buttons reset between rounds so no previous selection remains highlighted. The `battle.css` rule `#stat-buttons button { -webkit-tap-highlight-color: transparent; }` combined with a reflow ensures Safari clears the red touch overlay.
- If the Judoka dataset fails to load, an error message appears with option to reload.
- **All Info Bar content (messages, timer, score) must meet accessibility and responsiveness requirements as described in prdBattleInfoBar.md.**

---

## Edge Cases / Failure States

- **Judoka or Gokyo dataset fails to load:** error message surfaces in the Info Bar and an error dialog offers a "Retry" button to reload data or the page.
- **Player does not make a stat selection within 30 seconds:** system randomly selects a stat automatically. **Info Bar must update accordingly.**
- **AI fails to select a stat (if difficulty logic implemented):** fallback to random stat selection.

---

## Design and UX Considerations

- Use consistent color coding for player (blue) vs opponent (red) as shown in attached mockups.
- Display clear, large call-to-action text for "Choose an attribute to challenge!" to guide new players.
- When a player selects a stat, surface a snackbar via [showSnackbar.js](../../src/helpers/showSnackbar.js) reading `You Picked: <stat>` (e.g., `You Picked: Power`) so tests can confirm the feedback.
- Provide a quit confirmation when the player clicks the logo in the header to return to the Home screen.
  - Match screens should follow the style and layouts demonstrated in shared mockups:
  - Player and opponent cards side-by-side.
  - Stat selection buttons sit in a center column between the two cards on screens wider than 480px; on narrow screens they appear below the cards.
  - Central score prominently displayed.
  - Tie or win/loss messages placed centrally.
  - Clear "Next Round" button with distinct state (enabled/disabled). When disabled, the button should remain visible using the `--button-disabled-bg` token.
  - Ensure player and opponent cards show all stats without scrolling on common desktop resolutions (e.g., 1440px width).
  - Provide a dedicated "Quit Match" button below the controls.
    Clicking it opens a confirmation modal styled like the
    **Restore Defaults** dialog from the Settings page.
  - A small help icon (`#stat-help`) sits between the **Next Round** and
    **Quit Match** buttons. It displays a tooltip explaining how to pick an
    attribute and auto-opens on first visit using the storage helper to remember
    the dismissal.
  - Tooltips on stat names, country flags, weight indicators, and navigation icons provide accessible explanations.
  - **Accessibility:**
  - Minimum text contrast ratio: ≥4.5:1 (per WCAG).
  - Minimum touch target size: ≥44px. See [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness) for the full rule.
  - Support keyboard navigation for stat selection, match progression, and quit confirmation.
  - Provide alt text for cards and labels readable by screen readers.
  - **All Info Bar content must be accessible and responsive as described in prdBattleInfoBar.md.**

---

## Dependencies

- Judoka dataset loaded from `judoka.json`.
- Only judoka with `isHidden` set to `false` are eligible for battle.
- Uses the shared random card draw module (`generateRandomCard`) as detailed in [prdDrawRandomCard.md](prdDrawRandomCard.md) (see `src/helpers/randomCard.js`).
- Uses the Mystery Card placeholder outlined in [prdMysteryCard.md](prdMysteryCard.md), which relies on the `useObscuredStats` flag added to `renderJudokaCard()`.
- **Relies on Info Bar (see prdBattleInfoBar.md) for all round messages, timer, and score display.**

---

## Tasks

- [x] 1.0 Implement Classic Battle Match Flow
- [x] 1.1 Create round loop: random card draw, stat selection, comparison
  - [x] 1.2 Implement 30-second stat selection timer with auto-selection fallback (displayed in Info Bar)
  - [x] 1.3 Handle scoring updates on win, loss, and tie
  - [x] 1.4 Add "Next Round" and "Quit Match" buttons to controls
  - [x] 1.5 End match after the user-selected win target (5, 10, or 15 points; default 10) or 25 rounds
- [ ] 2.0 Add Early Quit Functionality
  - [x] 2.1 Trigger quit confirmation when the header logo is clicked
  - [x] 2.2 Create confirmation prompt flow
  - [x] 2.3 Record match as player loss upon quit confirmation
- [ ] 3.0 Handle Edge Cases
  - [x] 3.1 Handle Judoka dataset load failure with error prompt and reload option (see [cardRender.js](../../src/helpers/cardRender.js))
  - [x] 3.2 Add fallback stat selection for AI if difficulty logic fails
- [x] 4.0 Polish UX and Accessibility
  - [x] 4.1 Integrate consistent color coding (blue for player, red for AI)
  - [x] 4.2 Apply WCAG-compliant contrast ratios
  - [x] 4.3 Ensure touch targets ≥44px and support keyboard navigation (see [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness) and prdBattleInfoBar.md; implemented in [buttons.css](../../src/styles/buttons.css))
  - [x] 4.4 Add alt text to cards and UI elements (see [cardSelection.js](../../src/helpers/classicBattle/cardSelection.js))
- [x] 5.0 Optimize Animations
  - [x] 5.1 Implement card reveal, stat selection, and result transitions using transform/opacity for GPU acceleration

---

**See also:**

- [Battle Info Bar PRD](prdBattleInfoBar.md) for Info Bar UI, timer, and accessibility requirements.
