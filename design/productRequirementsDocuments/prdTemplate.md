PRD Generation Rule for Game Development (Ju-Do-Kon! Ready)

Goal

Guide the AI assistant to create a detailed, actionable, game-specific PRD in Markdown format based on an initial user prompt. The PRD should be clear, consistent, and detailed enough for a junior developer or junior game designer to understand and implement the feature.

Process

1. Receive Initial Prompt: User provides a short description of the desired feature.

2. Ask Clarifying Questions: Before drafting, the AI must ask clarifying questions to gather detail about:

• Player goals

• Gameplay effects

• Scope, balancing, edge cases

3. Generate PRD: Based on the user’s answers, create a PRD following the structure below.

Clarifying Questions (Game Development Focus)

Adapt questions based on the feature. Key areas to always clarify:

• Problem/Goal: “What player problem or gameplay gap does this feature solve?”

• Core Functionality: “What are the key actions or outcomes expected from this feature?”

• User Stories: “Can you provide player stories? (e.g., As a [player type], I want to [action] so that [benefit].)”

• Gameplay Integration: “How does this feature interact with the core gameplay loop or progression systems?”

• Balancing Considerations: “Does this feature need balancing for difficulty, rarity, reward rate?”

• Acceptance Criteria: “What must be true for this feature to be considered complete?”

• Scope/Boundaries: “Are there specific elements this feature should NOT include?”

• Data Requirements: “What kind of player data, items, or assets does the feature need?”

• Design/UI Considerations: “Are there mockups, art styles, or UX patterns to follow?”

• Edge Cases and Failure States: “What unusual or failure scenarios should we account for?”

• Dependencies: “What existing systems, mechanics, or engines does this feature rely on?”

PRD Structure

The PRD must include the following sections:

1. Introduction / Overview

• Briefly describe the feature.

• State the problem it solves and the goal.

2. Goals

• List specific, measurable objectives in bullet format.

3. User Stories

• User-centered narratives using the structure:

• As a [player type], I want to [do something] so that [benefit].

• Provide at least three examples.

4. Functional Requirements

• List specific behaviors, rules, and conditions.

• Numbered list (FR-1, FR-2, etc.).

• Assign Priority Labels:

• P1: Core, must-have

• P2: Important but not critical

• P3: Optional / nice-to-have

• Example:

• FR-1 (P1): The player must receive a daily login reward at 00:00 UTC reset.

5. Acceptance Criteria

• Clear checklist defining “Done”.

• Example:

• Reward claimable once per day

• Rewards scale progressively over 7 days

• Feature functions on mobile and desktop

6. Non-Goals (Out of Scope)

• Define boundaries so the feature does **not** balloon in scope.
• Do **not** create new colour or typography tokens. Reuse the tokens in
[codeUIDesignStandards.md](../codeStandards/codeUIDesignStandards.md), e.g.
`--color-primary`, `Inter`.
• Large-scale visual redesigns are excluded. Follow existing layout rules,
including the **44&nbsp;px minimum, 48&nbsp;px ideal** tap target sizes from the
UI guide.

7. Design Considerations

• UI/UX notes or links to mockups.

• Art style, theme, or branding guidelines.

• Example:

• Follow Ju-Do-Kon!’s signature card art style (bold vector, clean gradients).

8. Technical Considerations

• Mention technical constraints, APIs, or modules.

• Performance considerations.

9. Dependencies and Integrations

• Identify existing modules or APIs that must be used (e.g., Points,
Player Progression).
• Reference shared UI components that already implement the
**44/48&nbsp;px tap target rule**.
• Apply colour and typography tokens from the UI guide
([codeUIDesignStandards.md](../codeStandards/codeUIDesignStandards.md)) so the
feature visually matches the rest of the game.

10. Edge Cases / Failure States

• Identify unusual, extreme, or broken scenarios.

• How should the system handle them?

• Example:

• If a player misses 3 days, their login reward streak resets to Day 1.

11. Open Questions

• What colour token (e.g., `--color-primary`) best fits this feature?
• Do any typography styles require clarification beyond the defaults in the UI
guide?
• Is a 44&nbsp;px touch target sufficient or is 48&nbsp;px required for this
context?

12. Metadata

• **Author** – PRD creator’s name or team.
• **Last Edited Date** – Use ISO format (YYYY-MM-DD).
• **Target Game Version** – Release number where this feature should land.
• **Related Features** – Link to other PRDs or epics that this work depends on.

Output Requirements

• Format: Markdown (.md)

• Filename: prd[FeatureName].md

Final Instructions

1. DO NOT start implementation — generate the PRD only.

2. Always ask clarifying questions before writing.

3. Take clarifications into account to produce a high-quality PRD.

4. Ensure explicit, junior-developer-friendly language — avoid jargon.

5. Prioritize clarity, player experience, and practical detail.

Example Prompt for the AI

“Please create a PRD for a Daily Login Reward System for Ju-Do-Kon! aimed at encouraging kids to play daily, with progression-based card rewards. Ensure it is actionable for a junior developer.”

Example Clarifying Questions (if needed)

• What kind of cards are rewarded — Common, Epic, or Legendary?

• Should missing a day reset the streak or allow catch-up?

• Should rewards escalate over time?

• Is this feature available to both guest and registered players?
