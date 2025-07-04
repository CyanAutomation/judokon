# Ju-Do-Kon! UI Design Standards

This unified design guide is for developers, designers, and PMs building **Ju-Do-Kon!**, the web-based judo-themed collectible card game. It combines visual identity, interaction design, and component rules into a single reference.

---

## 1. Purpose

This document defines the **visual identity**, **component rules**, and **interaction principles** used throughout Ju-Do-Kon!'s user interface. It ensures the experience is:

- Visually consistent
- Game-appropriate for ages 8–12
- Optimised for both desktop and mobile
- Scalable and maintainable for future features

---

## 2. Design Language

### 2.1 Overview

Ju-Do-Kon! uses a **bold, high-contrast design system** grounded in clear hierarchy, playful colour, and expressive character visuals.

#### Key Visual Themes

- Flat colour + geometric background textures
- Layered judoka cards
- Emphasis typography (caps, bold, white-on-colour)
- Panelled layout with z-depth and modular sections

### 2.2 Design Principles

- **Touch-first Interaction** – Minimum 44x44px targets, swipeable areas, and tap feedback (see sizing tokens in [Tokens](#10-tokens)).
- **Responsive Feedback** – Every interaction must give feedback (scale, glow, ripple, animation).
- **Visual Hierarchy** – Layout must surface the most important info and reinforce progression.
- **Progressive Disclosure** – Show only essential actions up front; reveal detail as needed.
- **Consistency** – Reuse shared UI patterns to improve familiarity.
- **Accessibility** – WCAG AA, keyboard navigation, screen reader support.
- **Continuity** – Layout and navigation must remain familiar across breakpoints.
- **Momentum** – Game flow must feel lively and animated.

---

## 3. Colour System

### Core Strategy

| Token Name          | Hex Code | Use                       |
| ------------------- | -------- | ------------------------- |
| --color-primary     | #CB2504  | Buttons, highlights       |
| --color-secondary   | #0C3F7A  | Nav bar, stat blocks      |
| --color-tertiary    | #E8E8E8  | Backgrounds, outlines     |
| --button-bg         | #CB2504  | Primary button background |
| --button-hover-bg   | #0B5BB0  | Hover state for buttons   |
| --button-active-bg  | #0C3F7A  | Active button state       |
| --button-text-color | #FFFFFF  | Button text               |

The hex values above correspond to CSS custom properties used throughout the project. See [Tokens](#10-tokens) for the complete list.

### Rarity Colours

| Rarity    | Background | Border  | Judogi Colour  |
| --------- | ---------- | ------- | -------------- |
| Common    | #3C5AD6    | #3C5AD6 | White (#FFF)   |
| Epic      | #C757DA    | #C757DA | Blue (#3C7DC4) |
| Legendary | #E4AB19    | #E4AB19 | Blue (#3C7DC4) |

⚠️ **Note:** Judoka cards retain their bright, vibrant, distinct colour palette and styling. They are visually separate from the muted, modern dojo-themed UI shell.

Each **game mode or feature area** is assigned a **unique dominant colour**, creating intuitive navigation through visual identity.

| Feature / Mode | Colour  | Notes                     |
| -------------- | ------- | ------------------------- |
| Classic Battle | #E53935 | High-energy, competitive  |
| Team Battle    | #8E24AA | Cooperative and strategic |
| Update Judoka  | #00897B | Constructive, calm        |
| Browse Judoka  | #3949AB | Archival, structured      |
| Meditation     | #F9A825 | Calm, reflective          |

### Gradient & Texture Usage

- Use **linear gradients** or **subtle diagonal patterns** in background areas.
- Avoid visual clutter; keep texture light and geometric.

---

## 4. Typography

### Font Family

- **Primary:** `Inter`, `Montserrat`, or `League Spartan`
- Geometric, sans-serif, and legible across screen sizes

### Typographic Hierarchy

| Element            | Style                   | Notes                       |
| ------------------ | ----------------------- | --------------------------- |
| Section Titles     | ALL CAPS, Bold, Large   | Use tracking for emphasis   |
| Action Buttons     | Uppercase, Bold         | Primary CTA focus           |
| Judoka Surnames    | Bold, Uppercase, Larger | E.g. ONO                    |
| Judoka First Names | Light, Small caps       | E.g. Shohei                 |
| Supporting Info    | Light, Small            | Country, Weight class, etc. |

### Contrast & Readability

- Always meet **WCAG AA** contrast.
- Pair bold white or black text against vibrant fills for CTAs and banners.
- Line-height: 1.4× font size
- Letter-spacing: 0.5% (League Spartan), normal (Noto Sans)
- Avoid using all caps in body text for readability
- Use the **Pa11y** CLI (`npm run check:contrast`) to validate contrast on the running site at http://localhost:5000

---

## 5. Imagery & Iconography

### Judoka Cards

- Use **cut-out portrait art** with:
  - Clean edges
  - Expressive poses
  - Subtle drop shadows for pop

### Overlay & Layering

- Characters should visually **layer over** their background panels.
- Use drop shadows and blur behind portraits to aid depth.

---

## 6. Visual Hierarchy

### Structure by Importance

- **Rarity tiers**, **modes**, and **ranking** must be reflected visually:
  - Size (larger for higher status)
  - Colour weight
  - Position (centre/focus)

### Panels & Sections

- Use **boxes**, **lines**, or **alternating backgrounds** to group content.
- Example: a vertical list of modes should use clearly segmented tiles.

### Z-Index & Elevation

- Cards and CTAs should visually **pop forward** from the backdrop.
- Use blur, scale, or shadow to indicate interactivity.

---

## 7. Grid & Layout System

### Grid System

- Use a **4-column responsive grid**
- Align all components to the grid baseline
- Stack: Responsive vertical stacking on mobile
- Containers: Soft drop shadows and generous whitespace

### Spacing Scale

- Use **8px** rhythm (8, 16, 24, 32, 40, etc.)
- Apply consistent **padding/margin** values across blocks.
- Spacing values correspond to the tokens listed in [Tokens](#10-tokens).

### Modular Blocks

- Design core layout with **reusable modules**:
  - Card Viewer Block
  - Mode Selector Tiles
  - Quote Panel
  - Trivia Display
  - Gallery Carousel

### Alignment Patterns

- **Centre-aligned** for single CTAs or title areas
- **Left-aligned** for judoka info and ranking blocks
- Use **background diagonals** or geometry for layout anchoring

---

## 8. Component Examples

### 8.1 Overview

| Component            | Features                                                                    |
| -------------------- | --------------------------------------------------------------------------- |
| Card Carousel        | 3–5 visible cards, scroll snap, swipe area, visual edge indicators          |
| Mode Selection Panel | Bold icon + label tiles, hover/press feedback, stacked vertically on mobile |
| Create/Edit Modal    | Floating modal, left-aligned Cancel + right-aligned Save, live card preview |
| Meditation Screen    | Language toggle, fade transition, vertical CTA separation                   |
| Landing Header       | Judoka illustration overlay, game logo, dynamic mode buttons                |

### 8.2 Navigation

#### Top Bar

- Fixed, screen reader accessible
- Logo left, menu right

#### Map Navigation (Game Mode Locations)

- Tappable map tiles
- On hover: glow or scale effect
- On select: animate tile (scale up)
- Label + icon (e.g. 💪 BATTLE!)
- Role: button, with ARIA labels

#### Footer Nav

- Always visible
- Icon + label pairs
- Inline icons use Material Symbols SVGs with `viewBox="0 -960 960 960"`.
- Clear active/focus state
- Do not truncate labels

### 8.3 Judoka Cards

#### Aspect Ratio

- 2:3

#### Zones

- Top Left: Rarity (Epic/Legendary only)
- Top Right: Weight Class
- Portrait: Stylized illustration
- Stat Block: 0–10 scale bars or chips
- Signature Move: Common cards only

#### Stat Colour Codes

- 0–3: Red
- 4–7: Yellow
- 8–10: Green

#### Interactions

- Tap = slide/reveal stats
- Hover = slight scale and shadow
- Selection = glow + checkmark

#### Name Formatting

- First Name: Smaller, sentence case
- Surname: Larger, uppercase, bold
- Alignment: Stat block always bottom-aligned
- Background: Dark blue (#0C3F7A)

#### Signature Move Band (Common Cards)

- Background: #003B88
- Text: Yellow (#FED843), left-aligned label + centered move name

#### Rarity Markers

- Epic and Legendary Only: Icon appears only on these tiers
- Placement: Top-left of portrait area

#### Portrait Area

- Style: Vector cartoon-realism
- Background: Clean, warm gradient (non-radial)
- Judogi Colour: Blue judogi for Epic/Legendary (Pantone 285M, #3C7DC4)

### 8.4 Card Carousel

- Horizontal scroll with scroll-snap-x
- Shows 3–5 cards depending on screen size
- Central card slightly zoomed
- Dot pagination below
- Arrow buttons with ARIA labels
- Swipe and keyboard navigation
- Scroll-edge blur to signal limits

### 8.5 Modals

- Max Width: 600px
- Centered with dim backdrop
- Cancel (left), Save/Continue (right)
- Action buttons always visible on mobile
- Confirmation toast on Save

### 8.6 Judoka Editor

- Input sliders or steppers for stats (0–10)
- Live card preview (collapsible on mobile)
- Signature move: dropdown select
- Sticky footer bar: Cancel + Save

### 8.7 Button Style

- Default: `var(--button-bg)`
- Hover: `var(--button-hover-bg)` with drop shadow (`--shadow-base`)
- Active: `var(--button-active-bg)`
- Capsule shape using `--radius-pill`

---

## 9. Accessibility & Responsiveness

- Keyboard accessible
- Tap targets ≥ 44px
- Minimum contrast ratio: 4.5:1
- Carousel: swipe, arrow key, screen reader friendly
- Modals must trap focus when open
- Fully responsive across breakpoints:
  - Mobile-first
  - Desktop-focused layout enhancements
  - Tablet scaling

---

## 10. Tokens

| Token Name          | Value                      | Purpose                                   |
| ------------------- | -------------------------- | ----------------------------------------- |
| --radius-sm         | 4px                        | Inputs, badges                            |
| --radius-md         | 8px                        | Buttons                                   |
| --radius-lg         | 12px                       | Cards, modals                             |
| --radius-pill       | 9999px                     | Capsule buttons                           |
| --button-bg         | #CB2504                    | Primary button background                 |
| --button-hover-bg   | #0B5BB0                    | Hover state for buttons; adds drop shadow |
| --button-active-bg  | #0C3F7A                    | Active button state                       |
| --button-text-color | #ffffff                    | Button text                               |
| --shadow-base       | 0 4px 12px rgba(0,0,0,0.1) | Elevation; hover drop-shadow              |
| --transition-fast   | all 150ms ease             | UI animations                             |

---

## 11. Branding Aspects

### Logos & Emblems

#### Full Logo

- Horizontal and stacked versions available
- Use on light/dark backgrounds with proper spacing
- Minimum size and safe zones must be respected

#### SHIHO Emblem

- Represents endless knot → replayability & balance
- Usage rules:
  - Do not rotate, stretch, recolour, or overlay on complex backgrounds
  - Use emblem only in secondary branding contexts

### High-Energy Design

- Bold, modular, and fast-moving interfaces
- Use vibrant colours sparingly to highlight key actions or elements

### Fun-First Approach

- Ensure interactions feel snappy and playful
- Maintain a kid-friendly tone with clear, accessible visuals
