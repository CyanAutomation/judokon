# 🎴 Ju-Do-Kon! UI Design Document

this is a unified design guide for developers, designers, and PMs working on Ju-Do-Kon!, the browser-based judo-themed collectible card game.

---

## 1. Introduction

### Purpose

This document defines the design system, visual identity, and component rules for building a cohesive, accessible, and delightful UI for Ju-Do-Kon!. It aligns gameplay mechanics, player experience, and brand aesthetics into one reference for frontend implementation.

### Audience

- Frontend Developers
- Designers
- Product Managers

### Technology Stack

- HTML
- CSS
- JavaScript (vanilla)

---

## 2. Design Principles

- **Consistency** – Shared components look and behave similarly across screens.
- **Clarity** – UI elements must clearly communicate purpose and affordance.
- **Responsiveness** – Modern layouts adapt fluidly to screen size (mobile, tablet, desktop).
- **Accessibility** – Keyboard navigation and WCAG AA compliance are mandatory.
- **Delight** – Interface should evoke excitement, mastery, and fantasy of collecting.
- **Progressive Disclosure** – Surface key actions first, reveal detail as needed.
- **Continuity** – Maintain component placement and user flow across breakpoints.
- **Thematic Immersion** – Visual design must reinforce the game’s modern judo and modern dojo theme.
- **Dimensional Clarity** – Layer UI elements using subtle blur, shadows, and spacing to reinforce structure without overwhelming.

---

## 3. Thematic Visual Language

Ju-Do-Kon! is a card battler rooted in modern martial arts and card-collecting fantasy. All UI should reinforce this world:

- **Primary motifs**: Modern dojo interiors, martial arts posters, judo belts, colourful signage, banners, minimalist backgrounds 
- **Textures**: Ink brush strokes, subtle paper grain
- **Emotive palette**: Rarity colours (gold, red, blue), vibrant gradients for card backgrounds
- **Typography**: Strong, readable text with room for character in headings (see Typography section)
- **Layout metaphors**: Game modes accessed through locations on a Japanese village-style map

---

## 4. Colour System

| Token Name            | Hex Code | Usage Example           |
| --------------------- | -------- | ----------------------- |
| `--color-primary`     | #3C5AD6  | Primary buttons, CTAs   |
| `--color-accent`      | #E04F5F  | Warnings, errors        |
| `--color-background`  | #F5F7FA  | Global page background  |
| `--color-surface`     | #FFFFFF  | Modals, cards           |
| `--color-text`        | #1A1A1A  | Headlines, main content |
| `--color-text-muted`  | #4A5055  | Helper text, captions   |
| `--color-placeholder` | #A0A0A0  | Form placeholders       |

### Adaptive Mode Support

Use semantic tokens that adapt to user system preferences:

```css
@media (prefers-color-scheme: dark) {
  --color-surface: #1a1a1a;
  --color-background: #000000;
  --color-text: #ffffff;
}
```

### Rarity Palette

| Rarity    | Background | Border  | Judogi Colour       |
| --------- | ---------- | ------- | --------------- |
| Common    | #1C4B95    | #3C5AD6 | White (#FFFFFF) |
| Epic      | #efaf1b    | #D9910C | Blue (#3C7DC4)  |
| Legendary | #4A5055    | #E5AC1A | Blue (#3C7DC4)  |

---

## 5. Typography

| Use        | Font Stack                      | Size                     | Weight |
| ---------- | ------------------------------- | ------------------------ | ------ |
| H1 (Title) | 'Bungee', system-ui, sans-serif | `clamp(2rem, 5vw, 3rem)` | 700    |
| H2         | system-ui, sans-serif           | 1.5rem                   | 600    |
| Body Text  | system-ui, sans-serif           | 1rem                     | 400    |
| Captions   | system-ui, sans-serif           | 0.875rem                 | 400    |

- **Line height**: 1.5
- **Max line width**: 70ch
- **Font scaling**: Use `rem` and `clamp()` for responsiveness
- **Adaptive support**: Ensure text respects user zoom and OS scaling preferences

---

## 6. Layout & Spacing

- **Grid**: 12-column flexible grid with 16px gutters
- **Spacing Tokens:**

```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
```

- **Shape Guidelines:**
  - Capsules (radius = 50% height) for tab items and pill filters
  - Rectangles with 12px border-radius for cards and modals
  - Use concentric padding logic when nesting components

---

## 7. Iconography

- **Style**: Flat, filled, rounded corners
- **Size**: 24x24px standard
- **Sources**: Heroicons, Feather Icons
- **Usage**: Pair icons with text labels unless universally understood

### Example:

- **Team Battle** → users icon
- **Update Judoka** → edit icon

---

## 8. Core Components

### 8.1 Buttons

| Type      | Style                                      | Purpose              |
| --------- | ------------------------------------------ | -------------------- |
| Primary   | `--color-primary`, white text              | Main CTA             |
| Secondary | White background, `--color-primary` border | Secondary actions    |
| Icon Only | Transparent, icon-centred                  | Compact interactions |

**States:**

- `:hover`: Slight scale-up (1.05x)
- `:active`: Press-down effect
- `:disabled`: 50% opacity, pointer-events: none

### 8.2 Inputs & Dropdowns

- **Padding**: 12px 16px
- **Border-radius**: 6px
- **Focus state**: outline: 2px solid var(--color-primary)
- **Dropdowns**: keyboard navigable with visual focus ring
- **Placeholder**: --color-placeholder
- **Progressive Disclosure**: Reveal advanced options only when necessary

### 8.3 Navigation UI

#### 8.3.1 Top Nav Bar

- Fixed position
- Logo left, menu right
- Solid or translucent background
- Keyboard and screen reader accessible

#### 8.3.2 Japanese Village Map Navigation (Game Mode)

- Each game mode is presented as a location relevant to an interactive Japanese-village style map
- Tappable locations:
  - Classic Battle Dojo
  - Team Battle Hall
  - Judoka Archive
  - Create-a-Card Room
- Hover: subtle glow or bounce animation
- Selection: animate tile (scale-up 1.05x)
- ARIA roles per tile (e.g. role="button", aria-label="Enter Team Battle Hall")

#### 8.3.3 Hierarchical Navigation (Push Flow)

- Use disclosure indicators (chevrons) for deeper flows (e.g. card detail > edit > history)
- Navigation bar must reflect back-navigation target
- Back button uses text label (e.g. "Back to Team")

### 8.4 Cards (Judoka Cards)

- **Aspect Ratio**: 2:3 (e.g. 240x360px)
- **Border-radius**: 12px
- **Layout Zones:**
  - Top Left: Rarity Icon (Epic/Legendary only)
  - Top Right: Weight class (e.g. 63kg)
  - Main Body: Illustrated portrait, simplified cartoon-realistic style
  - Bottom: Stat block (0–10 scale), signature move, judoka name

**Name Styling:**

```html
<span class="firstname">Clarisse</span><span class="surname">Agbegnenou</span>
```

**Stat Display:**

- Vertical bars or number chips
- Colour-coded: red (0–3), yellow (4–7), green (8–10)

**Signature Move Band (Common cards only):**

- Full-width dark blue band #003B88
- Bold yellow move name #fed843
- Left label: “Signature Move:” in dark text

**Card States:**

- Default
- Selected
- Battle Result (Win/Lose glow effect)
- Flipped (progressive disclosure of stats)

### 8.5 Card Carousel

- Horizontal scroll using scroll-snap-x
- Display 3–5 cards at once depending on screen size
- Optional arrow buttons with ARIA labels
- Keyboard Support: Arrow keys scroll by 1 card
- Mobile Support: Swipe with momentum
- Scroll Edge Effects: Apply subtle top/bottom blur when content scrolls beneath nav bar

### 8.6 Modals

- Max width: 600px
- Centered with dimmed backdrop
- “X” close icon for passive modals only
- Save/Continue button right-aligned
- Cancel on the left (warn if unsaved changes)
- Surface layering must elevate modal above all other content visually

### 8.7 Judoka Editor & Code Entry UI

- Fields: Name, country, stats, signature move
- Validation: Code pattern = v1-XXXX-XXXX-XX-#####
- Live Preview: Updates card visually as you edit
- Error Handling: Invalid code = red border + helper text
- Call to Action: “Save Card”

---

## 9. Breakpoints & Device Continuity

| Device  | Min Width | Layout Changes                  |
| ------- | --------- | ------------------------------- |
| Mobile  | 0px       | Stacked layout, bottom tab bar  |
| Tablet  | 768px     | 2-column layout, side drawer    |
| Desktop | 1024px    | Full layout, persistent sidebar |

**Continuity Rule**: Preserve key actions and element groupings across all devices (e.g. Judoka actions grouped together, cards centered). Shared component anatomy (nav bar, card layout, modal structure) must be preserved.

---

## 10. Accessibility Guidelines

- Use semantic HTML: `<button>`, `<nav>`, `<section>`
- Keyboard navigation: Tab order, visible focus ring
- Contrast ratio ≥ 4.5:1
- Use aria-label, role for icons and map tiles
- All modals must trap focus when open
- Ensure all carousel controls are accessible via keyboard and screen reader

---

## 11. Design Tokens

| Token Name         | Value                      | Purpose            |
| ------------------ | -------------------------- | ------------------ |
| `–radius-sm`       | 4px                        | Inputs, badges     |
| `–radius-md`       | 8px                        | Buttons            |
| `–radius-lg`       | 12px                       | Cards, modals      |
| `–shadow-base`     | 0 4px 12px rgba(0,0,0,0.1) | Elevation          |
| `–transition-fast` | all 150ms ease             | Hover, interaction |

---

## 12. Accessibility Testing Checklist

- ✅ Lighthouse accessibility pass (score ≥ 90)
- ✅ Axe DevTools browser extension scan
- ✅ Keyboard-only navigation test
- ✅ Screen reader labels and roles verified
- ✅ Custom contrast checks for card backgrounds

---

## 13. Appendix: Do & Don’t Examples

### Do

- Use colour and icons to show card rarity
- Use clamp() and rem for responsive scaling
- Group actions (e.g. “Update”, “Delete”) next to cards
- Blur scroll edges where overlays intersect scrollable content

### Don’t

- Nest modals inside modals
- Auto-switch tabs after user input
- Rely on colour alone to show stat superiority
- Use sharp edges for elevated surfaces (prefer rounded geometry)

---
