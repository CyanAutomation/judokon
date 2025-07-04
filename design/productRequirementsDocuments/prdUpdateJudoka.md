## Update Judoka

Game Mode ID: updateJudoka (URL: updateJudoka.html)

[Back to Game Modes Overview](prdGameModes.md)

---

## Problem Statement

Players want the ability to refine and customize their judoka’s stats and appearance over time as they gain experience and strategy insight. Currently, there is no way to update existing judoka, which limits player engagement and personalization.

> *“I want to tweak my judoka’s stats after playing to make them better suited to my style.”* — Player feedback

This feature will empower players to develop their roster continuously, enhancing long-term retention and strategic depth.

---

## Goals (SMART)

* **G1**: Allow players to edit designated judoka stats (Strength, Speed, Technique, Endurance) and appearance fields (Gi color, Belt, Hairstyle) with real-time feedback.
* **G2**: Enforce stat validation rules to prevent illegal values, achieving **100% prevention of invalid saves** during tests.
* **G3**: Persist edits reliably with **≥95% successful save rate within 1 second** of save action.
* **G4**: Provide clear confirmation or error feedback for **100% of save attempts**.
* **G5**: Handle missing or corrupted judoka data gracefully with a retry prompt appearing **100% of the time** in such cases.
* **G6**: Decide and implement whether to lock edits once a judoka enters ranked play (pending).

---

## User Stories

* As a player, I want to update my judoka’s stats so they reflect my evolving strategy.
* As a player, I want my edits to save so I don’t lose changes after leaving the screen.
* As a player, I want validation feedback if I enter invalid stat values so I can correct them.
* As a player, I want to retry loading a judoka if data is missing or corrupted.
* As a ranked player, I want my judoka’s stats to lock after entering ranked play to keep competition fair (subject to decision).

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
Then the edits persist and are correctly loaded on page reload with a success confirmation displayed within 1 second

**Field Validation**  
Given a player enters invalid stat values  
When they attempt to save  
Then the system shows inline validation errors and prevents save until corrections are made

**Missing Judoka Data**  
Given the selected judoka data is missing or corrupted  
When the player tries to load the judoka for editing  
Then show a retry prompt allowing the player to attempt loading again

**Edit Locking (if enabled)**  
Given a judoka has entered ranked play  
When the player attempts to edit that judoka  
Then edits are disabled and a message explains why editing is locked

---

## Edge Cases / Failure States

* Network or storage failures during save show an error with retry option.
* Invalid or incomplete inputs block saving with clear inline error messages.
* Missing or corrupted judoka data triggers a retry prompt before editing can proceed.
* Conflicting edits (e.g., simultaneous updates from multiple devices) should result in the latest valid save winning, with a message notifying the player.

---

## Design and UX Considerations

* Provide an intuitive form layout grouping editable stats and appearance fields.
* Use inline validation feedback next to fields for immediate correction.
* Ensure save and cancel buttons are prominent, accessible, and clearly labeled.
* Support keyboard navigation and screen readers for accessibility.
* Show loading states when fetching judoka data.
* Disable save button until all validations pass.
* Clearly indicate if edits are locked due to ranked play status.

---

## Player Settings

* No player toggles or settings apply to this feature.
* Edit locking policy will be controlled by game rules, not player choice.

---

## Non-Goals

* Full version history or undo/redo for edits is not included.
* Advanced stat calculation or suggestions are out of scope.

---

## Dependencies

* Storage system shared with the judoka creation screen.
* Validation rules as defined by the game’s stat limits.

---

## Open Questions

* Should we lock edits once a judoka enters ranked play?
  * If yes, what triggers the lock (e.g., match acceptance, ranking threshold)?
  * How is the player notified (e.g., modal, inline message)?

---

## User Flow: Update Judoka

**Entry**
* Player selects a judoka to update from the roster or edit screen.
* System loads the judoka data into an editable form.
* If data load fails, show a retry prompt.

**Editing**
* Player edits allowed fields (stats and appearance).
* System validates inputs in real time with inline errors if invalid.
* Save button is enabled only if all validations pass.

**Saving**
* Player clicks “Save” to persist changes.
* System saves data and confirms success visually within 1 second.
* Edits persist and are visible after page reload.

**Error Handling**
* If save fails (e.g., network/storage issues), show error with retry option.
* If judoka data is missing or corrupted, player can retry loading.

**Exit**
* Player can cancel edits to discard changes and return to roster.
* If edits are locked due to ranked play, editing UI is disabled with an explanation.

---

## Tasks

- [ ] 1.0 Implement Judoka Edit Interface
  - [ ] 1.1 Load judoka data into editable fields
  - [ ] 1.2 Design form UI for stats (Strength, Speed, Technique, Endurance) and appearance (Gi color, Belt, Hairstyle)
  - [ ] 1.3 Add real-time validation with inline error messages

- [ ] 2.0 Save and Persistence
  - [ ] 2.1 Save edits to shared storage reliably within 1 second
  - [ ] 2.2 Show confirmation on successful save
  - [ ] 2.3 Load saved edits correctly on reload

- [ ] 3.0 Error Handling
  - [ ] 3.1 Display retry prompt when judoka data fails to load
  - [ ] 3.2 Show errors and retry option on save failures
  - [ ] 3.3 Handle simultaneous edits with clear conflict resolution messaging

- [ ] 4.0 Accessibility and UX Enhancements
  - [ ] 4.1 Support keyboard navigation and screen readers
  - [ ] 4.2 Provide clear visual feedback on validation and save status
  - [ ] 4.3 Implement disabled state and messaging for edit locking

- [ ] 5.0 Edit Locking Policy (pending decision)
  - [ ] 5.1 Lock editing when judoka enters ranked play
  - [ ] 5.2 Notify player with explanatory message

- [ ] 6.0 QA and Testing
  - [ ] 6.1 Test full edit, validation, save/load workflows
  - [ ] 6.2 Test error cases: missing data, save failure, invalid input
  - [ ] 6.3 Test conflicting edits across devices
  - [ ] 6.4 Test accessibility compliance
