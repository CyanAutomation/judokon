# PRD: Update Judoka

---

## TL;DR

Players can fine-tune a judoka's stats and appearance over time, keeping their roster aligned with evolving strategies.

**Game Mode ID:** `9`
**URL:** `updateJudoka.html`

[Back to Game Modes Overview](prdGameModes.md)

---

## Problem Statement

Players want the ability to refine and customize their judoka’s stats and appearance over time as they gain experience and strategy insight. Currently, there is no way to update existing judoka, which limits player engagement and personalization.

> _“I want to tweak my judoka’s stats after playing to make them better suited to my style.”_ — Player feedback

This feature will empower players to develop their roster continuously, enhancing long-term retention and strategic depth. Player surveys show **65% of active users** request customization options post-creation, highlighting this as a priority for sustained engagement.

---

## Goals (SMART)

- **G1:** Allow players to edit designated judoka stats (Strength, Speed, Technique, Endurance) and appearance fields (Gi color, Belt, Hairstyle) with real-time feedback.
- **G2:** Enforce stat validation rules to prevent illegal values, achieving **100% prevention of invalid saves** during tests.
- **G3:** Persist edits reliably with **≥95% successful save rate within 1 second** of save action.
- **G4:** Provide clear confirmation or error feedback for **100% of save attempts**, with animation feedback.
- **G5:** Handle missing or corrupted judoka data gracefully with a retry prompt appearing **100% of the time** in such cases.
- **G6:** Decide and implement whether to lock edits once a judoka enters ranked play (pending).

---

## Non-Goals

- Full version history or undo/redo for edits is not included.
- Advanced stat calculation or suggestions are out of scope.

---

## User Stories

- As a player, I want to update my judoka’s stats so they reflect my evolving strategy.
- As a player, I want my edits to save so I don’t lose changes after leaving the screen.
- As a player, I want validation feedback if I enter invalid stat values so I can correct them.
- As a player, I want to retry loading a judoka if data is missing or corrupted.
- As a ranked player, I want my judoka’s stats to lock after entering ranked play to keep competition fair (subject to decision).

---

## Prioritized Functional Requirements

| Priority | Feature                    | Description                                                                                               |
| -------- | -------------------------- | --------------------------------------------------------------------------------------------------------- |
| **P1**   | Load Judoka Data           | Load current judoka info into editable fields                                                             |
| **P1**   | Edit Stats and Appearance  | Allow editing of stats (Strength, Speed, Technique, Endurance) and appearance (Gi color, Belt, Hairstyle) |
| **P1**   | Validation                 | Enforce legal stat limits with real-time inline error feedback                                            |
| **P1**   | Save and Persist           | Save changes to shared storage reliably and reload correctly                                              |
| **P1**   | Error Handling on Load     | Show retry prompt if judoka data fails to load                                                            |
| **P2**   | Error Handling on Save     | Show errors and retry option if save fails                                                                |
| **P2**   | Edit Locking               | Optionally disable edits if judoka is in ranked play                                                      |
| **P2**   | Accessibility Enhancements | Support keyboard navigation, screen readers, and clear feedback                                           |

---

## Acceptance Criteria

**Saving and Persistence**  
Given a player edits a judoka’s stats or appearance  
When the player saves the changes  
Then the edits persist and are correctly loaded on page reload  
And a confirmation message appears near the Save button with a smooth slide-up animation (**≤300 ms**), fading out after 3 seconds
And the save completes within 1 second

**Field Validation**  
Given a player enters invalid stat values  
When they attempt to save  
Then the system shows inline validation errors in red below the affected fields with a 200ms fade-in animation  
And prevents save until corrections are made

**Missing Judoka Data**  
Given the selected judoka data is missing or corrupted  
When the player tries to load the judoka for editing  
Then show a retry prompt modal with a clear message and retry button, allowing the player to attempt loading again

**Edit Locking (if enabled)**  
Given a judoka has entered ranked play  
When the player attempts to edit that judoka  
Then edits are disabled  
And a semi-transparent overlay covers the form with a message explaining why editing is locked  
The message is dismissible with an OK button

**Conflict Resolution Messaging**  
Given a player attempts to save edits while another device has saved conflicting changes  
When the system detects conflicting edits  
Then the latest valid save is applied  
And the player sees an inline message near the Save button:  
_"Your changes have been updated due to a recent save on another device. Please review the latest stats."_  
This message fades out after 5 seconds  
And the form fields refresh with the newest data

---

## Edge Cases / Failure States

- Network or storage failures during save show an error with retry option modal.
- Invalid or incomplete inputs block saving with clear inline error messages.
- Missing or corrupted judoka data triggers a retry prompt modal before editing can proceed.
- Conflicting edits (e.g., simultaneous updates from multiple devices) resolve by accepting the latest valid save and notifying the player.

---

## Design and UX Considerations

- Provide an intuitive form layout grouping editable stats and appearance fields.
- Use inline validation feedback next to fields with fade-in/out animations for immediate correction.
- Ensure save and cancel buttons are prominent, accessible, and clearly labeled.
- Save button is disabled until all validations pass.
- Support keyboard navigation and screen readers for accessibility, including ARIA labels.
- Show loading spinners or progress indicators when fetching judoka data.
- Display retry prompt as a modal with focus trap and keyboard dismissal.
- If edits are locked due to ranked play, display a semi-transparent overlay with dismissible message.
- Confirmation and error messages appear near the Save button with smooth slide and fade animations (**≤300 ms**) for better UX.

---

## Player Settings

- No player toggles or settings apply to this feature.
- Edit locking policy will be controlled by game rules, not player choice.

---

## Dependencies

- Storage system shared with the judoka creation screen.
- Validation rules as defined by the game’s stat limits.

---

## Open Questions

- **Pending:** Determine if edits lock once a judoka enters ranked play.
  - If yes, decide what triggers the lock (match acceptance or ranking threshold).
  - Decide how players are notified (modal overlay, inline message, or both).

---

## User Flow: Update Judoka

**Entry**

- Player selects a judoka to update from the roster or edit screen.
- System loads the judoka data into an editable form with loading indicator.
- If data load fails, show retry prompt modal.

**Editing**

- Player edits allowed fields (stats and appearance).
- System validates inputs in real time with inline errors showing via fade-in animation if invalid.
- Save button is enabled only if all validations pass.

**Saving**

- Player clicks “Save” to persist changes.
- System saves data within 1 second.
- Success confirmation slides up near the Save button and fades out after 3 seconds.
- Edits persist and are visible after page reload.

**Conflict Handling**

- If conflicting save detected, system updates fields and shows conflict message inline for 5 seconds.

**Error Handling**

- If save fails (network/storage issues), show retry error modal.
- If judoka data is missing or corrupted, player can retry loading.

**Exit**

- Player can cancel edits to discard changes and return to roster.
- If edits are locked due to ranked play, editing UI is disabled with a dismissible overlay message.

---

## UI Design

**Feedback & Modal Layer**  
_Contents:_

- Modular status/confirmation bar above Save button, with slide-up and fade animation for both success and conflict messages
- Inline validation error area directly under each editable stat/appearance field (auto-expanding, 200ms fade)
- Reusable modal overlay component for error/retry, loading spinner, and edit-locked state, with focus trap and dismiss/OK button

_Why:_  
Your current design provides zero feedback for success, error, or locked states, in direct violation of nearly every requirement and game state. Modularizing feedback and overlays ensures every edge case is handled and future features can be slotted in without redesigning the whole screen.

---

**Responsive & Touch-Optimized Form Module**  
_Contents:_

- All editable fields refactored into clearly labeled, interactive controls (sliders or steppers for stats, dropdowns for Gi/Belt, tappable avatar tiles for Hairstyle)
- Minimum 44px vertical height per input for touch targets
- Logical, single-column flow with clear focus order, tab/keyboard support, and section dividers for Stats/Appearance
- Flexible width—auto-scaling to screen size, using grid or flexbox

_Why:_  
Current controls are static and too small for any touch or keyboard user. Responsive, interactive controls are non-negotiable for a modern web game UI.

---

**Header & Action Bar Module**  
_Contents:_

- Consistent header with dominant title, smaller back button, and safe padding
- Save/Cancel action bar pinned at the bottom, grouped together, with Save as primary (high contrast color) and clear disabled state if form invalid
- Optional: floating help/info button for future accessibility hints

_Why:_  
Header and action layout are inconsistent, cluttered, and violate basic navigation standards. Centralizing actions at the bottom with proper grouping reduces confusion and supports touch ergonomics.

---

## Tasks

- [ ] 1.0 Implement Judoka Edit Interface
  - [ ] 1.1 Load judoka data into editable fields with loading spinner
  - [ ] 1.2 Design form UI for stats (Strength, Speed, Technique, Endurance) and appearance (Gi color, Belt, Hairstyle)
  - [ ] 1.3 Add real-time validation with inline error messages and fade-in animation

- [ ] 2.0 Save and Persistence
  - [ ] 2.1 Save edits to shared storage reliably within 1 second
  - [ ] 2.2 Show confirmation message with slide-up and fade-out animation on successful save
  - [ ] 2.3 Load saved edits correctly on reload

- [ ] 3.0 Error Handling
  - [ ] 3.1 Display retry prompt modal when judoka data fails to load
  - [ ] 3.2 Show errors and retry option modal on save failures
  - [ ] 3.3 Handle simultaneous edits with clear conflict resolution messaging and data refresh

- [ ] 4.0 Accessibility and UX Enhancements
  - [ ] 4.1 Support keyboard navigation and screen readers with ARIA labels
  - [ ] 4.2 Provide clear visual feedback on validation and save status including animations
  - [ ] 4.3 Implement disabled state and dismissible overlay message for edit locking

- [ ] 5.0 Edit Locking Policy (pending decision)
  - [ ] 5.1 Lock editing when judoka enters ranked play
  - [ ] 5.2 Notify player with explanatory dismissible overlay

- [ ] 6.0 QA and Testing
  - [ ] 6.1 Test full edit, validation, save/load workflows including animation timing
  - [ ] 6.2 Test error cases: missing data, save failure, invalid input
  - [ ] 6.3 Test conflicting edits across devices with conflict messaging
  - [ ] 6.4 Test accessibility compliance
