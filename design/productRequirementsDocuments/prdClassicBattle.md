# Classic Battle

**Game Mode ID:** `classicBattle` (URL: battleJudoka.html)  
[Back to Game Modes Overview](prdGameModes.md)

---

## Problem Statement

Classic Battle is the main and simplest mode of the game. Without it, new players lack a quick, low-stakes mode to learn stats and grasp the core mechanics. This leads to higher early player drop-off, increased frustration, and fewer repeat sessions because players don’t build mastery or confidence. By providing a fast, engaging way to compare stats, Classic Battle helps new players onboard smoothly and encourages early retention.

---

## Goals

- Deliver a quick head-to-head mode for new players, with average match length ≤3 minutes.
- Encourage replay through a simple, rewarding scoring system.
- Increase daily plays by new users by 15%.
- ≥70% of new players complete a Classic Battle within their first session.

---

## User Stories

*(To be fleshed out later, but examples could include):*

- As a new player, I want a simple match format so I can learn game mechanics quickly.
- As a player, I want clear feedback on round outcomes so I know how I’m doing.

---

## Functional Requirements

- Draw one random card from each deck per round.
- Player selects a stat to compare.
- Higher stat wins; score increases by one.
- End match on 10 points or after 25 rounds.

**Additional Behavioral Requirements:**
- Behavior on tie rounds: round ends with a message explaining the tie and an option to start the next round.
- Match start conditions: both players begin with a score of zero; player goes first by drawing their card.
- Players have 30 seconds to select a stat; if no selection is made, the system randomly selects a stat from the drawn card.

---

### Prioritized Functional Requirements Table

| Priority | Feature                  | Description                                                    |
|----------|--------------------------|----------------------------------------------------------------|
| P1       | Random Card Draw         | Draw one random card per player each round.                    |
| P1       | Stat Selection           | Player selects stat within 30 seconds; otherwise, random stat is chosen. |
| P1       | Scoring                  | Increase score by one for each round win.                      |
| P1       | Match End Condition      | End match on 10 points or after 25 rounds.                     |
| P2       | Tie Handling             | Show tie message; round ends without score change; continue to next round. |
| P3       | AI Stat Selection Logic  | Optional: vary AI stat selection by difficulty level.          |

---

## Acceptance Criteria

- Cards are revealed in the correct sequence each round.
- Player can select a stat within 30 seconds; if not, the system auto-selects a random stat.
- After selection, the correct comparison is made, and the score updates based on round outcome.
- If the selected stats are equal, a tie message displays and the round ends.
- Summary screen shows match result (win/loss/tie), player stats, and option to replay.
- If AI difficulty affects stat selection, AI uses correct logic per difficulty setting.
- Animation flow: transitions between card reveal, stat selection, and result screens complete smoothly without stalling.
- If the Judoka dataset fails to load, an error message appears with option to reload.

---

## Edge Cases / Failure States

- **Player disconnects mid-match:** round is abandoned; player rejoins at main menu.
- **Judoka dataset fails to load:** error message appears; player can retry loading.
- **Player does not make a stat selection within 30 seconds:** system randomly selects a stat automatically.
- **AI fails to select a stat (if difficulty logic implemented):** fallback to random stat selection.

---

## Design and UX Considerations

- Use consistent color coding for player (blue) vs computer (red) as shown in attached mockups.
- Display clear, large call-to-action text for "Choose an attribute to challenge!" to guide new players.
- Match screens should follow the style and layouts demonstrated in shared mockups:
  - Player and computer cards side-by-side.
  - Central score prominently displayed.
  - Tie or win/loss messages placed centrally.
  - Clear "Next Round" button with distinct state (enabled/disabled).
- **Accessibility:**
  - Minimum text contrast ratio: ≥4.5:1 (per WCAG).
  - Minimum touch target size: ≥48px.
  - Support keyboard navigation for stat selection and match progression.
  - Provide alt text for cards and labels readable by screen readers.
- Animations must run at ≥60fps on mid-tier devices (2GB RAM) to ensure smooth experience.

---

## Non-Goals

- Online multiplayer battles.

---

## Dependencies

- Judoka dataset loaded from `judoka.json`.

---

## Open Questions

- Will difficulty levels change AI stat selection?

---

## Tasks

- [ ] 1.0 Finalize Problem Statement and Goals
  - [ ] 1.1 Confirm problem statement with stakeholders.
  - [ ] 1.2 Validate quantitative goals with analytics team.

- [ ] 2.0 Finalize Functional Requirements
  - [ ] 2.1 Review priority assignments with dev team.
  - [ ] 2.2 Ensure all requirements align with mockups and gameplay flow.

- [ ] 3.0 Complete Acceptance Criteria
  - [ ] 3.1 Add automated tests to validate timeout, tie, and AI behavior.
  - [ ] 3.2 Document criteria for successful summary screen display.

- [ ] 4.0 Implement Edge Case Handling
  - [ ] 4.1 Add error handling for dataset load failures.
  - [ ] 4.2 Implement reconnect flow for player disconnections.

- [ ] 5.0 Polish Design & Accessibility
  - [ ] 5.1 Annotate mockups with interaction details.
  - [ ] 5.2 Verify color contrast and font sizes meet accessibility guidelines.
  - [ ] 5.3 Add keyboard and screen reader support.