---

# 🎴 Ju-Do-Kon! Game Feature Request Criteria (Tailored)

These criteria help ensure each feature or enhancement is clear, player-focused, and easily implementable by the dev team. **Every Ju-Do-Kon! feature request should meet these 5 criteria**:

---

## 1. ✅ **Clear Problem Statement**

> *"What player pain point are we solving, and why does it matter?"*

**What makes it high-quality:**

- Use **plain, simple language** — no tech jargon.
- Focus on the **player** — describe what’s frustrating, confusing, or missing.
- Include a **real-world example** (e.g., *“Players struggle to find judoka from their country because the list is too long.”*).
- State **why this is important now** (e.g., *“Players are spending less time browsing cards.”*).
- No solution proposals here — just the **pain point**.
- If it’s based on playtesting or feedback, **quote or paraphrase** real comments (e.g., *“Players said they want to browse judoka by country.”*).
- Mention if it affects **all players** or a **specific group** (e.g., new players, younger players).
- Highlight the **impact if we don’t solve it** (e.g., *“Players may leave the browse screen quickly, reducing engagement.”*).

🎯 **Tip**: Start with this section in bold or as the first heading in your request.

---

## 2. ✅ **Defined Player Actions and Game Flow**

> *"What player actions trigger this feature, and what happens next?"*

**What makes it high-quality:**

- Clearly list **what the player does** to activate or interact with the feature (e.g., *“Click ‘Browse by Country’ button.”*).
- Define **what happens immediately after** (e.g., *“Flag picker slides in from the side.”*).
- For each action, specify:
  - **Trigger**: What the player does (click, tap, hover).
  - **Outcome**: What they see or experience.
- Note if it’s a **manual action** (e.g., click a button) or **automatic** (e.g., animation auto-starts).
- If there are delays or animations, describe the **timing** (e.g., *“Panel slides in within 300ms.”*).
- If relevant, state **what doesn’t happen** (e.g., *“The screen does not reload — transition is seamless.”*).
- Include a simple **flow diagram** if it helps explain.

🎯 **Tip**: Think of this as an interaction story — *Player does X → Sees Y → Can do Z*.

---

## 3. ✅ **Acceptance Criteria (Observable Outcomes)**

> *"What must players be able to see or do to confirm it’s working?"*

**What makes it high-quality:**

- Use **Given/When/Then** or **simple When/Then** format.
- Each acceptance criterion should describe **a single, testable behavior**.
- Focus on **what the player can observe** — not internal logic.
- Be **specific**:
  - Field names, button labels, screen areas.
  - E.g., *“When player selects a country, only judoka from that country are shown.”*
- Cover:
  - **Happy path** (everything works fine).
  - **Edge cases** (e.g., no judoka found for that country).
- Include **negative conditions** (e.g., *“If the player cancels, no filters are applied.”*).
- Should be **easy to check** in manual testing or playtesting.
- Aim for **3–5 clear acceptance criteria** for medium-complexity features.

🎯 **Tip**: Imagine you’re writing the checklist for the playtesters.

---

## 4. ✅ **Player Settings & Modes (If Applicable)**

> *"Does this feature have any settings or modes the player can control?"*

**What makes it high-quality (if settings apply):**

- Define any **settings or toggles** involved (e.g., *“Enable sound FX”*).
- State **default settings** (e.g., *“Music: ON by default.”*).
- Explain how players **change the setting** (e.g., *“In Settings menu under Audio.”*).
- Describe what happens when switching modes or settings.
- Confirm whether the setting is **saved between sessions** (e.g., saved in localStorage).
- Note any **restrictions** (e.g., *“Dark mode not available in mobile view.”*).

🎯 **Tip**: *Only include this section if your feature adds or modifies a player setting.*

---

## 5. ✅ **Agreed Visuals or UX Reference**

> *"What should it look like and how should it feel?"*

**What makes it high-quality:**

- Provide a **wireframe**, **mockup**, or even a **sketch**.
- Show the **key screens** or **interactions** (e.g., *“Here’s how the flag picker will look.”*).
- If animations are involved, describe **speed**, **easing**, or **style** (e.g., *“Fast slide-in, 300ms, ease-out.”*).
- Mention if it **reuses existing UI components**.
- If helpful, include a **short video or GIF reference** of a similar interaction from another game.
- Define **basic visual rules** (e.g., *“Flags arranged in a grid, responsive layout, tap target ≥ 48px.”*).
- Avoid full-blown architecture diagrams — just **player-facing visuals** and **UX flows**.

🎯 **Tip**: *One or two simple visuals go a long way in avoiding misunderstandings.*

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