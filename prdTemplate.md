Great — here’s a refactored, production-ready PRD Generation Template for you.
This version includes all the improvements, ready for Ju-Do-Kon! or other game projects.

⸻

📝 PRD Generation Rule for Game Development (Ju-Do-Kon! Ready)

⸻

description:
globs:
alwaysApply: false

Rule: Generate a Product Requirements Document (PRD) for Game Features

Goal

Guide the AI assistant to create a detailed, actionable, game-specific PRD in Markdown format, based on an initial user prompt.
The PRD should be clear, consistent, and detailed enough for a junior developer or junior game designer to understand and implement the feature.

Process
	1.	Receive Initial Prompt: User provides a short description of the desired feature.
	2.	Ask Clarifying Questions: Before drafting, the AI must ask clarifying questions to gather detail about:
	•	Player goals
	•	Gameplay effects
	•	Scope, balancing, edge cases
	3.	Generate PRD: Based on the user’s answers, create a PRD following the structure below.
	4.	Save PRD: Save the file as prd-[feature-name].md inside the /tasks/ directory.

⸻

Clarifying Questions (Game Development Focus)

Adapt questions based on the feature. Key areas to always clarify:
	•	Problem/Goal: “What player problem or gameplay gap does this feature solve?”
	•	Target Player: “Who is the primary user? (e.g., casual players, competitive players, young players)”
	•	Core Functionality: “What are the key actions or outcomes expected from this feature?”
	•	User Stories: “Can you provide player stories? (e.g., As a [player type], I want to [action] so that [benefit].)”
	•	Gameplay Integration: “How does this feature interact with the core gameplay loop or progression systems?”
	•	Balancing Considerations: “Does this feature need balancing for difficulty, rarity, reward rate?”
	•	Acceptance Criteria: “What must be true for this feature to be considered complete?”
	•	Scope/Boundaries: “Are there specific elements this feature should NOT include?”
	•	Data Requirements: “What kind of player data, items, or assets does the feature need?”
	•	Design/UI Considerations: “Are there mockups, art styles, or UX patterns to follow?”
	•	Edge Cases and Failure States: “What unusual or failure scenarios should we account for?”
	•	Dependencies: “What existing systems, mechanics, or engines does this feature rely on?”
	•	Success Metrics / KPIs: “How will we measure if the feature is successful? (e.g., retention, session length)”

⸻

PRD Structure

The PRD must include the following sections:

⸻

1. Introduction / Overview
	•	Briefly describe the feature.
	•	State the problem it solves and the goal.
	•	Specify the intended player experience or emotion (e.g., excitement, progression, collection joy).

⸻

2. Goals
	•	List specific, measurable objectives.
	•	Bullet format.

⸻

3. User Stories
	•	User-centered narratives using the structure:
As a [player type], I want to [do something] so that [benefit].
	•	Provide at least three examples.

⸻

4. Functional Requirements
	•	List specific behaviors, rules, and conditions.
	•	Numbered list (FR-1, FR-2, etc.).
	•	Assign Priority Labels:
	•	P1: Core, must-have
	•	P2: Important but not critical
	•	P3: Optional / nice-to-have
	•	Example:
FR-1 (P1): The player must receive a daily login reward at 00:00 UTC reset.

⸻

5. Acceptance Criteria
	•	Clear checklist defining “Done”.
	•	Example:
	•	Reward claimable once per day
	•	Rewards scale progressively over 7 days
	•	Feature functions on mobile and desktop

⸻

6. Non-Goals (Out of Scope)
	•	Explicitly list what is NOT included.
	•	Prevents scope creep.

⸻

7. Design Considerations
	•	UI/UX notes or links to mockups.
	•	Art style, theme, or branding guidelines.
	•	Example:
Follow Ju-Do-Kon!’s signature card art style (bold vector, clean gradients).

⸻

8. Technical Considerations
	•	Mention technical constraints, APIs, or modules.
	•	Performance considerations if relevant.

⸻

9. Dependencies and Integrations
	•	List any systems the feature depends on.
e.g., Inventory System, Player Progression System, Currency System

⸻

10. Success Metrics / KPIs
	•	How will success be measured?
	•	Include at least one player behavior metric and one technical metric.
	•	Example:
	•	5% increase in D1 retention
	•	99.5% uptime for reward claim service

⸻

11. Edge Cases / Failure States
	•	Identify unusual, extreme, or broken scenarios.
	•	How should the system handle them?
	•	Example:
If a player misses 3 days, their login reward streak resets to Day 1.

⸻

12. Open Questions
	•	Remaining uncertainties or decisions still needed.

⸻

13. Metadata
	•	Author
	•	Last Edited Date
	•	Target Game Version
	•	Related Features (if any)

⸻

Output Requirements
	•	Format: Markdown (.md)
	•	Location: /tasks/
	•	Filename: prd-[feature-name].md

⸻

Final Instructions
	1.	DO NOT start implementation — generate the PRD only.
	2.	Always ask clarifying questions before writing.
	3.	Take clarifications into account to produce a high-quality PRD.
	4.	Ensure explicit, junior-developer-friendly language — avoid jargon.
	5.	Prioritize clarity, player experience, and practical detail.

⸻

✅ Example Prompt for the AI

“Please create a PRD for a Daily Login Reward System for Ju-Do-Kon! aimed at encouraging kids to play daily, with progression-based card rewards. Ensure it is actionable for a junior developer.”

⸻

✅ Example Clarifying Questions (if needed)
	•	What kind of cards are rewarded — Common, Epic, or Legendary?
	•	Should missing a day reset the streak or allow catch-up?
	•	Should rewards escalate over time?
	•	Is this feature available to both guest and registered players?

⸻

Would you like me to also create a few example outputs — like a PRD for a “Daily Login Reward System” or “Deck Builder Feature” — so you can test this template in action? 🚀