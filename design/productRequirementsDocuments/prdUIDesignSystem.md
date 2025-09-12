# PRD: UI Design System

## TL;DR

This PRD establishes the comprehensive UI design system for JU-DO-KON!, defining visual identity, component standards, and interaction principles for consistent user experiences across all game interfaces. It consolidates color palettes, typography, layout systems, accessibility requirements, and component specifications into a unified design language. The system ensures the game maintains visual consistency, appeals to ages 8-12, and provides accessible, responsive experiences across desktop and mobile platforms.

---

## Problem Statement

The JU-DO-KON! project lacks a centralized, comprehensive design system that unifies visual identity, component behavior, and accessibility standards. Without consolidated design guidelines, developers create inconsistent interfaces, designers make conflicting decisions, and the overall user experience becomes fragmented. This fragmentation particularly impacts younger users (ages 8-12) who need clear, consistent visual cues for navigation and interaction. The absence of a unified design system leads to maintenance overhead, accessibility gaps, and brand identity dilution.

---

## Goals

- **Visual Consistency**: Establish unified visual identity across all game interfaces and components
- **Age Appropriateness**: Ensure design appeals to target audience of ages 8-12 with clear, playful aesthetics
- **Accessibility**: Meet WCAG AA standards for inclusive user experiences
- **Developer Efficiency**: Provide reusable components and clear implementation guidelines
- **Brand Cohesion**: Strengthen JU-DO-KON! brand identity through consistent visual language
- **Cross-Platform Compatibility**: Ensure design system works across desktop, tablet, and mobile devices

---

## User Stories

- As a young player, I want clear, consistent visual cues so that I can navigate the game confidently
- As a developer, I want reusable design components so that I can build interfaces efficiently
- As a designer, I want comprehensive style guidelines so that I can create consistent experiences
- As an accessibility user, I want WCAG-compliant interfaces so that I can fully participate in the game
- As a product manager, I want unified brand expression so that JU-DO-KON! maintains strong identity

---

## Prioritized Functional Requirements

| Priority | Feature | Description |
|----------|---------|-------------|
| P1 | Core Color System | Primary color palette with accessibility-compliant contrast ratios |
| P1 | Typography Hierarchy | Font families, sizing, and text treatment standards |
| P1 | Component Library | Standardized UI components with consistent behavior |
| P1 | Accessibility Standards | WCAG AA compliance requirements and testing procedures |
| P1 | Spacing and Layout System | Grid system, spacing tokens, and responsive behavior |
| P2 | Theme Variations | Light, dark, and retro theme specifications |
| P2 | Animation and Interaction | Motion design principles and feedback patterns |
| P2 | Icon and Imagery Standards | Visual asset guidelines and usage requirements |
| P3 | Advanced Component Patterns | Complex interaction patterns and specialized components |

---

## Functional Requirements

### 1. Core Color System (P1)

**Primary Color Palette:**
```css
--color-primary: #CB2504        /* Buttons, highlights */
--color-secondary: #0C3F7A      /* Nav bar, stat blocks */
--color-tertiary: #E8E8E8       /* Backgrounds, outlines */
--link-color: var(--color-secondary)  /* Anchor tags */
--button-bg: #CB2504            /* Primary button background */
--button-hover-bg: #0B5BB0      /* Hover state for buttons */
--button-active-bg: #0C3F7A     /* Active button state */
--button-text-color: #FFFFFF    /* Button text */
```

**Rarity System Colors:**
| Rarity | Background | Border | Judogi Color |
|--------|------------|---------|---------------|
| Common | #3C5AD6 | #3C5AD6 | White (#FFF) |
| Epic | #C757DA | #C757DA | Blue (#3C7DC4) |
| Legendary | #E4AB19 | #E4AB19 | Blue (#3C7DC4) |

**Feature-Specific Colors:**
| Feature/Mode | Color | Usage |
|--------------|-------|--------|
| Classic Battle | #E53935 | High-energy, competitive |
| Team Battle | #8E24AA | Cooperative and strategic |
| Update Judoka | #00897B | Constructive, calm |
| Browse Judoka | #3949AB | Archival, structured |
| Meditation | #F9A825 | Calm, reflective |

**Theme Variations:**
- **Light Theme**: Standard color palette as defined above
- **Dark Theme**: `--color-primary` overridden to `#ff4530`, `--link-color` to `#3399ff`
- **Retro Theme**: Terminal-style green (`#8cff6b`) on black (`#000000`) with 16.63:1 contrast ratio

**Accessibility Requirements:**
- All color combinations must meet WCAG AA contrast ratio of 4.5:1 minimum
- Validate using `npm run check:contrast` and wcag-contrast library
- Color cannot be the sole indicator of interactive elements
- High contrast alternatives available for all color combinations

### 2. Typography Hierarchy (P1)

**Font Families:**
- **Headings**: Russo One (bold, emphasis, high impact)
- **Body Text**: Open Sans (readable, accessible, multi-weight)
- **Fallback**: Sans-serif system fonts for accessibility

**Typography Scale:**
| Element | Style | Usage |
|---------|-------|--------|
| Section Titles | ALL CAPS, Bold, Large | Main page headings with tracking |
| Action Buttons | Uppercase, Bold | Primary CTA focus |
| Judoka Surnames | Bold, Uppercase, Larger | E.g., "ONO" |
| Judoka First Names | Light, Small caps | E.g., "Shohei" |
| Supporting Info | Light, Small | Country, weight class details |

**Readability Standards:**
- Line height: 1.4× font size for optimal readability
- Letter spacing: 0.5% for Russo One, normal for Open Sans
- Minimum font size: 16px for body text, 14px for secondary information
- Avoid all caps in body text for accessibility
- Ensure contrast meets WCAG AA standards in all themes

### 3. Component Library (P1)

**Button Components:**
```css
/* Primary Button */
.primary-button {
  background: var(--button-bg);
  color: var(--button-text-color);
  border-radius: var(--radius-md);
  min-height: 44px;
  padding: var(--space-sm) var(--space-md);
}

/* Secondary Button */
.secondary-button {
  background: transparent;
  border: 2px solid var(--color-secondary);
  color: var(--color-secondary);
}
```

**Card Components:**
- **Judoka Cards**: Cut-out portrait art with clean edges, expressive poses, subtle drop shadows
- **Mode Selection Cards**: Bold icon + label tiles with hover/press feedback
- **Carousel Cards**: 3-5 visible cards with scroll snap, central card slight zoom

**Navigation Components:**
- **Top Bar**: Fixed, logo left, menu right, scales with screen size
- **Footer Nav**: Always visible, icon + label pairs, clear active state
- **Map Navigation**: Tappable tiles with glow/scale hover effects

**Form Components:**
```css
.settings-item {
  margin: var(--space-md) 0;
}

.settings-description {
  font-size: 0.9em;
  color: var(--color-secondary);
  margin-top: var(--space-xs);
}
```

**Modal Components:**
- Max width: 600px, centered with dim backdrop
- Cancel (left), Save/Continue (right) button placement
- Focus trap when open, escape key dismissal

### 4. Accessibility Standards (P1)

**Touch and Interaction:**
- Minimum touch targets: 48×48px for all interactive elements
- Keyboard navigation support for all components
- Visible focus indicators (2px outline with `--link-color`)
- No reliance on hover-only interactions

**Screen Reader Support:**
- Semantic HTML elements (`<button>`, `<nav>`, `<main>`, etc.)
- ARIA labels and roles for complex components
- Live regions for dynamic content updates
- Alternative text for all meaningful images

**Visual Accessibility:**
- WCAG AA contrast compliance (4.5:1 minimum)
- No color-only communication of important information
- Scalable text up to 200% without horizontal scrolling
- Reduced motion options for animation-sensitive users

**Testing Requirements:**
- Automated contrast checking via `npm run check:contrast`
- Pa11y accessibility auditing at http://localhost:5000
- Keyboard navigation testing for all user flows
- Screen reader testing with common assistive technologies

### 5. Spacing and Layout System (P1)

**Spacing Tokens:**
```css
--space-xs: 4px    /* Tight spacing, inline elements */
--space-sm: 8px    /* Default spacing, form elements */
--space-md: 16px   /* Standard component spacing */
--space-lg: 24px   /* Section separation */
--space-xl: 32px   /* Major layout divisions */
```

**Grid System:**
- **Desktop**: 4-column responsive grid with generous whitespace
- **Mobile**: Single-column stacked layout with appropriate spacing
- **Tablet**: 2-column hybrid layout with responsive breakpoints
- **Alignment**: Use 8px rhythm for consistent spacing relationships

**Responsive Breakpoints:**
- Mobile: < 480px (hamburger menu, stacked layout)
- Tablet: 480px - 768px (hybrid layouts)
- Desktop: > 768px (full grid system)

**Layout Patterns:**
- **Header Height**: 8vh (8dvh with dynamic viewport support)
- **Footer Height**: 8vh (8dvh with dynamic viewport support)
- **Content Areas**: Panelled layout with z-depth and modular sections
- **Card Layouts**: Layered with drop shadows for visual hierarchy

### 6. Theme Variations (P2)

**Light Theme (Default):**
- Background: Light colors with high contrast text
- Primary palette as defined in core color system
- Optimized for daytime use and general accessibility

**Dark Theme:**
- Background: Dark colors with light text
- Modified primary colors: `--color-primary: #ff4530`, `--link-color: #3399ff`
- Maintains WCAG AA contrast ratios
- Reduced eye strain for low-light environments

**Retro Theme:**
- Terminal-style aesthetic with green-on-black color scheme
- Background: `#000000`, Text: `#8cff6b`
- 16.63:1 contrast ratio for excellent accessibility
- Nostalgic computing aesthetic for specialized users

**Theme Switching:**
- Seamless transitions between themes without layout shifts
- User preference persistence across sessions
- System theme detection and automatic switching option
- CSS custom property-based implementation for performance

### 7. Animation and Interaction (P2)

**Animation Principles:**
- **Duration**: Fast (150ms) for micro-interactions, medium (300ms) for transitions
- **Easing**: `ease-in-out` for natural feel, `ease` for emphasis
- **Reduced Motion**: Respect `prefers-reduced-motion` for accessibility

**Interaction Feedback:**
```css
--transition-fast: all 150ms ease;
--shadow-base: 0 4px 12px rgba(0,0,0,0.1);
--shadow-hover: 0 8px 24px rgba(0,0,0,0.2);
```

**Button Interactions:**
- Hover: Scale slightly, add drop shadow, 2px outline
- Active: Deeper shadow, slight color shift
- Focus: 2px `--link-color` outline with text underline
- Ripple effects via `setupButtonEffects()` helper

**Card Animations:**
- Hover: Gentle lift with increased shadow
- Selection: Scale emphasis with color highlight
- Carousel: Smooth scroll with snap points

### 8. Icon and Imagery Standards (P2)

**Icon System:**
- **Source**: Material Symbols SVGs with `viewBox="0 -960 960 960"`
- **Size**: 24px standard, 32px for emphasis, 16px for compact
- **Treatment**: Consistent with theme colors, proper ARIA labeling

**Image Guidelines:**
- **Judoka Portraits**: Cut-out style with clean edges, expressive poses
- **Backgrounds**: Geometric patterns, linear gradients, avoid visual clutter
- **Overlays**: Character layering over background panels with depth

**Brand Assets:**
- **Logo**: Horizontal and stacked versions with proper spacing
- **SHIHO Emblem**: Endless knot symbol, usage restrictions apply
- **Safe Zones**: Minimum spacing requirements around logo elements

---

## Acceptance Criteria

- [ ] All color combinations meet WCAG AA contrast requirements (4.5:1 minimum)
- [ ] Typography scales consistently across all breakpoints and themes
- [ ] Component library provides reusable patterns for all common UI elements
- [ ] Touch targets meet 48×48px minimum size requirement
- [ ] Keyboard navigation works for all interactive components
- [ ] Screen reader compatibility verified for all major components
- [ ] Theme switching maintains visual consistency and accessibility
- [ ] Animation respects reduced motion preferences
- [ ] Grid system provides responsive behavior across all devices
- [ ] Design tokens are consistently applied throughout the application

---

## Non-Functional Requirements

**Performance:**
- CSS custom properties for efficient theme switching
- Optimized asset loading for images and icons
- Minimal layout shift during responsive transitions
- Efficient animation performance (60fps target)

**Maintainability:**
- Token-based design system for easy updates
- Clear documentation for all component variations
- Consistent naming conventions for CSS classes and properties
- Automated testing for accessibility and contrast compliance

**Scalability:**
- Design system supports addition of new components
- Theme system accommodates future color schemes
- Grid system adapts to new content types and layouts
- Component library expandable for specialized use cases

**Cross-Platform Compatibility:**
- Consistent appearance across modern browsers
- Mobile-first responsive design principles
- Touch-friendly interactions for mobile devices
- Progressive enhancement for advanced features

---

## Edge Cases / Failure States

**Theme Support Issues:**
- Graceful fallback when theme switching fails
- Default theme loading when user preference unavailable
- Contrast validation alerts for invalid color combinations

**Accessibility Degradation:**
- Alternative interaction methods when hover unavailable
- Keyboard navigation fallbacks for complex components
- High contrast mode compatibility for system preferences

**Responsive Layout Issues:**
- Content overflow handling on small screens
- Component behavior at extreme aspect ratios
- Grid system fallbacks for unsupported browsers

**Performance Constraints:**
- Simplified animations for low-performance devices
- Progressive enhancement for advanced visual effects
- Graceful degradation when CSS features unsupported

---

## Dependencies and Open Questions

**Dependencies:**
- CSS custom properties support in target browsers
- JavaScript for dynamic theme switching and component interactions
- Accessibility testing tools (Pa11y, wcag-contrast)
- Responsive design testing across device categories

**Open Questions:**
- Should the design system include dark mode alternatives for all color tokens?
- What level of customization should be available to users beyond theme selection?
- How should the design system evolve to accommodate future game modes?
- What additional accessibility features should be prioritized for young users?

---

## Tasks

- [x] Consolidate existing design system documentation into unified PRD
- [ ] Create comprehensive design token library with all CSS custom properties
- [ ] Develop component documentation with usage examples and code snippets
- [ ] Establish automated accessibility testing pipeline
- [ ] Create theme switching implementation guide
- [ ] Design responsive layout testing procedures
- [ ] Develop brand asset usage guidelines and restrictions
- [ ] Create developer onboarding guide for design system adoption
- [ ] Establish design system governance and update procedures
- [ ] Build design system validation tools and quality checks

---

## Source Files Consolidated

This PRD consolidates content from the following design files:
- `design/retroThemeContrast.md` - Retro theme color specifications and contrast validation
- `design/codeStandards/codeUIDesignStandards.md` - Comprehensive UI design guidelines, typography, components, and accessibility standards
- `design/codeStandards/settingsPageDesignGuidelines.md` - Settings interface design patterns and accessibility requirements
- `src/styles/base.css` - CSS custom properties and design tokens currently in use
