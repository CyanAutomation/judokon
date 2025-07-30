# PRD: Classic Battle

---

**Game Mode ID:** `1` (URL: battleJudoka.html)

[Back to Game Modes Overview](prdGameModes.md)

---

## TL;DR

Classic Battle is Ju-Do-Kon!’s introductory, head-to-head mode. By offering a fast-paced, low-stakes way for new players to learn stats and game flow (match start ≤5 s after selection), it boosts retention and confidence while maintaining quick matches. This PRD defines how the mode operates, from random draws to scoring and end conditions, ensuring a smooth (**≥60 fps**), accessible, and engaging experience.

> Sora starts a Classic Battle and draws her first card. She confidently taps “Speed,” seeing her stat triumph over the AI’s card. The score ticks up with a satisfying sound. Round after round, she learns which stats matter most. By the end, she feels ready to tackle harder battles — and wants to play again.

---

## Problem Statement

Classic Battle is the main and simplest mode of the game. Without it, new players lack a quick, low-stakes mode to learn stats and grasp the core mechanics. This leads to higher early player drop-off, increased frustration, and fewer repeat sessions because players don’t build mastery or confidence. By providing a fast, engaging way to compare stats (**UI responses <200 ms**), Classic Battle helps new players onboard smoothly and encourages early retention.

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
- **Ensure all round messages, timers, and score are surfaced via the Info Bar (see prdBattleInfoBar.md) for clarity and accessibility.**

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

- The standard deck contains **99 unique cards**.
- Each match begins with both sides receiving **25 random cards**.
- At the start of each round, both players draw their top card.
- The player selects one stat (Power, Speed, Technique, etc.).
- The higher value wins the round and scores **1 point**; used cards are discarded.
- The match ends when a player reaches **10 points** or after **25 rounds** (draw).

---

## Technical Considerations

- Classic Battle logic must reuse shared random card draw module (`generateRandomCard`).
- Card reveal and result animations should use hardware-accelerated CSS for smooth performance on low-end devices (**≥60 fps**).
- **Stat selection timer (30s) must be displayed in the Info Bar; if timer expires, a random stat is auto-selected. Timer must pause if the game tab is inactive or device goes to sleep, and resume on focus (see prdBattleInfoBar.md).**
- Backend must send real-time stat updates via WebSocket or polling for smooth live updates (**<200 ms latency**).
- The debug panel is available when the `battleDebugPanel` feature flag is enabled.

---

## Prioritized Functional Requirements Table

| Priority | Feature                 | Description                                                                                                                                                                      |
| -------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **P1**   | Random Card Draw        | Draw one random card per player each round; the opponent card must differ from the player's.                                                                                     |
| **P1**   | Stat Selection Timer    | Player selects stat within 30 seconds; otherwise, random stat is chosen. Default timer is fixed at 30s. Timer is displayed in the Info Bar and pauses/resumes on tab inactivity. |
| **P1**   | Scoring                 | Increase score by one for each round win.                                                                                                                                        |
| **P1**   | Match End Condition     | End match on 10 points or after 25 rounds.                                                                                                                                       |
| **P2**   | Tie Handling            | Show tie message; round ends without score change; continue to next round.                                                                                                       |
| **P2**   | Player Quit Flow        | Allow player to exit match early with confirmation; counts as a loss.                                                                                                            |
| **P3**   | AI Stat Selection Logic | Optional: vary AI stat selection by difficulty level; fallback to random if not specified.                                                                                       |

**Additional Behavioral Requirements:**

- Behavior on tie rounds: round ends with a message explaining the tie and an option to start the next round.
- Match start conditions: both players begin with a score of zero; player goes first by drawing their card.
- Players have 30 seconds to select a stat; if no selection is made, the system randomly selects a stat from the drawn card. **The timer and prompt are displayed in the Info Bar.**
- The opponent's card must always differ from the player's card for each round.
- **Default:** 30-second timer is fixed (not adjustable by the player at launch), but can be reviewed for future difficulty settings.

---

## Future Considerations

- Add easy/medium/hard modes changing AI stat selection strategy:
  - **Easy**: AI selects randomly.
  - **Medium**: AI favors stats where it’s average or better.
  - **Hard**: AI prefers its highest stat each round.

---

## Acceptance Criteria

- Cards are revealed in the correct sequence each round.
- The opponent card displays a placeholder ("Mystery Judoka") until the player selects a stat ([prdMysteryCard.md](prdMysteryCard.md)).
- Player can select a stat within 30 seconds; if not, the system auto-selects a random stat automatically. **Timer and prompt are surfaced in the Info Bar.**
- After selection, the correct comparison is made, and the score updates based on round outcome.
- If the selected stats are equal, a tie message displays and the round ends.
- Summary screen shows match result (win/loss/tie), player stats, and option to replay.
- Player can quit mid-match; confirmation prompt appears; if confirmed, match ends with player loss recorded.
- After confirming the quit action, the player is returned to the main menu (index.html).
- If AI difficulty affects stat selection, AI uses correct logic per difficulty setting.
- Animation flow: transitions between card reveal, stat selection, and result screens complete smoothly without stalling (**each ≤400 ms at ≥60 fps**).
- Stat buttons reset between rounds so no previous selection remains highlighted. The CSS rule `#stat-buttons button { -webkit-tap-highlight-color: transparent; }` combined with a reflow ensures Safari clears the red touch overlay.
- If the Judoka dataset fails to load, an error message appears with option to reload.
- **All Info Bar content (messages, timer, score) must meet accessibility and responsiveness requirements as described in prdBattleInfoBar.md.**

---

## Edge Cases / Failure States

- **Player disconnects mid-match:** round is abandoned; player rejoins at main menu.
- **Judoka dataset fails to load:** error message appears; player can retry loading.
- **Player does not make a stat selection within 30 seconds:** system randomly selects a stat automatically. **Info Bar must update accordingly.**
- **AI fails to select a stat (if difficulty logic implemented):** fallback to random stat selection.

---

## Design and UX Considerations

- Use consistent color coding for player (blue) vs opponent (red) as shown in attached mockups.
- Display clear, large call-to-action text for "Choose an attribute to challenge!" to guide new players.
- Provide a quit confirmation when the player clicks the logo in the header to return to the Home screen.
- Match screens should follow the style and layouts demonstrated in shared mockups:
  - Player and opponent cards side-by-side.
  - Central score prominently displayed.
  - Tie or win/loss messages placed centrally.
  - Clear "Next Round" button with distinct state (enabled/disabled). When disabled, the button should remain visible using the `--button-disabled-bg` token.
  - Ensure player and opponent cards show all stats without scrolling on common desktop resolutions (e.g., 1440px width).
  - Provide a dedicated "Quit Match" button below the controls.
    Clicking it opens a confirmation modal styled like the
    **Restore Defaults** dialog from the Settings page.
  - A small help icon (`#stat-help`) next to the stat buttons displays a tooltip
    explaining how to pick an attribute. The tooltip auto-opens once on first
    visit using `localStorage` to remember the dismissal.
  - Tooltips on stat names, country flags, weight indicators, and navigation icons provide accessible explanations.
  - **Accessibility:**
  - Minimum text contrast ratio: ≥4.5:1 (per WCAG).
  - Minimum touch target size: ≥44px. See [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness) for the full rule.
  - Support keyboard navigation for stat selection, match progression, and quit confirmation.
  - Provide alt text for cards and labels readable by screen readers.
  - **All Info Bar content must be accessible and responsive as described in prdBattleInfoBar.md.**
- Animations must run at ≥60fps on mid-tier devices (2GB RAM) to ensure smooth experience.

---


## Dependencies

- Judoka dataset loaded from `judoka.json`.
- Only judoka with `isHidden` set to `false` are eligible for battle.
- Uses the shared random card draw module (`generateRandomCard`) as detailed in [prdDrawRandomCard.md](prdDrawRandomCard.md) (see `src/helpers/randomCard.js`).
- Uses the Mystery Card placeholder outlined in [prdMysteryCard.md](prdMysteryCard.md), which relies on the `useObscuredStats` flag added to `renderJudokaCard()`.
- **Relies on Info Bar (see prdBattleInfoBar.md) for all round messages, timer, and score display.**

---

## Open Questions

_Resolved in [Future Considerations](#future-considerations):_ AI difficulty will control stat selection strategy.

---

## Tasks

- [x] 1.0 Implement Classic Battle Match Flow
- [x] 1.1 Create round loop: random card draw, stat selection, comparison
  - [x] 1.2 Implement 30-second stat selection timer with auto-selection fallback (displayed in Info Bar)
  - [x] 1.3 Handle scoring updates on win, loss, and tie
  - [x] 1.4 Add "Next Round" and "Quit Match" buttons to controls
  - [x] 1.5 End match after 10 points or 25 rounds
- [ ] 2.0 Add Early Quit Functionality
  - [ ] 2.1 Trigger quit confirmation when the header logo is clicked
  - [x] 2.2 Create confirmation prompt flow
  - [x] 2.3 Record match as player loss upon quit confirmation
- [ ] 3.0 Handle Edge Cases
  - [ ] 3.1 Implement player disconnect logic: abandon match and redirect to main menu
  - [ ] 3.2 Handle Judoka dataset load failure with error prompt and reload option
  - [x] 3.3 Add fallback stat selection for AI if difficulty logic fails
- [ ] 4.0 Polish UX and Accessibility
  - [ ] 4.1 Integrate consistent color coding (blue for player, red for AI)
  - [ ] 4.2 Apply WCAG-compliant contrast ratios
  - [ ] 4.3 Ensure touch targets ≥44px and support keyboard navigation (see [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness) and prdBattleInfoBar.md)
  - [ ] 4.4 Add alt text to cards and UI elements
- [ ] 5.0 Optimize Animations
  - [ ] 5.1 Implement card reveal, stat selection, and result transitions
  - [ ] 5.2 Ensure animations maintain ≥60fps on 2GB RAM devices

---

**See also:**

- [Battle Info Bar PRD](prdBattleInfoBar.md) for Info Bar UI, timer, and accessibility requirements.
