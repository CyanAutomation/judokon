# Material Design v1 – Reference Guide for JU-DO-KON

**Purpose:**
This document encapsulates the _relevant_ principles and patterns of **Google’s Material Design v1 (2014–2017)** — adapted for use within the JU-DO-KON! project.
AI agents can use this guide to evaluate existing layouts (e.g. `battleClassic.html`) or propose visual, structural, and interactive improvements that align with Material v1’s spirit while maintaining JU-DO-KON!’s distinctive judo-themed style.

---

## 1. Core Philosophy

**Material is a metaphor.**
The interface should behave like a unified, tactile world made of layers of “digital paper.” Surfaces have depth, cast shadows, and move in response to user interaction. Motion is meaningful and guides attention.

**Primary principles:**

- **Material surfaces** are solid and consistent; they don’t merge or bend.
- **Lighting and shadows** communicate hierarchy and focus.
- **Motion** links cause and effect — interactions feel grounded in physics.
- **Bold, graphic, intentional** visual language creates clarity and confidence.

For JU-DO-KON!: use surfaces and elevation to create hierarchy between zones — e.g. the **battlefield**, **scoreboard**, and **player card** areas.

---

## 2. Layout & Structure

Material v1 defines a _consistent spatial rhythm_ and _grid logic_.

| Principle             | Material v1 Guidance                                                         | JU-DO-KON! Application                                                         |
| --------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| **Grid unit**         | 8 dp baseline grid for spacing, padding, and component sizing                | Maintain 8 px multiples for padding, card margins, and button gaps             |
| **Breakpoints**       | Responsive breakpoints at 360 dp (mobile), 600 dp (tablet), 960 dp (desktop) | Classic Battle desktop view aligns with 960 dp grid; scale down proportionally |
| **Margins & Gutters** | Default 16 dp gutters, 24 dp for wider screens                               | Use consistent gutters between player panels and the card area                 |
| **Toolbar height**    | 56 dp (standard), 64 dp (desktop)                                            | For game headers or mode titles                                                |
| **Keylines**          | Align content to invisible keylines that maintain order                      | Anchor card decks and buttons to common axes to maintain visual rhythm         |

**Agent evaluation tip:**
Check if components align on an 8 px grid, and whether the visual hierarchy of surfaces is clear and consistent across screen sizes.

---

## 3. Color System

Material v1 colour theory centres on _bold primaries_ and _contrasting accents_.

| Role                   | Guidance                                                          | JU-DO-KON! Adaptation                                           |
| ---------------------- | ----------------------------------------------------------------- | --------------------------------------------------------------- |
| **Primary colour**     | Defines app identity and toolbar/header                           | Use JU-DO-KON!’s rarity blue or red tier colours as primaries   |
| **Accent colour**      | Highlights key interactive elements (FABs, icons, action buttons) | Use contrast hues (yellow or white) for calls to action         |
| **Background**         | Light neutral base for readability                                | Maintain neutral slate/grey backgrounds in battle screens       |
| **Elevation overlays** | Higher layers use lighter or darker tints to separate planes      | Adjust card and modal contrast with opacity or shadow intensity |

**Contrast ratios:**
Text should maintain at least **4.5:1** contrast against its background.

**Agent evaluation tip:**
Confirm colour choices maintain visual consistency and adequate contrast, and that the visual hierarchy (primary > accent > background) is respected.

---

## 4. Typography

Typography in Material v1 establishes hierarchy through **scale, weight, and colour**, not decorative typefaces.

| Level       | v1 Name   | Size             | Weight                                        | Example Usage in JU-DO-KON! |
| ----------- | --------- | ---------------- | --------------------------------------------- | --------------------------- |
| Display 1–4 | 112–34 sp | Light            | Main game title (“JU-DO-KON!”)                |                             |
| Headline    | 24 sp     | Regular          | Mode header (“Classic Battle”)                |                             |
| Title       | 20 sp     | Medium           | Section labels (“Your Card”, “Opponent Card”) |                             |
| Subhead     | 16 sp     | Regular          | Descriptive text under icons                  |                             |
| Body 1 / 2  | 14 sp     | Regular / Medium | Card stats, rules                             |                             |
| Caption     | 12 sp     | Regular          | Footer hints, timers                          |                             |

**Font:** _Roboto_ or any geometric sans-serif (e.g. Inter).
Use consistent typographic rhythm (4 px baseline increments).

**Agent evaluation tip:**
Assess whether text hierarchy is clear (titles stand out, body is readable), and spacing between text blocks follows the baseline grid.

---

## 5. Components & Interaction Patterns

Material v1 introduced standardized components — reusable visual blocks that carry consistent behaviour.

| Component                        | Material Function                                 | JU-DO-KON! Equivalent / Guidance                              |
| -------------------------------- | ------------------------------------------------- | ------------------------------------------------------------- |
| **Card**                         | Self-contained container with elevation 1–8 dp    | Judoka stat cards — apply soft shadows and consistent margins |
| **Raised Button**                | Primary action, elevation 2–4 dp                  | “Fight”, “Next Round”, “View Stats”                           |
| **Flat Button**                  | Secondary or non-critical actions                 | “Cancel”, “Settings”                                          |
| **Floating Action Button (FAB)** | Single high-importance action (6–12 dp elevation) | Optional “Start Battle” on landing screen                     |
| **Snackbar / Toast**             | Temporary feedback at bottom                      | “Round Won!” notifications                                    |
| **Dialog / Modal**               | Interruptive, requires user choice                | Result screen, confirmation prompts                           |
| **Navigation Drawer / Tabs**     | Global navigation                                 | Mode switchers (Classic / Quick / Meditation)                 |

**Agent evaluation tip:**
Check consistency of elevation and motion. A FAB or card should animate smoothly and feel physically separate from the background.

---

## 6. Elevation & Shadows

Elevation defines _layer depth_. Each component has a z-axis value (dp). Shadows visually communicate depth and focus.

| Level  | Component Type          | Shadow Style                 |
| ------ | ----------------------- | ---------------------------- |
| 0 dp   | Background              | None                         |
| 1–2 dp | Cards, toolbars         | Soft shadow, slight offset   |
| 4 dp   | Raised buttons          | Deeper shadow                |
| 8 dp   | Dialogs, modals         | Noticeable elevation         |
| 12 dp+ | FAB, temporary surfaces | Strong shadow, higher offset |

**Lighting direction:** top-left by default.
**Motion:** elevation increases during interaction (e.g., button press → animate 2dp → 8dp → return).

**Agent evaluation tip:**
Audit all visual surfaces — ensure elevation hierarchy matches functional hierarchy (dialogs above cards, cards above background).

---

## 7. Motion & Animation

Motion in Material v1 reinforces continuity and intent — _how elements appear, change, and disappear matters_.

| Motion Principle            | Guidance                                | Application in JU-DO-KON!                          |
| --------------------------- | --------------------------------------- | -------------------------------------------------- |
| **Authentic motion**        | Objects accelerate/decelerate naturally | Card flips or battle transitions use easing curves |
| **Ease in/out**             | “Fast-out, slow-in” curve               | Buttons and modals open smoothly                   |
| **Duration**                | 200–300 ms typical                      | Match transitions between rounds or dialogs        |
| **Meaningful choreography** | Motion indicates cause and destination  | Winning card expands, losing card fades            |

**Agent evaluation tip:**
Flag any motion that feels abrupt, directionless, or inconsistent in duration. Movement should always indicate state change or outcome.

---

## 8. Interaction Feedback

Every interactive element provides immediate visual or tactile feedback.

- **Ripple effect**: on click/tap.
- **Hover states**: subtle elevation or colour change.
- **Pressed states**: brief increased shadow or tint.
- **Disabled states**: reduced opacity (40–50%).

**Agent evaluation tip:**
Identify missing or inconsistent feedback states — particularly in buttons, card selections, and round transitions.

---

## 9. Accessibility & Responsiveness

Material v1 established early accessibility baselines:

- **Minimum touch target:** 48 × 48 dp.
- **Readable type sizes:** ≥ 12 sp.
- **Contrast:** 4.5:1 or higher.
- **Responsive scaling:** maintain proportions on tablet/desktop.

**Agent evaluation tip:**
Ensure all interactive elements meet size and contrast thresholds. Check responsiveness in both full and compact views.

---

## 10. Application within JU-DO-KON

Material v1 should be treated as a _visual and interaction vocabulary_ — not a constraint.
JU-DO-KON!’s judo-inspired aesthetic can coexist with Material principles by focusing on:

- **Surface logic:** cards and panels with defined elevation.
- **Colour discipline:** bold primaries, clear accents.
- **Grid rhythm:** consistent 8 px spacing.
- **Meaningful motion:** transitions that convey cause and effect.
- **Feedback clarity:** user actions always acknowledged.

**Example agent tasks:**

- Evaluate if Classic Battle layout uses consistent 8 px spacing and clear elevation.
- Suggest if the scoreboard could use elevation or card-like framing.
- Check colour contrast and text hierarchy against Material v1 rules.
- Recommend motion or animation enhancements based on “authentic motion” principles.

---

## References

- [Material Design v1 Archive (m1.material.io)](https://m1.material.io)
- Google Material Design Specification (2014–2017)
- Adapted for JU-DO-KON! Design System — © 2025

---
