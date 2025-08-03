# PRD: Random Stat Mode

## Overview (TL;DR)

Random Stat Mode is an optional game mode in JU-DO-KON! where, if the player does not select a stat within a set time limit, the system automatically selects a random stat for the round. This feature adds urgency and unpredictability to matches and can be toggled via the Settings page.

## Problem Statement / Why It Matters

Some players hesitate or overthink stat choices, slowing down the pace of matches. This creates friction for more fast-paced players and extends wait times, especially in casual play. Internal observation shows that ~18% of turns take longer than 25 seconds to resolve due to indecision. Random Stat Mode helps maintain game flow, reduces downtime, and introduces an element of surprise for increased engagement.

## Goals / Success Metrics

- Reduce average round stat selection time by **30%** among players who enable Random Stat Mode, measured over a 14-day window.
- Increase **casual match completion rate by 15%** for players with the feature enabled.
- Ensure at least **95% of users can locate and toggle the feature** in Settings during usability tests.
- Maintain **feature toggle persistence across sessions** with 0% error rate in toggle state loss.

## User Stories

- As a new player, I want the game to pick a stat for me if I don't decide quickly, so I can keep playing without stress.
- As a returning player, I want to enable Random Stat Mode for a more dynamic and fast-paced experience.
- As a player, I want to toggle this feature in Settings so I can control my preferred play style.

## Prioritized Functional Requirements

| Priority | Feature                     | Description                                                                     |
| -------- | --------------------------- | ------------------------------------------------------------------------------- |
| P1       | Stat Selection Timer        | Start a countdown timer each round for stat selection (default: 30s).           |
| P1       | Auto-Select Random Stat     | If timer expires, automatically select a random stat and apply it to the round. |
| P1       | Settings Toggle             | Allow players to enable/disable Random Stat Mode via the Settings page.         |
| P2       | Visual Timer Feedback       | Display remaining time to the player during stat selection.                     |
| P2       | Info Message on Auto-Select | Show a message indicating which stat was auto-selected when time runs out.      |
| P3       | Accessibility Compliance    | Ensure timer and messages are accessible (e.g., ARIA live regions, contrast).   |

## Acceptance Criteria

- A visible countdown timer appears during stat selection, starting at 30s (or fallback default if config fails).
- If the player does not select a stat before the timer expires, the system:
  - Randomly selects a valid stat.
  - Displays a message (e.g., "Time's up! Auto-selecting technique").
  - Applies that stat to the round without error.
- When Random Stat Mode is enabled:
  - Timer and auto-select are active.
- When disabled:
  - Timer does not appear.
  - Player can take unlimited time.
- Players can toggle the feature in the Settings page.
- The toggle:
  - Is clearly labeled.
  - Persists across sessions.
  - Is testable across supported browsers/devices.
- Timer and messages are:
  - Readable by screen readers (ARIA live).
  - High-contrast and non-obstructive.
- If timer configuration fails, system uses a 30s fallback and shows a loading message.

## Edge Cases / Failure States

- If timer config fails to load, fallback value of 30s is used.
- If player disconnects mid-selection, default stat is chosen on reconnection.
- If tab is inactive or minimized, timer continues server-side.
- If screen reader fails to announce message, text remains persistently visible.
- If player toggles feature mid-match, change takes effect from next round.

## Non-Functional Requirements / Design Considerations

- Countdown timer must meet WCAG color contrast standards.
- Message region should not disrupt layout or screen reader navigation.
- Feature toggle state must persist via local storage or player profile settings.
- Performance impact of enabling timer and message display should be minimal.

## Wireframes / Visual Concepts

_(Visuals to be attached)_

- Timer displayed at the top of the stat selection UI.
- “Auto-selected” message displayed below the stat grid post-expiry.
- Toggle control placed in Settings > Gameplay section with tooltip: “Automatically choose a stat if no selection is made in time.”

## Dependencies and Open Questions

- Depends on `timerControl.js` logic.
- UI components in `battleJudoka.html` and `settings.html`.
- Open Question: Should timer duration be user-configurable in advanced settings?

---

## Tasks

- [ ] 1.0 Implement Stat Selection Timer
  - [ ] 1.1 Add countdown timer to stat selection screen
  - [ ] 1.2 Configure default timer value (30 seconds)
  - [ ] 1.3 Integrate timer with `timerControl.js`

- [ ] 2.0 Develop Auto-Select Random Stat Logic
  - [ ] 2.1 Trigger random stat selection on timer expiry
  - [ ] 2.2 Display auto-select message to player
  - [ ] 2.3 Ensure stat is logged and used in battle logic

- [ ] 3.0 Create Settings Page Toggle
  - [ ] 3.1 Add toggle to Settings UI
  - [ ] 3.2 Link toggle state to game logic
  - [ ] 3.3 Persist toggle state across sessions

- [ ] 4.0 Build Visual Timer Feedback
  - [ ] 4.1 Display visible countdown on stat selection screen
  - [ ] 4.2 Update style for clarity and accessibility

- [ ] 5.0 Ensure Accessibility Compliance
  - [ ] 5.1 Use ARIA live regions for timer and messages
  - [ ] 5.2 Validate contrast and keyboard navigation
  - [ ] 5.3 Test across supported browsers and screen readers
