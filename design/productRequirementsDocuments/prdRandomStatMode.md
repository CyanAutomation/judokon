# PRD: Random Stat Mode

## Overview (TL;DR)

Random Stat Mode is an optional game mode in JU-DO-KON! where, if the player does not select a stat within a set time limit, the system automatically selects a random stat for the round. This feature adds urgency and unpredictability to matches, and can be toggled via the Settings page.

## Problem Statement / Why It Matters

Some players may hesitate or be indecisive when choosing a stat, slowing down gameplay. Others may want a faster-paced or more unpredictable experience. Random Stat Mode ensures rounds progress smoothly and adds variety, improving engagement and reducing waiting time.

## Goals / Success Metrics

- Reduce average round selection time by 30% for players who enable Random Stat Mode
- Increase match completion rate for casual players
- Provide a seamless, accessible way to enable/disable the feature

## User Stories

- As a new player, I want the game to pick a stat for me if I don't decide quickly, so I can keep playing without stress.
- As a returning player, I want to enable Random Stat Mode for a more dynamic and fast-paced experience.
- As a player, I want to toggle this feature in Settings so I can control my preferred play style.

## Prioritized Functional Requirements

| Priority | Feature                     | Description                                                                     |
| -------- | --------------------------- | ------------------------------------------------------------------------------- |
| P1       | Stat Selection Timer        | Start a countdown timer each round for stat selection.                          |
| P1       | Auto-Select Random Stat     | If timer expires, automatically select a random stat for the player.            |
| P1       | Settings Toggle             | Allow players to enable/disable Random Stat Mode via the Settings page.         |
| P2       | Visual Timer Feedback       | Display remaining time to the player during stat selection.                     |
| P2       | Info Message on Auto-Select | Show a message indicating which stat was auto-selected when time runs out.      |
| P3       | Accessibility Compliance    | Ensure timer and auto-select messages are accessible (e.g., ARIA live regions). |

## Acceptance Criteria

- A visible timer appears during stat selection, counting down from the configured duration (default: 30s).
- If the player does not select a stat before the timer expires, the system auto-selects a random stat and displays a message (e.g., "Time's up! Auto-selecting technique").
- The Random Stat Mode can be enabled or disabled via a toggle in the Settings page.
- When disabled, the player is not forced to select within a time limit (or timer is hidden/inactive).
- The timer and auto-select messages are announced to screen readers (using ARIA live regions).
- The feature works in all supported browsers and devices.
- If timer configuration fails, a fallback duration is used and a waiting message is shown.

## Non-Functional Requirements / Design Considerations

- Timer and messages must be accessible (ARIA live, clear contrast, keyboard focus not lost).
- No significant performance impact on round transitions.
- Settings toggle persists across sessions (if applicable).

## Dependencies and Open Questions

- Depends on timer logic in `src/helpers/classicBattle/timerControl.js`.
- UI elements in `src/pages/battleJudoka.html` and `src/pages/settings.html`.
- Open: Should timer duration be user-configurable in future?

---
