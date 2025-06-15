# Ju-Do-Kon! Game Modes – Product Requirements Document

**Audience**: Internal – Developers, Designers, Product Managers, QA Testers  
**Purpose**: Define and describe the primary and secondary game modes available in Ju-Do-Kon!, including functionality, validation conditions, and fallback handling.

---

## Overview

Ju-Do-Kon! offers a range of game modes designed for different player experiences—competitive battles, team-based challenges, customization, and exploration. Each mode enhances the game’s variety, replayability, and educational value.

### Problem Statement

Returning players currently disengage after short sessions, citing repetitive gameplay and a lack of progression opportunities. Most usage clusters around the core 1v1 mode, with limited engagement in creative or reflective experiences.

### Solution

Introduce new and diversified modes to support multiple motivations: mastery (Shiai), teamwork (Team Battle), self-expression (Judoka Creation), exploration (Browse), and reflection (Meditation).

### Goals (SMART)

- Increase returning player average session length by **20%** within 4 weeks.
- At least **80%** of users who begin a Team Battle complete the match.
- **70%** of new players use Judoka Creation within their first week.
- **60%** of all players trigger Meditation mode at least once weekly.

---

## Common Non-Functional Requirements

- All game modes must support **keyboard navigation** and **screen reader** compatibility.
- Layouts must be responsive on **desktop and tablet**.
- Game data must be loaded dynamically from **judoka.json** or equivalent datasets.
- All URLs must function without console errors or missing asset warnings.

---

## Design and UX Considerations

- All mode entry points must visually and thematically align with the **“Judo Training Village”** map-based navigation system.
- Animations for transitions (≤500ms) and optional sound cues must reinforce key actions (e.g., scoring, judoka reveal).
- Touch targets must be ≥48px, with WCAG 2.1 contrast compliance (≥4.5:1).
- Mode entry and exit flows should be clearly defined to prevent user disorientation.

---

## Prioritized Functional Requirements

| Priority | Feature           | Description                                                      |
| -------- | ----------------- | ---------------------------------------------------------------- |
| P1       | Shiai Mode        | 1v1 AI battle, stat-based combat to 10 points                    |
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
- Invalid cards or missing stats trigger fallback popup.

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

---

### 7. Update A Judoka

**Japanese**: 柔道家を更新  
**URL**: `updateJudoka.html`

**Acceptance Criteria**:

- Judoka list loads from dataset.
- Edits persist after save.
- Field validation enforces legal stat limits.
- If selected judoka is deleted/missing, display retry prompt.

---

### 8. Random Judoka

**Japanese**: ランダム柔道家  
**URL**: `randomJudoka.html`

**Acceptance Criteria**:

- Random judoka displayed on load/refresh.
- “Show Another” reloads a different profile.
- If list is empty, show “No data available” message.

---

### 9. Meditation

**Japanese**: メディテーション  
**URL**: `quoteKG.html`

**Acceptance Criteria**:

- Loads random quote per visit.
- English / Japanese toggle works.
- Ambient visuals and sounds reinforce restful tone.
- Text is legible; character art is scaled correctly.
