# PRD: Mystery Judoka Card

---

## TL;DR

The **Mystery Judoka Card** is a placeholder card used in _every round against the opponent_. It temporarily hides the opponent’s real card until the player selects a stat. The card has a "Common" border and contains only a large, centered "?" SVG icon.

---

## Problem Statement

Currently, the opponent’s card is visible before the player chooses a stat. This unintentionally encourages players to base their choice on the opponent’s values — compromising fairness and removing tension from the match. The **Mystery Judoka Card** acts as a stat-obscuring placeholder that maintains surprise and integrity in each round.

> Sota faces off against an opponent. A simple card with a large question mark appears. He hovers between Power and Kumi-kata. With a deep breath, he picks Power. The card flips — revealing the opponent: a legendary -100kg champion with immense strength. Too late to change. That moment of tension? That’s the thrill we’re aiming for.

---

## Goals

- Prevent pre-selection peeking at the opponent’s stats to maintain competitive fairness.
- Introduce momentary suspense in each round to heighten emotional investment.
- Provide a simple, clean, and unambiguous placeholder.
- Ensure the opponent card reveal animation completes within **400ms**.

---

## User Stories

- As a player, I want to choose my stat _before_ seeing the opponent’s card, so the match feels fair and unpredictable.
- As a returning player, I want the placeholder card to be simple and instantly recognizable.

---

## Functional Requirements

| Priority | Feature                  | Description                                                                                                 |
| :------: | :----------------------- | :---------------------------------------------------------------------------------------------------------- |
|  **P1**  | Placeholder Mystery Card | Show a card with a "Common" border and a large, centered "?" SVG icon at the start of each opponent round.    |
|  **P1**  | Card Swap on Stat Selection | Reveal opponent card via animated swap within 400ms, no layout shift                                        |
|  **P3**  | Accessibility Compliance | Ensure the card is properly identified for screen readers.                                                  |

---

## Acceptance Criteria

- A card with a "Common" border and a large, centered "?" SVG icon is displayed at the start of each opponent round.
- There is no other text or imagery on the card.
- Opponent card is revealed via slide or flip animation within 400ms after player selects a stat, replacing the Mystery Judoka card.
- Reveal animation completes cleanly without layout shift or UI jump.

---

## Edge Cases / Failure States

- **Player selects stat before Mystery Card is rendered:** Delay selection until render complete.
- **Animation interrupted:** Ensure fallback swap (no animation) still completes the reveal.

---

## Technical Considerations

- **Card Source:** This is a new, standalone component, not based on `judoka.json` data.
- **Icon:** **Display the following SVG icon, centered on the card:**  
  `<svg viewBox="0 0 960 960"><path d="M424-320q0-81 14.5-116.5T500-514q41-36 62.5-62.5T584-637q0-41-27.5-68T480-732q-51 0-77.5 31T365-638l-103-44q21-64 77-111t141-47q105 0 161.5 58.5T698-641q0 50-21.5 85.5T609-475q-49 47-59.5 71.5T539-320H424Zm56 240q-33 0-56.5-23.5T400-160q0-33 23.5-56.5T480-240q33 0 56.5 23.5T560-160q0 33-23.5 56.5T480-80Z"/></svg>`
- **Styling:** The card should use the standard "Common" rarity border and background color. The SVG should be scaled to be large and centered.
- **Reveal Timing:** Animate swap to real opponent card after player stat choice within **400ms** using `ease-out` transition.
- **Game Logic:** Opponent card is drawn from remaining deck _before_ stat selection but only displayed _after_ player choice.

---

## UI Behaviour

### Before Player Chooses Stat

The Mystery Card is intentionally minimal. It uses the "Common" rarity border and color scheme. The only element on the card is a large "?" SVG icon, centered both vertically and horizontally.

```text
+————————————————+
| [ COMMON BORDER ]                              |
|                                                |
|                                                |
|                                                |
|                   ?                            |
|                                                |
|                                                |
|                                                |
|                                                |
|                                                |
|                                                |
|                                                |
|                                                |
+————————————————+
```

### After Player Chooses Stat → Reveal Opponent Card

- Slide or flip animation replaces the card within **400ms**.
- Real portrait, name, stats, flag, signature move fade in.
- No layout shift or scroll jump should occur.

---

## Accessibility Considerations

- `aria-label="Mystery opponent card"` should be applied to the opponent card container while hidden.
- Focus should not jump or shift when the card is revealed — avoid triggering scroll or layout shift.

---

## Integration Notes

- The **Mystery Judoka card** is never shown in non-opponent modes.
- This will be a new, simple component, likely not using `renderJudokaCard()`.
- Maintain card aspect ratio and layout as defined in the core Judoka Cards PRD.

---

## Tasks

- [ ] **1.0 Mystery Card Component**
  - [ ] 1.1 Create a new component for the Mystery Card.
  - [ ] 1.2 Style the component with a "Common" border.
  - [ ] 1.3 Add the large, centered "?" SVG icon.
- [ ] **2.0 Reveal Logic**
  - [ ] 2.1 Trigger swap animation upon stat selection.
  - [ ] 2.2 Load correct opponent card into the same slot.
  - [ ] 2.3 Ensure animation completes in ≤400ms.
  - [ ] 2.4 Fallback to instant swap if animation fails.
- [ ] **3.0 Accessibility**
  - [ ] 3.1 Add `aria-label` to the card container.
  - [ ] 3.2 Prevent layout jump or scroll on reveal.

[Back to Game Modes Overview](prdGameModes.md)
