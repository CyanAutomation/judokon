# PRD: Team Battle Rules

---

## TL;DR

Base rule set for Team Battle modes. Teams fight in a series of 1v1 bouts with points awarded per bout. The first team to reach the team-size score wins.

---

## Problem Statement

Players enjoy forming teams of favorite judoka, but rules vary between modes and lack a single source of truth. Inconsistent scoring and win conditions confuse newcomers and shorten play sessions. This document defines core rules so every Team Battle behaves predictably.

---

## Goals

- Provide one authoritative rule set for all Team Battle modes.
- Keep average match duration under **10 minutes**.
- Ensure scoring is calculated consistently across modes.

---

## User Stories

- As a player, I want my team to fight one judoka at a time so I can plan the order strategically.
- As a competitor, I want a clear win condition so I know when the match is over.
- As a developer, I want shared logic that other Team Battle PRDs can inherit.

---

## Overview of Match Flow

- Each team arranges its judoka in a fixed order before the match starts.
- Fighters face off one at a time in sequential 1v1 bouts.
- A bout uses the same comparison logic as Classic Battle: each side draws a card using `generateRandomCard()` and compares the chosen stat.
- The winning side earns **one point**. The next judoka in each lineup then competes.
- The process repeats until one team earns points equal to the number of judoka on its roster.

---

## Team Battle Bout Sequence & Scoring

```mermaid
flowchart TD
    Start(["🎮 Match Start<br/>(Teams Arranged)"])
    Start --> Init["📊 Initialize<br/>(TeamA: 0, TeamB: 0)"]
    
    Init --> BoutStart["⚔️ Bout i Starts<br/>(Fighter A[i] vs Fighter B[i])"]
    
    BoutStart --> DrawCards["🃏 Draw Cards<br/>(random judoka)"]
    
    DrawCards --> SelectStat["📌 Select Stat<br/>(random per rules)"]
    
    SelectStat --> Compare["⚖️ Compare Stats<br/>(A.stat vs B.stat)"]
    
    Compare -->|A wins| AScore["🏆 Team A gets +1<br/>(A.score++)"]
    Compare -->|B wins| BScore["🏆 Team B gets +1<br/>(B.score++)"]
    Compare -->|Tie| NoPoint["🤝 No Points<br/>(Tie round)"]
    
    AScore --> CheckA{{"Team A score<br/>== team size?"}}
    BScore --> CheckB{{"Team B score<br/>== team size?"}}
    NoPoint --> CheckNext{{"More fighters?<br/>(i < team size)"}}
    
    CheckA -->|No| NextBout1["➡️ Bout i+1"]
    CheckB -->|No| NextBout2["➡️ Bout i+1"]
    CheckNext -->|Yes| NextBout3["➡️ Bout i+1"]
    CheckNext -->|No| Draw["🤝 Match Draw<br/>(All bouts tied)"]
    
    NextBout1 --> BoutStart
    NextBout2 --> BoutStart
    NextBout3 --> BoutStart
    
    CheckA -->|Yes| WinA["🥇 Team A Wins<br/>(First to reach goal)"]
    CheckB -->|Yes| WinB["🥇 Team B Wins<br/>(First to reach goal)"]
    
    WinA --> End["✨ Match Over"]
    WinB --> End
    Draw --> End
    
    End --> Done(["🔄 Restart or Return"])
    
    %% Styling
    classDef setup fill:#lightblue,stroke:#333,stroke-width:2px
    classDef bout fill:#lightgreen,stroke:#333,stroke-width:2px
    classDef scoring fill:#lightyellow,stroke:#333,stroke-width:2px
    classDef end fill:#lightsalmon,stroke:#333,stroke-width:2px
    
    class Start,Init setup
    class BoutStart,DrawCards,SelectStat,Compare bout
    class AScore,BScore,NoPoint,CheckA,CheckB,CheckNext scoring
    class WinA,WinB,Draw,End,Done end
```

**Key Sequence**:
1. **Bout Setup** (i = 0 to team-size-1)
   - Fighter A[i] vs Fighter B[i]
   - Both draw random cards
   - Stat selected (by player or randomly depending on mode)

2. **Stat Comparison** → Award point to winner (or tie, no points)

3. **Score Check**
   - If either team reaches team-size points → **Match Ends**, winner declared
   - Else → **Next Bout** (i++)

4. **Match End Conditions**
   - Team A reaches target points → Team A Wins
   - Team B reaches target points → Team B Wins
   - All bouts are ties → Draw (rare)

**Team Sizes**: 
- Male mode: 5 fighters (first to 5 points wins)
- Female mode: 5 fighters (first to 5 points wins)
- Mixed mode: 6 fighters (first to 6 points wins)

**Test Coverage**: Verified by: [tests/battles-regressions/team/](tests/battles-regressions/team/) — validates bout sequence, scoring logic, and win conditions; [tests/helpers/teamBattleRules.test.js](tests/helpers/teamBattleRules.test.js) — unit tests for score calculation and tie handling

**Related diagrams**: See [prdBattleClassic.md](prdBattleClassic.md) for 1v1 bout logic (stat selection, comparison, outcome); [prdGameModes.md](prdGameModes.md#team-battle-modes) for team mode selection and entry points

---

## Team Battle Bout Sequence & Scoring

- Default team size is five members (Male and Female modes) or six members (Mixed mode).
- Teams score one point per victorious bout.
- The first team to score the full team-size total wins the match.
- If a bout ends in a tie, no point is awarded and the next fighters compete.

---

## Prioritized Functional Requirements

| Priority | Feature              | Description                                               |
| -------- | -------------------- | --------------------------------------------------------- |
| **P1**   | Team Setup           | Players arrange judoka order before the match begins.     |
| **P1**   | Sequential 1v1 Bouts | Fighters battle in order, one bout at a time.             |
| **P1**   | Point Scoring        | Winning a bout grants the team one point.                 |
| **P1**   | Match End Condition  | First team to reach the team-size score wins.             |
| **P2**   | Tie Handling         | Tie rounds award no points and the next fighters compete. |
| **P2**   | Early Quit Option    | Player may forfeit the match before completion.           |

---

## Acceptance Criteria

- Players can arrange their team order before the match starts.
- Each bout compares the selected stats and awards a point to the winner.
- The match ends immediately once a team reaches its required score.
- Tied bouts result in no point change and proceed to the next fighters.
- If a player quits early, the match records a loss for that player.

---

## Non-Functional Requirements

- Match flow updates in real time with **≤200 ms** input latency.
- UI maintains **≥60 fps** during card animations.

---

## Dependencies

- Reuses the 1v1 logic defined in [PRD: Classic Battle](prdBattleClassic.md).
- Relies on the shared `generateRandomCard` helper for drawing each judoka card.

---

## Shared Open Questions

- **Pending:** Decide whether team size can be customized or will stay fixed at 5 (Male/Female) or 6 (Mixed).
- **Pending:** If customization is allowed, determine the tie-handling logic for odd totals.

---

[Back to Game Modes Overview](prdGameModes.md)
