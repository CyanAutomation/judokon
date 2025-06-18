# Ju-Do-Kon! Game Modes – Product Requirements Document

**Audience**: Internal – Developers, Designers, Product Managers, QA Testers  
**Purpose**: Define and describe the primary and secondary game modes available in Ju-Do-Kon!, including functionality, validation conditions, and fallback handling.

---

### Overview

Ju-Do-Kon! offers a range of game modes tailored for different play styles—competitive battles, team-based challenges, creative customization, exploratory discovery, and quiet reflection. These modes diversify the experience, increase replayability, and promote deeper engagement.

### Problem Statement

Returning players often exit after short sessions due to repetitive gameplay loops and limited creative expression. In a recent survey, one player said, “I like battling, but after a while, it’s the same thing over and over.” Usage data confirms that >80% of playtime occurs in the core 1v1 mode, with under 20% in creative or reflective features.

### Why It Matters Now

Improving session variety directly supports retention and encourages more personalized play, especially as competition from other collectible games increases.

### Goals (SMART)

- Increase returning player average session length by **20%**.
- At least **80%** of users who begin a Team Battle complete the match.
- **70%** of new players use Judoka Creation within their first week.
- **60%** of all players trigger Meditation mode at least once weekly.

---

## Common Non-Functional Requirements

- All game modes must support **keyboard navigation** and **screen reader** compatibility.
- Layouts must be responsive on **desktop and tablet**.
- Judoka data must dynamically load from judoka.json or equivalent.
- All URLs must function without console errors or missing asset warnings.

---

## Design and UX Considerations

- All mode entry points must visually and thematically align with the **“Judo Training Village”** map-based navigation system.
- Entry points are represented on the Judo Training Village Map as clickable, animated hotspots (≥48px).
- UI contrast ratio must meet WCAG 2.1 (≥4.5:1).
- Touch targets must be ≥48px, with WCAG 2.1 contrast compliance (≥4.5:1).
- Mode entry and exit flows should be clearly defined to prevent user disorientation.
- Mode exit returns to Map with confirmation (“Are you sure?”) to avoid disorientation

---

## Prioritized Functional Requirements

| Priority | Feature           | Description                                                      |
| -------- | ----------------- | ---------------------------------------------------------------- |
| P1       | Shiai Mode        | 1v1 battle vs CPU, stat-based combat to 10 points                    |
| P1       | Team Battle Modes | Gender-specific team-based battles with 1v1 submatches           |
| P1       | Judoka Creation   | Interface for new character creation with preview and save logic |
| P2       | Judoka Update     | Edit existing characters and save changes                        |
| P2       | Browse Judoka     | Explore all characters with future filtering/sorting             |
| P2       | Random Judoka     | View a new random profile per visit                              |
| P3       | Meditation Mode   | Non-interactive rest screen with quotes and visuals              |

---

## Game Modes

### 1. Shiai (Battle Mode)

**Japanese**: 試合 (バトルモード)  
**URL**: `shiai.html`

**Description**:  
A 1v1 stat-based match against an AI opponent using a deck of 25 judoka. First to 10 points wins.

**Rules**:

- 25 Rounds maximum
- Deck size: 25
- Score cap: 10 points
- Player selects one stat per round to compare.
- Higher stat wins, +1 point

Player Flow:

1. Player enters via Map icon → transition to Shiai Arena.
2. Decks load and validate (min. 25 cards).
3. Cards are revealed → player picks stat → score resolves.
4. End state = First to 10 or 25 rounds → summary → return to Map.

**Functional Requirements**:

- Draw one random card from each deck per round.
- Player selects a stat to compare.
- Higher stat wins; score increases by one.
- End match on 10 points or after 25 rounds.

**Acceptance Criteria**:

- Cards are revealed in correct sequence.
- Player can select stat.
- Score updates per round outcome.
- Summary screen shown at end.
- Given 25 valid cards, When a match starts, Then the player sees 25 rounds or score capped at 10.
- Given a revealed card, When a stat is selected, Then the system compares and updates score.
- Given the final round, When conditions are met, Then a summary is shown and return enabled.

Visuals/UX:

- Score display always visible.
- Card stats animated on reveal.
- “Back to Village” button enabled post-match with fade-out transition.

Settings:

- Difficulty Toggle (TBD): Easy/Medium/Hard (default: Medium).
- Sound effects: OFF by default, toggle in corner gear icon.

**Edge Cases**:

- If fewer than 25 cards are present, block match with warning.
- Missing stat on a card triggers "Stat not available" overlay.

---

### 2. Team Battle Selection

**Japanese**: 団体戦選択  
**URL**: `teamBattleSelection.html`

**Description**:  
Choose between Male, Female, or Mixed team battles.

**Functional Requirements**:

- All three options visible.
- Routes correctly to selected battle variant.

**Acceptance Criteria**:

- Option buttons are visible and interactive.
- Click leads to correct mode.
- Invalid route fallback returns to selection screen.
- Given 3 options, When clicked, Then route to selected mode.
- Given an invalid route, Then return to selection screen and show modal.

---

### 3. Team Battle Modes

**Japanese**: 男子団体戦 / 女子団体戦 / 混合団体戦  
**URLs**:

- Male: `teamBattleMale.html`
- Female: **TBD (MISSING URL)**
- Mixed: `teamBattleMixed.html`

**Description**:  
Team battles consist of sequential 1v1s between gender-filtered squads.

**Mode Parameters**:

| Mode   | Rounds | Team Size | Max Score | Gender |
| ------ | ------ | --------- | --------- | ------ |
| Male   | 5      | 5         | 5         | Male   |
| Female | 5      | 5         | 5         | Female |
| Mixed  | 6      | 6         | 6         | Mixed  |

**Acceptance Criteria**:

- Validates team composition by gender.
- Follows team match sequence.
- End state triggers win screen at cap.
- Missing URL redirects to error message page.
- Team validated on gender before match.
- Sub-match order shown as visual queue.
- At score cap, show win animation and return to Village.

Edge Cases:

- If team is invalid (e.g., wrong gender): block with tooltip “Judoka does not meet team criteria.”
- If URL missing (e.g., Female): redirect to error page with option to report bug.

UX Note:

- Mini avatars shown in a lineup before match begins.

---

### 4. Browse Judoka

**Japanese**: 柔道家を閲覧  
**URL**: `carouselJudoka.html`

**Description**:  
View all available judoka with stats and visuals.

**Acceptance Criteria**:

- Scrollable card interface.
- Stats sourced from `judoka.json`.
- Responsive across screen sizes.
- Invalid entries replaced with placeholder.
- If list is empty, show “No cards available” message.
- Scrollable interface; all cards show name, nationality, and stats.
- Sourced from judoka.json.

---

### 5. Judoka Update Mode

**Japanese**: 柔道家編集モード  
**URL**: `judokaUpdateSelection.html`

**Description**:  
Choose to create or edit a judoka.

**Acceptance Criteria**:

- Two path options visible.
- Routing to creation/update works.
- Fallback if no judoka are available to edit.

---

### 6. Create A Judoka

**Japanese**: 柔道家を作成  
**URL**: `createJudoka.html`

**Acceptance Criteria**:

- Inputs for name, nationality, stats, weight class, signature move.
- Live preview updates on change.
- Save adds to data store and confirms.
- Invalid form fields trigger error indicators.
- All inputs required before save.
- Given completed form, When saved, Then judoka appears in judoka.json and preview confirms.

Invalid Case:

- Red outlines on errors with tooltip (“Strength must be between 1–100”).

UX Note:

- Responsive preview area right of form.

---

### 7. Update A Judoka

**Japanese**: 柔道家を更新  
**URL**: `updateJudoka.html`

**Acceptance Criteria**:

- Judoka list loads from dataset.
- Edits persist after save.
- Field validation enforces legal stat limits.
- If selected judoka is deleted/missing, display retry prompt.
- Judoka list loads correctly.
- Edits persist after save.
- Stat bounds enforced.
- If no judoka found, prompt “No saved judoka found. Create one?”

---

### 8. Random Judoka

**Japanese**: ランダム柔道家  
**URL**: `randomJudoka.html`

**Acceptance Criteria**:

- Random judoka displayed on load/refresh.
- “Draw” reloads a different profile.
- On load, show one random judoka.
- Button “Draw” refreshes content.

---

### 9. Meditation

**Japanese**: メディテーション  
**URL**: `quoteKG.html`

**Acceptance Criteria**:

- Loads random quote per visit.
- English / Japanese toggle works.
- Ambient visuals reinforce restful tone.
- Text is legible; character art is scaled correctly.
