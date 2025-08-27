# JU-DO-KON! PRD Guidelines

This document summarizes the **required structure and content** for high-quality Product Requirements Documents (PRDs) in the JU-DO-KON! project. All PRDs live under `design/productRequirementsDocuments` and follow a common pattern. In addition to general sections like **Overview**, **Problem Statement**, **Goals**, **User Stories**, **Non-goals**, etc., _each PRD must explicitly list its functional requirements and corresponding acceptance criteria_. These sections enable AI agents to check completeness and correctness of new PRDs.

## Required Sections and Structure

A good PRD typically includes at least the following sections:

- **Title/Overview (TL;DR)** – A brief summary of the feature or mode and its purpose. Example: the Classic Battle PRD starts with “Classic Battle is Ju-Do-Kon!’s introductory, head-to-head mode…”.
- **Problem Statement / Why It Matters** – A clear statement of the user problem or gap this feature addresses, often supported by user feedback. For example, the Browse Judoka PRD has a “Problem Statement” section explaining players’ frustration at not seeing all judoka at once.
- **Goals / Success Metrics** – Quantitative (e.g. KPI targets) and qualitative goals that justify the feature. The Game Modes overview PRD lists KPI targets (e.g. “Increase returning player session length by 20%”) and player experience goals.
- **User Stories** – Persona-driven scenarios that describe how different users will use the feature. Each PRD we checked includes user stories with format “As a \[user], I want \[action] so that \[outcome]”.
- **Functional Requirements (Prioritized)** – _A prioritized list/table of all required features or functions_. This is critical: it enumerates _what the feature must do_, along with a priority for each item. Typically this is presented as a table with columns like **Priority**, **Feature**, and **Description**. For example, the Classic Battle PRD has a “Prioritized Functional Requirements” table listing P1/P2/P3 features, and the Browse Judoka PRD lists its features similarly. Each entry should be concise but descriptive of the expected behavior.
- **Acceptance Criteria** – _Specific, testable conditions_ that defines each functional requirement. These are often bullet points under an “Acceptance Criteria” heading. For instance, the Browse Judoka PRD includes criteria like “The full list of up to 100 judoka cards loads and is visible within 1 second” or “Using keyboard arrow keys moves focus to the previous/next card”. Likewise, the Classic Battle PRD lists criteria such as “Cards are revealed in the correct sequence each round” and “Player can select a stat within 30 seconds; if not, the system auto-selects”. Each criterion should be measurable or verifiable (e.g. time limits, UI states, error handling).
- **Non-Functional Requirements / Design Considerations** – Accessibility, performance, UX rules, etc. (e.g. “≥30 fps during scrolling”). These ensure quality beyond functionality.
- **Dependencies and Open Questions** – Any external modules used or design decisions pending (e.g. the Team Battle rules PRD lists dependencies on the Classic Battle logic).

By organizing PRDs this way, AI agents (and human reviewers) can quickly verify completeness. For example, a missing “Acceptance Criteria” section or an unprioritized requirements list can be flagged as a gap.

## Prioritized Functional Requirements

- **Use a clear table or list:** Each functional requirement should appear with a _priority level_ (e.g. P1, P2, P3) and a brief description. In JU-DO-KON PRDs, priorities are usually **P1** (must-have), **P2** (important), **P3** (nice-to-have).
- **Be concise and descriptive:** The “Feature” column names the requirement, and “Description” explains it. For example, one entry is **“P1 – Random Card Draw: Draw one random card per player each round…”**. Another is **“P1 – Scrollable Card Interface: Allow players to scroll through the full judoka roster.”**.
- **Cover all core behaviors:** Every major mode or feature should have its key functions listed. In the Game Modes PRD, a single table lists high-level features for all modes (e.g. Classic Battle, Team Battle Modes, etc.). In a mode-specific PRD (like Classic Battle), list all game mechanics (card draw, scoring, end conditions) as separate entries.
- **Include additional details if needed:** After the main table, PRDs sometimes include further behavioral notes. E.g., the Classic Battle PRD adds bullet points on tie handling and start conditions. This is optional but can clarify nuanced rules.

> _Example:_ The Classic Battle PRD’s prioritized requirements table lists P1 items like “Random Card Draw,” “Stat Selection Timer,” “Scoring,” and “Match End Condition” with clear descriptions. An AI should expect to see a similar table (or structured list) in any new PRD.

## Acceptance Criteria

- **One entry per requirement or scenario:** Each criterion states a condition that can be _tested_ or observed. Ideally, every P1/P2 feature has at least one acceptance criterion. For example, the Classic Battle PRD pairs its “Stat Selection Timer” requirement with “Player can select a stat within 30 seconds; if not, the system auto-selects a random stat”.
- **Write testable statements:** Use clear language and measurable terms. Good criteria use specific numbers or UI actions (e.g. “loads within 1 second,” “score updates correctly,” “error message appears if…”). The Browse Judoka PRD requires, “The full list of up to 100 judoka cards loads and is visible within 1 second” and “Scrolling rapidly through the card carousel maintains ≥30 fps”.
- **Cover success and failure cases:** Include criteria for normal operation _and_ error states. For instance, several PRDs check for JSON load failures (“display an error message if judoka.json fails to load”) or empty data cases. The Classic Battle PRD even specifies behavior on ties (“If the selected stats are equal, a tie message displays”).
- **Use consistent format:** In JU-DO-KON docs, acceptance criteria are bullet points under a heading like “## Acceptance Criteria”. Each bullet starts with a hyphen and is written in present-tense imperative (e.g. “Cards are revealed…”, “Player can quit…”).

> _Example:_ In the Browse Judoka PRD, acceptance bullets include statements like “If judoka.json has an invalid entry, show a default placeholder card” and “Using keyboard arrow keys moves focus to the next card”. These directly correspond to the features (e.g. data binding, accessibility) and are easily checkable.

## Additional Notes

- **Clarity and Completeness:** A high-quality PRD uses precise wording (no vague terms) and ensures nothing important is omitted. For example, it’s good practice to reference related PRDs (as in “See PRD: Team Battle Rules”) and to link dependencies.
- **Consistency:** Use similar section headings and formatting across PRDs. The existing docs use headings like `## Goals`, `## User Stories`, `## Functional Requirements`, `## Acceptance Criteria`, etc. Replicating these will help agents reliably parse and compare documents.
- **Examples from the codebase:** The Classic Battle PRD (design/productRequirementsDocuments/prdBattleClassic.md) and Browse Judoka PRD (prdBrowseJudoka.md) are good models. Both include a prioritized requirements table followed by a bullet-list of acceptance criteria. AI agents can compare a new PRD against these examples to see if key elements are present.

In summary, **every PRD should spell out its features and how they will be validated**. Check that each functional requirement has an assigned priority and clear description (as in \[33†L55-L64]), and that each has corresponding acceptance criteria (as in \[36†L69-L76]). Missing any of these components indicates a gap in the document. By following these guidelines, AI agents can systematically evaluate PRDs for completeness and readiness for implementation.

**Sources:** Examples and patterns drawn from JU-DO-KON PRDs in `design/productRequirementsDocuments`. These show the preferred format for requirements tables and acceptance criteria.
