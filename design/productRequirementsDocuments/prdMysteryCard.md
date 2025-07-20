# PRD: Mystery Judoka Card (JU-DO-KON!)

## TL;DR

The **Mystery Judoka Card** is a placeholder card used in *every round against the computer*. It temporarily hides the opponent’s real card until the player selects a stat, ensuring fair gameplay and preventing stat-based cheating. The card uses a silhouette portrait, obscured stats (`"?"`), and the name “Mystery Judoka”, providing a consistent and thematic experience during the stat selection phase.

---

## Problem Statement

Currently, the computer’s card is visible before the player chooses a stat. This unintentionally encourages players to base their choice on the opponent’s values — compromising fairness and removing tension from the match. The **Mystery Judoka Card** acts as a stat-obscuring placeholder that maintains surprise and integrity in each round.

> Sota faces off against the CPU. A card appears with a dark silhouette and mysterious stats. He hovers between Power and Kumi-kata. With a deep breath, he picks Power. The card flips — revealing the opponent: a legendary -100kg champion with immense strength. Too late to change. That moment of tension? That’s the thrill we’re aiming for.

---

## Goals

- Prevent pre-selection peeking at the opponent’s stats.
- Introduce momentary suspense in each round.
- Preserve visual consistency using an existing card (`judokaId=1`) with special styling.

---

## User Stories

- As a player, I want to choose my stat *before* seeing the opponent’s card, so the match feels fair and unpredictable.
- As a returning player, I want the placeholder card to feel familiar and thematic, not jarring.
- As a developer, I want to reuse an existing hidden judoka record to simplify implementation and asset management.

---

Priority
Feature
Description
P1
Placeholder Mystery Card
Show judokaId=1 card with silhouette and "?" stats at start of each CPU round
P1
Stat Redaction on Render
Replace all visible stat values with "?" regardless of real values
P1
Card Swap on Stat Selection
Reveal opponent card via animated swap within 400ms
P2
Consistent Styling
Apply proper rarity border, portrait container, and stat layout
P3
Accessibility Compliance
Ensure all question marks and names are screen-reader friendly

---

## Acceptance Criteria

- **Given** a round starts in any battle mode against the CPU,  
  **When** the opponent card is shown,  
  **Then** the “Mystery Judoka” card (`judokaId=1`) is displayed with silhouette image and question marks in all stat fields.

- **Given** the player selects a stat,  
  **When** the opponent’s real card is revealed,  
  **Then** it *replaces* the Mystery Judoka card via slide or flip animation within **400ms**.

- **Given** the Mystery Judoka card appears,  
  **Then** its name should be displayed as “Mystery Judoka” and stats as `"?"`, regardless of real underlying values.

- **Given** the Mystery Judoka card is displayed,  
  **Then** it should retain correct rarity styling, weight class, and flag as defined in `judoka.json`.

---

## Edge Cases / Failure States

- **Player selects stat before Mystery Card is rendered →** Delay selection until render complete.
- **Mystery Judoka stats not replaced visually →** Default to `"?"` in all stat fields regardless of backend value.
- **Mystery Judoka card shown outside CPU battle →** Prevent display in any mode where both players are human.
- **Animation interrupted →** Ensure fallback swap (no animation) still completes the reveal.

---

## Technical Considerations

- **Card Source:** Use `judokaId=1` from `judoka.json` with `"IsHidden": true`.
- **Portrait Path:** `src/assets/judokaPortraits/judokaPortrait-1.png` (already present).
- **Stat Display:** Override real stat values with `"?"` at render time via `renderJudokaCard()`.
- **Name Display:** Use value from `judoka.json` (`"Mystery Judoka"`) for visual consistency.
- **Reveal Timing:** Animate swap to real CPU card after player stat choice within **400ms** using `ease-out` transition.
- **Game Logic:** Opponent card is drawn from remaining deck *before* stat selection but only displayed *after* player choice.

---

## UI Behaviour

### Before Player Chooses Stat

+————————————————+
| [ BORDER COLOR BASED ON RARITY OF REAL CARD ]  |
|                                                |
| +––––––––––––––+                 |
| |    [ MYSTERY SILHOUETTE ] |   ← judokaPortrait-1.png  |
| +––––––––––––––+                 |
|                                                |
| [ FLAG: ??? ]            [ WEIGHT CLASS: ??? ] |
|                                                |
|   Mystery Judoka                              |
|                                                |
| Signature Move: ???                            |
|                                                |
| Power: ?     Speed: ?                          |
| Technique: ? Kumi-kata: ? Ne-waza: ?           |
+————————————————+

### After Player Chooses Stat → Reveal Opponent Card

- Slide or flip animation replaces the card within **400ms**.
- Real portrait, name, stats, flag, signature move fade in.
- All question marks are replaced with real values.

---

## Prioritized Functional Requirements

| Priority | Feature                     | Description                                                                 |
| -------- | --------------------------- | --------------------------------------------------------------------------- |
| **P1**   | Placeholder Mystery Card     | Show `judokaId=1` card with silhouette and `"?"` stats at start of each CPU round |
| **P1**   | Stat Redaction on Render     | Replace all visible stat values with `"?"` regardless of real values        |
| **P1**   | Card Swap on Stat Selection  | Reveal opponent card via animated swap within **400ms**                     |
| **P2**   | Consistent Styling           | Apply proper rarity border, portrait container, and stat layout             |
| **P3**   | Accessibility Compliance     | Ensure all question marks and names are screen-reader friendly              |

---

## Accessibility Considerations

- `aria-label="Mystery Judoka: hidden card"` should be applied to the opponent card while hidden.
- Ensure `"?"` values in stats are programmatically labeled (e.g., `aria-label="Power unknown"`).
- Focus should not jump or shift when the card is revealed — avoid triggering scroll or layout shift.

---

## Integration Notes

- The **Mystery Judoka card** is never shown in non-CPU modes.
- The Mystery card’s rarity border should match the real CPU card *already drawn* — styling should not default to Common.
- Use the existing `renderJudokaCard()` helper with a `useObscuredStats` flag to substitute `"?"` values at render time.
- Maintain card aspect ratio and layout as defined in the core Judoka Cards PRD — do **not** introduce custom card layouts for the mystery variant.

---

## Tasks

- [ ] 1.0 Mystery Card Rendering
  - [ ] 1.1 Show `judokaId=1` as placeholder at start of CPU round
  - [ ] 1.2 Hide real stats and show `"?"` for all attributes and move
  - [ ] 1.3 Apply correct rarity, flag, and weight class styles

- [ ] 2.0 Reveal Logic
  - [ ] 2.1 Trigger swap animation upon stat selection
  - [ ] 2.2 Load correct opponent card into same slot
  - [ ] 2.3 Ensure animation completes in ≤400ms
  - [ ] 2.4 Fallback to instant swap if animation fails

- [ ] 3.0 Accessibility
  - [ ] 3.1 Add `aria-label` attributes to `"?"` stats and card
  - [ ] 3.2 Ensure name “Mystery Judoka” is readable by screen readers
  - [ ] 3.3 Prevent layout jump or scroll on reveal

- [ ] 4.0 Game Logic Safeguards
  - [ ] 4.1 Block stat selection until card fully rendered
  - [ ] 4.2 Prevent card appearance in multiplayer mode

- [ ] 5.0 Code Integration
  - [ ] 5.1 Extend `renderJudokaCard()` with `useObscuredStats` flag
  - [ ] 5.2 Use animation helper for swap timing (ease-out, 400ms)