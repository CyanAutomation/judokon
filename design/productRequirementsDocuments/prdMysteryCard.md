# PRD: Mystery Judoka Card

---

## TL;DR

The **Mystery Judoka Card** is a placeholder card used in _every round against the opponent_. It temporarily hides the opponent’s real card until the player selects a stat, ensuring fair gameplay and preventing stat-based cheating. The card uses a **special SVG icon** (not a portrait), obscured stats (`"?"`), and the name “Mystery Judoka”, providing a consistent and thematic experience during the stat selection phase.

---

## Problem Statement

Currently, the opponent’s card is visible before the player chooses a stat. This unintentionally encourages players to base their choice on the opponent’s values — compromising fairness and removing tension from the match. The **Mystery Judoka Card** acts as a stat-obscuring placeholder that maintains surprise and integrity in each round.

> Sota faces off against an opponent. A card appears with a dark silhouette and mysterious stats. He hovers between Power and Kumi-kata. With a deep breath, he picks Power. The card flips — revealing the opponent: a legendary -100kg champion with immense strength. Too late to change. That moment of tension? That’s the thrill we’re aiming for.

---

## Goals

- Prevent pre-selection peeking at the opponent’s stats to maintain competitive fairness.
- Introduce momentary suspense in each round to heighten emotional investment.
- Preserve visual consistency using an existing card (`judokaId=1`) with special styling.
- Ensure the opponent card reveal animation completes within **400ms**.
- Guarantee **100% concealment** of all opponent stats during player stat selection.
  - **Note:** The signature move does not need to be obscured and should be displayed as "?" on the Mystery Judoka card.
- **Mystery Judoka Card must display a provided SVG icon (see Technical Considerations) instead of a portrait image.**

---

## User Stories

- As a player, I want to choose my stat _before_ seeing the opponent’s card, so the match feels fair and unpredictable.
- As a returning player, I want the placeholder card to feel familiar and thematic, not jarring.
- As a developer, I want to reuse an existing hidden judoka record to simplify implementation and asset management.

---

## Functional Requirements

| Priority | Feature                     | Description                                                                                                               |
| :------: | :-------------------------- | :------------------------------------------------------------------------------------------------------------------------ |
|  **P1**  | Placeholder Mystery Card    | Show `judokaId=1` card with silhouette and "?" stats at start of each opponent round. Signature move is also shown as "?" |
|  **P1**  | Stat Redaction on Render    | Replace all visible stat values with "?" regardless of real values. Signature move is always shown as "?"                 |
|  **P1**  | Card Swap on Stat Selection | Reveal opponent card via animated swap within 400ms, no layout shift                                                      |
|  **P2**  | Consistent Styling          | Apply proper rarity border, portrait container, and stat layout                                                           |
|  **P3**  | Accessibility Compliance    | Ensure all question marks and names are screen-reader friendly                                                            |

---

## Acceptance Criteria

- Mystery Judoka card (`judokaId=1`) displays with the provided SVG icon and question marks in all stat fields at the start of each opponent round.
- Opponent card is revealed via slide or flip animation within 400ms after player selects a stat, replacing the Mystery Judoka card.
- Mystery Judoka card displays the name "Mystery Judoka" and stats as "?", regardless of real values.
- Mystery Judoka card retains correct rarity styling, weight class, and flag as defined in `judoka.json`.
- Portrait area shows the SVG icon instead of any image.
- Reveal animation completes cleanly without layout shift or UI jump.

---

## Edge Cases / Failure States

- **Player selects stat before Mystery Card is rendered:** Delay selection until render complete.
- **Mystery Judoka stats not replaced visually:** Default to `"?"` in all stat fields regardless of backend value.
- **Animation interrupted:** Ensure fallback swap (no animation) still completes the reveal.

---

## Technical Considerations

- **Card Source:** Use `judokaId=1` from `judoka.json` with `"IsHidden": true`.
- **Portrait/Icon:** **Display the following SVG icon in the portrait area instead of an image:**  
  `<svg viewBox="0 0 960 960"><path d="M424-320q0-81 14.5-116.5T500-514q41-36 62.5-62.5T584-637q0-41-27.5-68T480-732q-51 0-77.5 31T365-638l-103-44q21-64 77-111t141-47q105 0 161.5 58.5T698-641q0 50-21.5 85.5T609-475q-49 47-59.5 71.5T539-320H424Zm56 240q-33 0-56.5-23.5T400-160q0-33 23.5-56.5T480-240q33 0 56.5 23.5T560-160q0 33-23.5 56.5T480-80Z"/></svg>`
- **Stat Display:** Override real stat values with `"?"` at render time via `renderJudokaCard()`. (Note: Stat concealment and animation are handled in the UI layer, not in the battle engine.)
- **Name Display:** Use value from `judoka.json` (`"Mystery Judoka"`) for visual consistency.
- **Reveal Timing:** Animate swap to real opponent card after player stat choice within **400ms** using `ease-out` transition.
- **Game Logic:** Opponent card is drawn from remaining deck _before_ stat selection but only displayed _after_ player choice.

---

## UI Behaviour

### Before Player Chooses Stat

```
+————————————————+
| [ BORDER COLOR BASED ON RARITY OF REAL CARD ]  |
|                                                |
| +––––––––––––––+                 |
| |    [ MYSTERY SVG ICON ] |   ← uses provided SVG path  |
| +––––––––––––––+                 |
|                                                |
| [ FLAG: ??? ]            [ WEIGHT CLASS: ??? ] |
|                                                |
|   Mystery Judoka                              |
|                                                |
| Signature Move: ?    ← (Signature move is always shown as "?")           |
|                                                |
| Power: ?     Speed: ?                          |
| Technique: ? Kumi-kata (grip fighting): ? Ne-waza (ground grappling): ?           |
+————————————————+
```

### After Player Chooses Stat → Reveal Opponent Card

- Slide or flip animation replaces the card within **400ms**.
- Real portrait, name, stats, flag, signature move fade in.
- All question marks are replaced with real values.
- No layout shift or scroll jump should occur.

---

## Accessibility Considerations

- `aria-label="Mystery Judoka: hidden card"` should be applied to the opponent card while hidden.
- Ensure `"?"` values in stats are programmatically labeled. For example, use `aria-label="Power unknown"`, `aria-label="Speed unknown"`, etc.
- Expose the card name "Mystery Judoka" to screen readers using an `aria-label` or visible text.
- Focus should not jump or shift when the card is revealed — avoid triggering scroll or layout shift.

---

## Integration Notes

- The **Mystery Judoka card** is never shown in non-opponent modes.
- Use the existing `renderJudokaCard()` helper with a `useObscuredStats` flag to substitute "?" values at render time.
- **Render the SVG icon in the portrait area for the Mystery Judoka card.**
- Maintain card aspect ratio and layout as defined in the core Judoka Cards PRD — do **not** introduce custom card layouts for the mystery variant.

---

## Tasks

- [x] **1.0 Mystery Card Rendering**
  - [x] 1.1 Show `judokaId=1` as placeholder at start of opponent round
  - [x] 1.2 Hide real stats and show `"?"` for all attributes and move
  - [x] 1.3 Apply correct rarity, flag, and weight class styles
  - [x] 1.4 **Display SVG icon in portrait area instead of image**
- [ ] **2.0 Reveal Logic**
  - [ ] 2.1 Trigger swap animation upon stat selection
  - [x] 2.2 Load correct opponent card into same slot
  - [ ] 2.3 Ensure animation completes in ≤400ms
  - [ ] 2.4 Fallback to instant swap if animation fails
- [ ] **3.0 Accessibility**
  - [ ] 3.1 Add `aria-label` attributes to each `"?"` stat (e.g., `aria-label="Power unknown"`) and the card container
  - [ ] 3.2 Ensure the name “Mystery Judoka” is readable by screen readers
  - [ ] 3.3 Prevent layout jump or scroll on reveal
- [ ] **4.0 Game Logic Safeguards**
  - [x] 4.1 Block stat selection until card fully rendered
- [x] **5.0 Code Integration**
  - [x] 5.1 Extend `renderJudokaCard()` with `useObscuredStats` flag
  - [ ] 5.2 Use animation helper for swap timing (ease-out, 400ms)

[Back to Game Modes Overview](prdGameModes.md)
