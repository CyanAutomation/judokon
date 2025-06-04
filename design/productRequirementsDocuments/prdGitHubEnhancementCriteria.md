---
# 🎴 Ju-Do-Kon! Game Feature Request Criteria (Tailored)

These criteria help ensure each feature or enhancement is clear, player-focused, and easily implementable by the dev team. **Every Ju-Do-Kon! feature request should meet these 5 criteria**:
---

## 1. ✅ **Clear Problem Statement**

> _"What player pain point are we solving, and why does it matter?"_

**What makes it high-quality:**

- Use **plain, simple language** — no tech jargon.
- Focus on the **player** — describe what’s frustrating, confusing, or missing.
- Include a **real-world example** (e.g., _“Players struggle to find judoka from their country because the list is too long.”_).
- State **why this is important now** (e.g., _“Players are spending less time browsing cards.”_).
- No solution proposals here — just the **pain point**.
- If it’s based on playtesting or feedback, **quote or paraphrase** real comments (e.g., _“Players said they want to browse judoka by country.”_).
- Mention if it affects **all players** or a **specific group** (e.g., new players, younger players).
- Highlight the **impact if we don’t solve it** (e.g., _“Players may leave the browse screen quickly, reducing engagement.”_).

🎯 **Tip**: Start with this section in bold or as the first heading in your request.

---

## 2. ✅ **Defined Player Actions and Game Flow**

> _"What player actions trigger this feature, and what happens next?"_

**What makes it high-quality:**

- Clearly list **what the player does** to activate or interact with the feature (e.g., _“Click ‘Browse by Country’ button.”_).
- Define **what happens immediately after** (e.g., _“Flag picker slides in from the side.”_).
- For each action, specify:
  - **Trigger**: What the player does (click, tap, hover).
  - **Outcome**: What they see or experience.
- Note if it’s a **manual action** (e.g., click a button) or **automatic** (e.g., animation auto-starts).
- If there are delays or animations, describe the **timing** (e.g., _“Panel slides in within 300ms.”_).
- If relevant, state **what doesn’t happen** (e.g., _“The screen does not reload — transition is seamless.”_).
- Include a simple **flow diagram** if it helps explain.

🎯 **Tip**: Think of this as an interaction story — _Player does X → Sees Y → Can do Z_.

---

## 3. ✅ **Acceptance Criteria (Observable Outcomes)**

> _"What must players be able to see or do to confirm it’s working?"_

**What makes it high-quality:**

- Use **Given/When/Then** or **simple When/Then** format.
- Each acceptance criterion should describe **a single, testable behavior**.
- Focus on **what the player can observe** — not internal logic.
- Be **specific**:
  - Field names, button labels, screen areas.
  - E.g., _“When player selects a country, only judoka from that country are shown.”_
- Cover:
  - **Happy path** (everything works fine).
  - **Edge cases** (e.g., no judoka found for that country).
- Include **negative conditions** (e.g., _“If the player cancels, no filters are applied.”_).
- Should be **easy to check** in manual testing or playtesting.
- Aim for **3–5 clear acceptance criteria** for medium-complexity features.

🎯 **Tip**: Imagine you’re writing the checklist for the playtesters.

---

## 4. ✅ **Player Settings & Modes (If Applicable)**

> _"Does this feature have any settings or modes the player can control?"_

**What makes it high-quality (if settings apply):**

- Define any **settings or toggles** involved (e.g., _“Enable sound FX”_).
- State **default settings** (e.g., _“Music: ON by default.”_).
- Explain how players **change the setting** (e.g., _“In Settings menu under Audio.”_).
- Describe what happens when switching modes or settings.
- Confirm whether the setting is **saved between sessions** (e.g., saved in localStorage).
- Note any **restrictions** (e.g., _“Dark mode not available in mobile view.”_).

🎯 **Tip**: _Only include this section if your feature adds or modifies a player setting._

---

## 5. ✅ **Agreed Visuals or UX Reference**

> _"What should it look like and how should it feel?"_

**What makes it high-quality:**

- Provide a **wireframe**, **mockup**, or even a **sketch**.
- Show the **key screens** or **interactions** (e.g., _“Here’s how the flag picker will look.”_).
- If animations are involved, describe **speed**, **easing**, or **style** (e.g., _“Fast slide-in, 300ms, ease-out.”_).
- Mention if it **reuses existing UI components**.
- If helpful, include a **short video or GIF reference** of a similar interaction from another game.
- Define **basic visual rules** (e.g., _“Flags arranged in a grid, responsive layout, tap target ≥ 48px.”_).
- Avoid full-blown architecture diagrams — just **player-facing visuals** and **UX flows**.

🎯 **Tip**: _One or two simple visuals go a long way in avoiding misunderstandings._

---

# 📋 Ju-Do-Kon! Feature Request Template (Bonus!)

```markdown
# 🎴 Feature Request: [Feature Name]

## 1. Problem Statement

Describe the player pain point, real-world scenario, and why it matters now.

## 2. Player Actions and Game Flow

List player triggers and describe what happens in response.

## 3. Acceptance Criteria

- [ ] Given/When/Then-style observable outcomes.
- [ ] Cover happy paths and edge cases.

## 4. Player Settings (If Applicable)

Explain any new settings or toggles, defaults, and behavior.

## 5. Visuals or UX Reference

Attach wireframes, mockups, or describe key visuals and animations.
```
