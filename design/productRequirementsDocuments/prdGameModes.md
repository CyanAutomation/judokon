# PRD: Game Modes

---

## TL;DR

**Ju-Do-Kon!** offers a range of game modes tailored for different play styles—competitive battles, team-based challenges, creative customization, exploratory discovery, and quiet reflection. These modes diversify the experience, increase replayability, and promote deeper engagement.

> After a tough **Classic Battle**, Hiroshi takes a break by entering **Meditation** Mode. Soft music and inspiring quotes help him reconnect with why he loves judo. Later, he updates his Judoka’s signature move, making his fighter truly his own. By offering more than just battles, Ju-Do-Kon! becomes a game players want to return to every day—whether they crave intense combat or quiet reflection.

## Game mode IDs are numeric. Each pre-seeded navigation link references a mode by its ID in `navigationItems.json`, which drives visibility and order via CSS.

### Problem Statement

Returning players often exit after short sessions due to repetitive gameplay loops and limited creative expression.

---

### User Stories

- As a player who’s tired of pure competition, I want a Meditation mode so I can relax and still feel connected to the game.
- As a player with a favorite judoka, I want to update their stats and appearance so they grow with me.

---

### Why It Matters Now

Improving session variety directly supports retention and encourages more personalized play, especially as competition from other collectible games increases.

---

## Goals

### KPI Targets

- Increase returning player average session length by **20%**.
- At least **80%** of users who begin a Team Battle complete the match.
- **70%** of new players use Judoka Creation within their first week.
- **60%** of all players trigger Meditation mode at least once weekly.

### Player Experience Goals _(qualitative)_

- Players experience diverse ways to interact with their judoka.
- Players find modes matching their mood: competitive, creative, or relaxing.

---

## Common Non-Functional Requirements

- All game modes must support **keyboard navigation** and **screen reader** compatibility.
- Layouts must be responsive on **desktop and tablet**.
- Judoka data must dynamically load from `judoka.json` or equivalent.
- All URLs must function without console errors or missing asset warnings.

---

## Design and UX Considerations

- All mode entry points must align with the bottom navigation bar, or map-based navigation system.
- Entry points are represented on the map as clickable, animated hotspots (≥44px). See [UI Design Standards](../codeStandards/codeUIDesignStandards.md#9-accessibility--responsiveness).
- UI contrast ratio must meet WCAG 2.1 (≥4.5:1).
- Touch targets must be ≥44px with WCAG 2.1 contrast compliance.
- Mode entry and exit flows should be clear to prevent disorientation.
- Mode exit returns to the map with confirmation ("Are you sure?").

---

## Prioritized Functional Requirements

| Priority | Feature           | Description                                         |
| -------- | ----------------- | --------------------------------------------------- |
| P1       | Classic Battle    | 1v1 battle vs opponent, stat-based combat to 10 pts |
| P1       | Team Battle Modes | Gender-specific team-based battles                  |
| P1       | Judoka Creation   | Interface for new character creation                |
| P2       | Judoka Update     | Edit existing characters and save changes           |
| P2       | Browse Judoka     | Explore all characters with filtering               |
| P2       | Random Judoka     | View a new random profile per visit                 |
| P3       | Meditation Mode   | Non-interactive rest screen with quotes             |

---

## Game Modes

### Classic Battle

**Japanese**: 試合 (バトルモード)  
**URL**: `battleJudoka.html`  
A 1v1 stat-based match against an AI opponent using a deck of 25 random judoka cards. First to 10 points wins. [Read full PRD](prdClassicBattle.md)

#### Goals

- Deliver a quick head‑to‑head mode for new players **(battle loads in ≤2 s)**.
- Encourage replay through a simple scoring system.

#### Functional Requirements

- Draw one random card from each deck per round.
- Player selects a stat to compare.
- Higher stat wins; score increases by one.
- End match on 10 points or after 25 rounds.

#### Acceptance Criteria

- Cards are revealed in correct sequence.
- Player can select stat.
- Score updates per round outcome.
- Summary screen shown at end.

#### Non‑Goals

- Online multiplayer battles.

#### Dependencies

- Judoka dataset loaded from `judoka.json`.

#### Open Questions

_Resolved in [Classic Battle](prdClassicBattle.md#7-future-considerations):_ AI difficulty will determine stat selection strategy.

---

### Team Battle Selection

**Japanese**: 団体戦選択  
**URL**: `teamBattleSelection.html`  
Choose between Male, Female or Mixed team battles. [Read full PRD](prdTeamBattleSelection.md)

#### Goals

- Guide players to the appropriate team format.

#### Functional Requirements

- Three options visible.
- Routes correctly to selected battle variant.

#### Acceptance Criteria

- Option buttons are interactive.
- Click leads to the correct mode.
- Invalid route fallback returns to selection screen.

#### Non‑Goals

- Team management beyond choosing a mode.

#### Dependencies

- Navigation map must provide a link to this screen.

#### Open Questions

- **Pending:** Decide whether the last chosen mode should be remembered.

---

### Team Battle Modes

**Japanese**: 男子団体戦 / 女子団体戦 / 混合団体戦  
**URLs**: `teamBattleMale.html`, `teamBattleFemale.html`, `teamBattleMixed.html`  
Team battles consist of sequential 1v1s between gender-filtered squads. The shared rules are described in [PRD: Team Battle Rules](prdTeamBattleRules.md). Mode specifics: [Male](prdTeamBattleMale.md) / [Female](prdTeamBattleFemale.md) / [Mixed](prdTeamBattleMixed.md)

#### Goals

- Provide structured team competition with gender rules.

#### Functional Requirements

- Validate team composition by gender.
- Follow team match sequence.
- End state triggers win screen at score cap.

#### Acceptance Criteria

- Team validated on gender before match.
- Sub-match order shown as visual cue.
- At score cap, show win animation and return to Village.

#### Non‑Goals

- Online matchmaking.

#### Dependencies

- Judoka data must include gender field.

#### Open Questions

- **Pending:** Decide whether Mixed mode will allow flexible team sizes.

---

### Browse Judoka

**Japanese**: 柔道家を閲覧  
**URL**: `browseJudoka.html`  
View all available judoka with stats and visuals. [Read full PRD](prdBrowseJudoka.md)

#### Goals

- Allow players to explore the full roster.

#### Functional Requirements

- Scrollable card interface.
- Stats sourced from `judoka.json`.
- Responsive across screen sizes.
- Invalid entries replaced with placeholder.

#### Acceptance Criteria

- If list is empty, show “No cards available” message.

#### Non‑Goals

- Advanced filtering and sorting options.

#### Dependencies

- Carousel and card components.

#### Open Questions

_Resolved in [Browse Judoka](prdBrowseJudoka.md#open-questions):_ search will be considered in a later update.

---

### Team Manager Mode (Admin Mode)

**Japanese**: 柔道家編集モード  
**URL**: `manageJudoka.html`  
Choose to create or edit a judoka.

#### Goals

- Provide an admin hub for judoka creation and updates.

#### Functional Requirements

- Two path options visible.
- Routing to creation or update works.
- Fallback if no judoka are available to edit.
- Will be only available to access via an Admin entry point

#### Acceptance Criteria

- Selecting a path leads to the correct screen.

#### Non‑Goals

- Deep stat editing beyond current fields.

#### Dependencies

- Backend for saving judoka data.

#### Open Questions

- **Pending:** Decide whether to warn players about unsaved changes before exiting.

---

### Create A Judoka (Admin Mode)

**Japanese**: 柔道家を作成  
**URL**: `createJudoka.html`  
Create a new judoka with custom stats and appearance.

#### Goals

- Let Admins add new characters to the game roster.

#### Functional Requirements

- Inputs for name, nationality, stats, weight class, and signature move.
- Live preview updates on change.
- Save adds to data store and confirms.
- Invalid form fields trigger error indicators.
- Will be only available to access via an Admin entry point

#### Acceptance Criteria

- All inputs required before save.
- Given completed form, when saved, judoka appears in `judoka.json`.

#### Non‑Goals

- Sharing created judoka online.

#### Dependencies

- Form validation utilities.

#### Open Questions

- **Pending:** Decide whether to limit the number of custom judoka.

---

### Update A Judoka (Admin Mode)

**Japanese**: 柔道家を更新  
**URL**: `updateJudoka.html`  
Edit an existing judoka. [Read full PRD](prdUpdateJudoka.md)

#### Goals

- Allow Admins to refine stats and appearance over time.

#### Functional Requirements

- Judoka list loads from dataset.
- Edits persist after save.
- Field validation enforces legal stat limits.
- If selected judoka is missing, display retry prompt.
- Will be only available to access via an Admin entry point

#### Acceptance Criteria

- Edits save correctly and persist on reload.

#### Non‑Goals

- Full version history of edits.

#### Dependencies

- Same storage used by the creation screen.

---

### Random Judoka

**Japanese**: ランダム柔道家  
**URL**: `randomJudoka.html`  
Display a random judoka profile. [Read full PRD](prdRandomJudoka.md)

#### Goals

- Give players quick inspiration for new team ideas **(random suggestion ≤1 s)**.

#### Functional Requirements

- Show one random judoka on load or refresh.
- “Draw” button refreshes content.

#### Acceptance Criteria

- Random judoka displayed each visit.

#### Non‑Goals

- Complex filters or search.

#### Dependencies

- Access to the full judoka list.

#### Open Questions

- **Pending:** Decide whether favourites influence random selection.

---

### Meditation

**Japanese**: メディテーション  
**URL**: `meditation.html`  
A calm screen offering inspirational quotes and ambient visuals. [Read full PRD](prdMeditationScreen.md)

#### Goals

- Provide a restful break between battles.

#### Functional Requirements

- Load random quote per visit.
- English/Japanese toggle.
- Ambient visuals reinforce restful tone.

#### Acceptance Criteria

- Text is legible and character art scales correctly.
- Player exits via “Return” button confirming transition back to the map.

#### Non‑Goals

- Rewarding players with items or XP.

#### Dependencies

- Quote data set and language toggle component.

#### Open Questions

- **Pending:** Decide whether quotes rotate daily or on each visit.

---

[Back to Game Modes Overview](prdGameModes.md)
