# 🎴 Ju-Do-Kon! UI Design Document

This unified design guide is for developers, designers, and PMs building **Ju-Do-Kon!**, the web-based judo-themed collectible card game. It combines visual identity, interaction design, and component rules into a single reference.

---

## 1. Introduction

### Purpose

This document defines the UI foundations for Ju-Do-Kon! It supports:

- Consistent design language across screens
- Responsive and accessible UI implementation
- Clear feedback, immersion, and touch-first interaction

### Audience

- Frontend Developers
- UI/UX Designers
- Product Managers

### Stack

- HTML, CSS, Vanilla JavaScript

---

## 2. Design Principles

- **Touch-first Interaction** – Minimum 44x44px targets, swipeable areas, and tap feedback.
- **Responsive Feedback** – Every interaction must give feedback (scale, glow, ripple, animation).
- **Visual Hierarchy** – Layout must surface the most important info and reinforce progression.
- **Progressive Disclosure** – Show only essential actions up front; reveal detail as needed.
- **Thematic Immersion** – UI should reflect modern judo dojo themes and collectible energy.
- **Consistency** – Reuse shared UI patterns to improve familiarity.
- **Accessibility** – WCAG AA, keyboard navigation, screen reader support.
- **Continuity** – Layout and navigation must remain familiar across breakpoints.
- **Momentum** – Game flow must feel lively and animated, especially for kids.

---

## 3. Thematic Visual Language

- **Motifs**: Judo dojo interiors, martial arts posters, tatami textures, light grey cards, monochrome line UI, soft shadows
- **Textures**: Subtle grain, brush ink strokes
- **Palette**: Muted greys, soft whites, dark accents for labels and icons. Cards maintain vibrant rarity colours.
- **Typography**: Bold headlines, readable body
- **Layout Metaphor**: Navigation is themed as rooms within a dojo or Japanese map

---

## 4. Colour System

| Token Name          | Hex Code | Use                   |
| ------------------- | -------- | --------------------- |
| `--color-primary`   | #CB2504  | Buttons, highlights   |
| `--color-secondary` | #0C3F7A  | Nav bar, stat blocks  |
| `--color-tertiary`  | #E8E8E8  | Backgrounds, outlines |

### Rarity Colours

| Rarity    | Background | Border  | Judogi Colour  |
| --------- | ---------- | ------- | -------------- |
| Common    | #3C5AD6    | #3C5AD6 | White (#FFF)   |
| Epic      | #C757DA    | #C757DA | Blue (#3C7DC4) |
| Legendary | #E4AB19    | #E4AB19 | Blue (#3C7DC4) |

> ⚠️ **Note:** Judoka cards retain their bright, vibrant, distinct colour palette and styling. They are visually separate from the muted, modern dojo-themed UI shell.

### Dark Mode Support

Use semantic tokens for adaptive styling with `prefers-color-scheme`.

---

## 5. Typography

| Role        | Font           | Size    | Weight  |
| ----------- | -------------- | ------- | ------- |
| Headings    | League Spartan | 32–40px | Bold    |
| Body Text   | League Spartan | 16px    | Regular |
| Stat Labels | Noto Sans      | 14px    | Bold    |
| Small Text  | Noto Sans      | 12px    | Medium  |

- Line-height: 1.4× font size
- Letter-spacing: 0.5% (League Spartan), normal (Noto Sans)
- Avoid using all caps in body text for readability

---

## 6. Layout & Spacing

- Grid: 12-column with 16px gutter
- Stack: Responsive vertical stacking on mobile
- Containers: Soft drop shadows and generous whitespace

### Spacing Tokens

```css
--space-xs: 4px;
--space-sm: 8px;
--space-md: 16px;
--space-lg: 24px;
--space-xl: 32px;
```

- Border Radius:
  - Pills: `radius = 50% height`
  - Cards/Modals: 12px rounded corners

---

## 7. Iconography

- Style: Monochrome, flat, rounded, minimal detail
- Size: 24x24px standard
- Icon + label combinations always visible
- Button icons sit left of labels with consistent padding
- Footer navigation must avoid label truncation

---

## 8. Components

### 8.1 Buttons

**All components must visually align to the light UI aesthetic: white/grey surfaces, black or dark text, and clean separation from the colourful judoka cards.**

| Type      | Style                         | Use                  |
| --------- | ----------------------------- | -------------------- |
| Primary   | `--color-primary`, white text | Main CTA             |
| Secondary | White bg, primary border      | Minor action         |
| Icon-only | Transparent background        | Compact interactions |

**States**:

- Hover: scale 1.05x
- Active: depress animation
- Disabled: 50% opacity
- Tap Feedback: ripple/scale + color tint

**Sizing**:

- Small, Medium, Large
- Edge-aware padding for mobile reach zones

**Contextual Showcase**:

- Capsule in HUD
- Fixed button in footer bar

### 8.2 Inputs

- Padding: 12px 16px
- Border-radius: 6px
- Real-time validation indicator
- Focus: 2px solid primary
- Placeholder: muted colour

### 8.3 Navigation

#### Top Bar

- Fixed, screen reader accessible
- Logo left, menu right

#### Map Navigation (Game Mode Rooms)

- Tappable map tiles
- On hover: glow or scale effect
- On select: animate tile (scale up)
- Label + icon (e.g. 💪 BATTLE!)
- Role: `button`, with ARIA labels

#### Footer Nav

- Always visible
- Icon + label pairs
- Clear active/focus state
- Do not truncate labels

### 8.4 Judoka Cards

- Aspect Ratio: 2:3
- Zones:
  - Top Left: Rarity (Epic/Legendary only)
  - Top Right: Weight Class
  - Portrait: Stylized illustration
  - Stat Block: 0–10 scale bars or chips
  - Signature Move: Common cards only

**Stat Colour Codes**:

- 0–3: Red
- 4–7: Yellow
- 8–10: Green

**Interactions**:

- Tap = slide/reveal stats
- Hover = slight scale and shadow
- Selection = glow + checkmark
- Win/Lose state = animation glow

### Card Design Rules

#### Name Formatting

- **First Name**: Smaller, sentence case
- **Surname**: Larger, uppercase, bold
- **Font**: League Spartan (both)

#### Stat Area

- **Alignment**: Stat block always bottom-aligned
- **Background**: Dark blue (#0C3F7A)
- **Font**: Noto Sans, bold

#### Signature Move Band (Common Cards)

- **Background**: #003B88
- **Text**: Yellow (#FED843), left-aligned label + centered move name

#### Rarity Markers

- **Epic and Legendary Only**: Icon appears only on these tiers
- **Placement**: Top-left of portrait area
- **Templates**: Use standard templates only

#### Portrait Area

- **Style**: Vector cartoon-realism
- **Background**: Clean, warm gradient (non-radial)
- **Judogi Colour**: Blue judogi for Epic/Legendary (Pantone 285M, #3C7DC4)

#### Interactions

- **Hover**: Slight scale and shadow
- **Tap**: Slide/reveal stats
- **Selection**: Glow + checkmark
- **Win/Lose State**: Animation glow

### 8.5 Card Carousel

- Horizontal scroll with scroll-snap-x
- Shows 3–5 cards depending on screen size
- Central card slightly zoomed
- Dot pagination below
- Arrow buttons with ARIA labels
- Swipe and keyboard navigation
- Scroll-edge blur to signal limits

### 8.6 Modals

- Max Width: 600px
- Centered with dim backdrop
- Cancel (left), Save/Continue (right)
- Action buttons always visible on mobile
- Confirmation toast on Save

### 8.7 Judoka Editor

- Input sliders or steppers for stats (0–10)
- Live card preview (collapsible on mobile)
- Signature move: dropdown select
- Inline error messages
- Sticky footer bar: Cancel + Save

---

## 9. Game States

- **Score Display**: animated number flip
- Carousel and stat feedback use scale and blur motion rather than bright flashes
- **Result Feedback**: WIN/LOSE/DRAW overlay flashes (green/red/grey)
- **Next Round**: loader + bounce CTA
- **Stat Selection**:
  - Tap = highlight + glow
  - Lock others on pick

---

## 10. Accessibility

- Use semantic HTML tags
- All buttons must be keyboard reachable
- Minimum contrast ratio: 4.5:1
- Carousel: swipe, arrow key, screen reader friendly
- Modals must trap focus when open

---

## 11. Tokens

| Token Name          | Value                      | Purpose        |
| ------------------- | -------------------------- | -------------- |
| `--radius-sm`       | 4px                        | Inputs, badges |
| `--radius-md`       | 8px                        | Buttons        |
| `--radius-lg`       | 12px                       | Cards, modals  |
| `--shadow-base`     | 0 4px 12px rgba(0,0,0,0.1) | Elevation      |
| `--transition-fast` | all 150ms ease             | UI animations  |

---

## 12. Accessibility Checklist

- [x] Lighthouse score ≥ 90
- [x] Axe DevTools pass
- [x] Tab navigation test
- [x] Screen reader roles
- [x] High-contrast checks for card backgrounds

---

## 13. Do & Don’t

### Do

- Use ripple/tap feedback on all interactive items
- Animate card state transitions
- Collapse panels for mobile
- Show button states clearly in context
- UI components adopt a restrained, modern, grayscale palette to increase the impact of vibrant judoka cards. This separation helps keep the core game interface accessible, readable, and immersive, without visual overload.

### Don’t

- Assume hover = feedback
- Use label-only icons
- Truncate button labels
- Leave score/result transitions static

---

## 14. Branding Aspects

#### Logos & Emblems

- **Full Logo**:
  - Horizontal and stacked versions available
  - Use on light/dark backgrounds with proper spacing
  - Minimum size and safe zones must be respected
- **SHIHO Emblem**:
  - Represents endless knot → replayability & balance
  - Usage rules:
    - Do not rotate, stretch, recolour, or overlay on complex backgrounds
    - Use emblem only in secondary branding contexts

#### Cultural Respect

- **Japanese Aesthetics**:
  - Incorporate nods to traditional Japanese design elements (e.g., tatami textures, brush ink strokes)
  - Avoid cultural misrepresentation or overuse of stereotypes
- **Martial Values**:
  - Reflect judo principles like balance, respect, and mastery in UI interactions

#### Visual Identity

- **High-Energy Design**:
  - Bold, modular, and fast-moving interfaces
  - Use vibrant colours sparingly to highlight key actions or elements
- **Fun-First Approach**:
  - Ensure interactions feel snappy and playful
  - Maintain a kid-friendly tone with clear, accessible visuals
