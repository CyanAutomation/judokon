# PRD: Game Modes

---

## TL;DR

**Ju-Do-Kon!** offers a range of game modes tailored for different play styles—competitive battles, team-based challenges, creative customization, exploratory discovery, and quiet reflection. These modes diversify the experience, increase replayability, and promote deeper engagement.

> After a tough **Classic Battle**, Hiroshi takes a break by entering **Meditation** Mode. Soft music and inspiring quotes help him reconnect with why he loves judo. Later, he updates his Judoka’s signature move, making his fighter truly his own. By offering more than just battles, Ju-Do-Kon! becomes a game players want to return to every day—whether they crave intense combat or quiet reflection.

## Game mode IDs are numeric. Each pre-seeded navigation link references a mode by its ID in `navigationItems.js`, which drives visibility and order via CSS.

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

| Priority | Feature           | Description                                                                                        |
| -------- | ----------------- | -------------------------------------------------------------------------------------------------- |
| P1       | Classic Battle    | 1v1 battle vs opponent, stat-based combat to a user-selected 5/10/15 point win target (default 10) |
| P1       | Team Battle Modes | Gender-specific team-based battles                                                                 |
| P1       | Judoka Creation   | Interface for new character creation                                                               |
| P2       | Judoka Update     | Edit existing characters and save changes                                                          |
| P2       | Browse Judoka     | Explore all characters with filtering                                                              |
| P2       | Random Judoka     | View a new random profile per visit                                                                |
| P3       | Meditation Mode   | Non-interactive rest screen with quotes                                                            |

---

## Game Modes

### Classic Battle

**Japanese**: 試合 (バトルモード)
**URL**: `battleJudoka.html`
A 1v1 stat-based match against an AI opponent using a deck of 25 random judoka cards. On first visit, a modal prompts the player to choose a win target of 5, 10, or 15 points (default 10); first to that target wins. [Read full PRD](prdBattleClassic.md)

#### Goals

- Deliver a quick head‑to‑head mode for new players **(battle loads in ≤2 s)**.
- Encourage replay through a simple scoring system.

#### Functional Requirements

- Draw one random card from each deck per round.
- Player selects a stat to compare.
- Higher stat wins; score increases by one.
- End match when either player reaches a user-selected win target of 5, 10, or 15 points (default 10) or after 25 rounds.

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

_Resolved in [Classic Battle](prdBattleClassic.md#7-future-considerations):_ AI difficulty will determine stat selection strategy.

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

## Typewriter On

SVG Icon: M160-200v-80h528l-42-42 56-56 138 138-138 138-56-56 42-42H160Zm116-200 164-440h80l164 440h-76l-38-112H392l-40 112h-76Zm138-176h132l-64-182h-4l-64 182Z

## Typewriter Off

SVG Icon: M200-200v-80h560v80H200Zm76-160 164-440h80l164 440h-76l-38-112H392l-40 112h-76Zm138-176h132l-64-182h-4l-64 182Z

## Tooltips On

SVG Icon: M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM480-80 373-240H160q-33 0-56.5-23.5T80-320v-480q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H587L480-80Zm0-144 64-96h256v-480H160v480h256l64 96Zm0-336Z

## Tooltips Off

SVG Icon: M480-80 373-240H160q-33 0-56.5-23.5T80-320v-480q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H587L480-80Zm0-144 64-96h256v-480H160v480h256l64 96Zm0-336Z

## Card Of The Day On

SVG Icon: M438-226 296-368l58-58 84 84 168-168 58 58-226 226ZM200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z

## Card Of The Day Off

SVG Icon: m388-212-56-56 92-92-92-92 56-56 92 92 92-92 56 56-92 92 92 92-56 56-92-92-92 92ZM200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z

## Map On

SVG Icon: M480-118 120-398l66-50 294 228 294-228 66 50-360 280Zm0-202L120-600l360-280 360 280-360 280Zm0-280Zm0 178 230-178-230-178-230 178 230 178Z

## Map Off

SVG Icon: m644-448-56-58 122-94-230-178-94 72-56-58 150-116 360 280-196 152Zm115 114-58-58 73-56 66 50-81 64Zm33 258L632-236 480-118 120-398l66-50 294 228 94-73-57-56-37 29-360-280 83-65L55-811l57-57 736 736-56 56ZM487-606Z

## Random Stat Mode

SVG Icon: M300-240q25 0 42.5-17.5T360-300q0-25-17.5-42.5T300-360q-25 0-42.5 17.5T240-300q0 25 17.5 42.5T300-240Zm0-360q25 0 42.5-17.5T360-660q0-25-17.5-42.5T300-720q-25 0-42.5 17.5T240-660q0 25 17.5 42.5T300-600Zm180 180q25 0 42.5-17.5T540-480q0-25-17.5-42.5T480-540q-25 0-42.5 17.5T420-480q0 25 17.5 42.5T480-420Zm180 180q25 0 42.5-17.5T720-300q0-25-17.5-42.5T660-360q-25 0-42.5 17.5T600-300q0 25 17.5 42.5T660-240Zm0-360q25 0 42.5-17.5T720-660q0-25-17.5-42.5T660-720q-25 0-42.5 17.5T600-660q0 25 17.5 42.5T660-600ZM200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm0-560v560-560Z

## Battle Debug Panel

SVG Icon: M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm0-80h280v-480H160v480Zm360 0h280v-480H520v480Zm40-120h200v-60H560v60Zm0-100h200v-60H560v60Zm0-100h200v-60H560v60ZM160-240v-480 480Z

## Test Mode On

SVG Icon: M200-120q-51 0-72.5-45.5T138-250l222-270v-240h-40q-17 0-28.5-11.5T280-800q0-17 11.5-28.5T320-840h320q17 0 28.5 11.5T680-800q0 17-11.5 28.5T640-760h-40v240l222 270q32 39 10.5 84.5T760-120H200Zm80-120h400L544-400H416L280-240Zm-80 40h560L520-492v-268h-80v268L200-200Zm280-280Z

## Test Mode Off

SVG Icon: M200-120q-51 0-72.5-45.5T138-250l222-270v-240h-40q-17 0-28.5-11.5T280-800q0-17 11.5-28.5T320-840h320q17 0 28.5 11.5T680-800q0 17-11.5 28.5T640-760h-40v240l222 270q32 39 10.5 84.5T760-120H200Zm0-80h560L520-492v-268h-80v268L200-200Zm280-280Z

## Card Inspector

SVG Icon: M450-420q38 0 64-26t26-64q0-38-26-64t-64-26q-38 0-64 26t-26 64q0 38 26 64t64 26Zm193 160L538-365q-20 13-42.5 19t-45.5 6q-71 0-120.5-49.5T280-510q0-71 49.5-120.5T450-680q71 0 120.5 49.5T620-510q0 23-6.5 45.5T594-422l106 106-57 56ZM200-120q-33 0-56.5-23.5T120-200v-160h80v160h160v80H200Zm400 0v-80h160v-160h80v160q0 33-23.5 56.5T760-120H600ZM120-600v-160q0-33 23.5-56.5T200-840h160v80H200v160h-80Zm640 0v-160H600v-80h160q33 0 56.5 23.5T840-760v160h-80Z

## Layout Debug

SVG Icon: M120-120v-520h200v-200h520v720H120Zm520-80h120v-560H400v120h240v440Zm-240 0h160v-360H400v360Zm-200 0h120v-360H200v360Zm440-440v80-80Zm-320 80Zm240 0Zm80-80Z

## Reset Settings

SVG Icon: M520-330v-60h160v60H520Zm60 210v-50h-60v-60h60v-50h60v160h-60Zm100-50v-60h160v60H680Zm40-110v-160h60v50h60v60h-60v50h-60Zm111-280h-83q-26-88-99-144t-169-56q-117 0-198.5 81.5T200-480q0 72 32.5 132t87.5 98v-110h80v240H160v-80h94q-62-50-98-122.5T120-480q0-75 28.5-140.5t77-114q48.5-48.5 114-77T480-840q129 0 226.5 79.5T831-560Z

## Location Battle

SVG Icon: M120-680v-160l160 80-160 80Zm600 0v-160l160 80-160 80Zm-280-40v-160l160 80-160 80Zm0 640q-76-2-141.5-12.5t-114-26.5Q136-135 108-156t-28-44v-360q0-25 31.5-46.5t85.5-38q54-16.5 127-26t156-9.5q83 0 156 9.5t127 26q54 16.5 85.5 38T880-560v360q0 23-28 44t-76.5 37q-48.5 16-114 26.5T520-80v-160h-80v160Zm40-440q97 0 167.5-11.5T760-558q0-5-76-23.5T480-600q-128 0-204 18.5T200-558q42 15 112.5 26.5T480-520ZM360-166v-154h240v154q80-8 131-23.5t69-27.5v-271q-55 22-138 35t-182 13q-99 0-182-13t-138-35v271q18 12 69 27.5T360-166Zm120-161Z

## Location Browse

SVG Icon: M343-470ZM80-120v-480l320-240 215 162q-25 3-47 11.5T526-644l-126-96-240 180v360h160v80H80Zm320 0v-76q0-21 10.5-39.5T439-265q46-27 96.5-41T640-320q54 0 104.5 14t96.5 41q18 11 28.5 29.5T880-196v76H400Zm86-80h308q-35-20-74-30t-80-10q-41 0-80 10t-74 30Zm154-160q-50 0-85-35t-35-85q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35Zm0-80q17 0 28.5-11.5T680-480q0-17-11.5-28.5T640-520q-17 0-28.5 11.5T600-480q0 17 11.5 28.5T640-440Zm0 240Z

## Location Meditation

SVG Icon: M160-80v-366q-52-13-86-55t-34-98h80q0 32 23.5 55.5T199-520h41v-86q-52-13-86-55t-34-98h80q0 32 23.5 55.5T279-680h21l180-240 180 240h21q32 0 55.5-23.5T760-759h80q0 56-34 98t-86 55v86h41q32 0 55.5-23.5T840-599h80q0 56-34 98t-86 55v366H520v-160q0-17-11.5-28.5T480-280q-17 0-28.5 11.5T440-240v160H160Zm240-600h160l-80-107-80 107Zm-80 160h320v-80H320v80Zm-80 360h120v-80q0-50 35-85t85-35q50 0 85 35t35 85v80h120v-280H240v280Zm240-280Zm0-240Zm0 160Z

## Location Spare

SVG Icon: M80-120v-80h160v-160h-80v-80h84q12-75 66.5-129.5T440-636v-204h280v160H520v44q75 12 129.5 66.5T716-440h84v80h-80v160h160v80H80Zm240-80h120v-160H320v160Zm200 0h120v-160H520v160ZM326-440h308q-14-53-57-86.5T480-560q-54 0-97 33.5T326-440Zm154 0Z

## Location Training Centre

SVG Icon: m536-84-56-56 142-142-340-340-142 142-56-56 56-58-56-56 84-84-56-58 56-56 58 56 84-84 56 56 58-56 56 56-142 142 340 340 142-142 56 56-56 58 56 56-84 84 56 58-56 56-58-56-84 84-56-56-58 56Z

[Back to Game Modes Overview](prdGameModes.md)
