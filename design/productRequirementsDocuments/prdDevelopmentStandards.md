# PRD: Development Standards

## TL;DR

This PRD defines comprehensive development standards for the JU-DO-KON! project, covering code quality, documentation, naming conventions, and UI design principles. It consolidates scattered standards into a single source of truth to ensure consistent, maintainable, and accessible code across all features. These standards support both human developers and AI agents in producing high-quality, well-documented code that follows established patterns and practices.

---

## Problem Statement

Inconsistent development practices across the JU-DO-KON! codebase lead to reduced maintainability, slower onboarding, and increased technical debt. Without unified standards for coding, documentation, and UI design, developers spend excessive time understanding existing code patterns and may inadvertently introduce inconsistencies. This particularly impacts AI agents, which require clear, consistent patterns to generate appropriate code suggestions and maintain quality standards.

---

## Goals

- **Consistency**: Establish uniform coding patterns, documentation styles, and naming conventions
- **Maintainability**: Enable faster code comprehension and modification through clear standards
- **Quality**: Reduce defects and technical debt through structured development practices
- **Knowledge Transfer**: Accelerate developer onboarding with well-documented standards
- **AI Agent Effectiveness**: Provide clear patterns for automated code generation and review

---

## User Stories

- As a developer, I want clear coding standards so that I can write consistent, maintainable code
- As a new team member, I want comprehensive documentation standards so that I can quickly understand the codebase
- As a code reviewer, I want established naming patterns so that I can efficiently evaluate code quality
- As an AI agent, I want structured pseudocode standards so that I can generate appropriate documentation
- As a UI developer, I want unified design standards so that I can create consistent user interfaces

---

## Prioritized Functional Requirements

| Priority | Feature                       | Description                                                                 |
| -------- | ----------------------------- | --------------------------------------------------------------------------- |
| P1       | JSDoc Documentation Standards | Mandatory documentation format for all public functions and classes         |
| P1       | Function Naming Conventions   | Consistent prefix-based naming patterns (create, setup, is)                 |
| P1       | Pseudocode Documentation      | Structured high-level logic descriptions using @pseudocode marker           |
| P1       | Code Quality Rules            | Function length limits, modularity requirements, and refactoring guidelines |
| P2       | UI Design System Integration  | Component design patterns, color systems, and accessibility standards       |
| P2       | Settings Page Guidelines      | Specific layout and structure requirements for settings interfaces          |
| P2       | PRD Authoring Standards       | Canonical structure, priorities, and acceptance criteria for all PRDs       |
| P3       | Advanced Documentation        | Additional JSDoc tags and specialized documentation patterns                |

---

## Functional Requirements

### 1. JSDoc Documentation Standards (P1)

**Required Format:**

- Use block comments `/** ... */` for all public functions, classes, and modules
- Start with single-sentence summary describing function purpose
- Document parameters with `@param {Type} name - Description` format
- Document return values with `@returns {Type} Description` format
- Indicate optional parameters with square brackets: `@param {string} [optionalParam]`
- Include default values in parameter descriptions when applicable

**Example:**

```javascript
/**
 * Build the card carousel HTML elements.
 * @param {Array<Object>} cards - Array of card data to be displayed.
 * @param {HTMLElement} container - The DOM element where carousel will be injected.
 * @param {boolean} [autoplay=false] - Whether to automatically advance carousel.
 * @returns {void}
 */
function buildCarousel(cards, container, autoplay = false) { ... }
```

**Quality Requirements:**

- Documentation must match actual function signature
- Brief, clear descriptions using imperative style
- No modification of comments marked with `@pseudocode`

### 2. Function Naming Conventions (P1)

**Prefix-Based Patterns:**

- `createX` - Factory functions returning DOM nodes or component objects
- `setupY` - Functions attaching event listeners or initializing behavior
- `isZ` - Predicate helpers returning boolean values
- `handleX` - Event handler functions
- `loadX` - Data loading and fetching functions

**Grouping Requirements:**

- Group related functions by concern within modules
- Use consistent prefixes to indicate function purpose
- Maintain alphabetical ordering within prefix groups

### 3. Pseudocode Documentation (P1)

**Format Requirements:**

- Use `@pseudocode` marker at beginning of pseudocode blocks
- Employ numbered list format for step-by-step logic
- Focus on **why** operations occur, not just **what** happens
- Use imperative style ("Initialize", "Render", "Handle")
- Place only where adding value for complex functions

**Example:**

```javascript
/**
 * Populates the bottom navigation bar with game modes.
 *
 * @pseudocode
 * 1. Load mode definitions from gameModes.json
 * 2. Fetch navigationItems.js for display order and visibility
 * 3. Merge navigation items with mode data by matching id field
 * 4. Filter out hidden items and keep only main menu entries
 * 5. Sort remaining items by order value
 * 6. Generate HTML list items for each merged object
 * 7. Update navigation bar with generated HTML
 * 8. Handle errors gracefully with fallback messaging
 */
```

### 4. Code Quality Standards (P1)

**Function Complexity:**

- Maximum 50 lines per function
- Single responsibility principle enforcement
- Extract helper functions for complex logic blocks
- Avoid deep nesting (maximum 3 levels)

**Modularity Requirements:**

- Group helpers by functional concern
- Clear module boundaries and dependencies
- Consistent export patterns
- Minimal public API surface

### 5. UI Design System Integration (P2)

**Design Language & Principles:**

- Bold, high-contrast visuals with playful energy tuned for players aged 8–12.
- Touch-first interactions with minimum 48×48px targets and immediate feedback (scale, glow, ripple).
- Progressive disclosure that keeps the primary path obvious while revealing detail on demand.
- Consistent component reuse and modular layouts to maintain familiarity across screens.
- WCAG AA accessibility compliance, keyboard navigation, and screen-reader support at every breakpoint.

**Key Visual Themes:**

- Flat colour foundations enhanced with geometric background textures.
- Layered judoka cards with z-depth and modular panels.
- Emphasis typography (caps, bold, white-on-colour) that reinforces hierarchy.
- Layout momentum achieved through animation, diagonals, and responsive grid shifts.

**Navigation Systems:**

- Top navigation bar remains fixed, screen-reader accessible, and scales the logo proportionally to viewport height.
- Map navigation tiles behave as buttons with ARIA labels, glow/scale on hover, and animate on select.
- Footer navigation stays visible, pairs icons with labels, highlights the active route using a secondary blue background and `aria-current="page"`, and forbids truncated labels. Inline icons use Material Symbols SVGs with `viewBox="0 -960 960 960"`.

**Judoka Card System:**

- Maintain a 2:3 card aspect ratio with clearly defined zones (rarity badge, weight class, portrait, stat block, signature move band).
- Stat colour codes: 0–3 red, 4–7 yellow, 8–10 green for instant readability.
- Interactions: tap reveals stats, hover adds scale/shadow, selection displays a glow and checkmark.
- Name formatting pairs smaller sentence-case first names with large uppercase surnames aligned to a dark blue (#0C3F7A) backdrop.
- Signature move band (common cards) uses #003B88 background with yellow (#FED843) text, square corners, shared padding, and `line-height: 1`.
- Epic/Legendary rarity markers sit top-left; portrait backgrounds use warm gradients and keep judogi colour consistent (Pantone 285M / #3C7DC4).

**Component Patterns:**

- Card carousel supports horizontal scroll with scroll-snap-x, 3–5 visible cards, centred zoom, dot pagination, Material Symbols chevrons (with accessible names), swipe gestures, keyboard navigation, and scroll-edge blur.
- Modals max at 600px wide, centre with dim backdrop, keep Cancel left / Save right, and preserve visible action buttons on mobile with confirmation toasts after Save.
- Judoka editor uses sliders/steppers for stats, live previews (collapsible on mobile), dropdown for signature moves, and a sticky footer with Cancel + Save.
- Buttons rely on `--button-*` tokens, maintain 44–48px minimum height, use shared border radii, and provide ripple + outline feedback through CSS pseudo-elements tied to `:active`/`:focus-visible` while respecting `prefers-reduced-motion`.
- Ripple feedback is achieved purely through CSS (`::after`) with no DOM mutations; the deprecated `setupButtonEffects()` helper stays removed to keep interactions declarative and accessible.
- Classic Battle layouts align player/opponent cards in a three-column grid (stacking on <480px) with stat buttons presented as evenly spaced grids.
- Sidebar lists render as `<fieldset>` radio groups with zebra striping and pulse the selected label for 150 ms while honouring `prefers-reduced-motion`.

**Typography Standards:**

- Headings use Russo One with uppercase emphasis; body copy uses Open Sans for legibility.
- Section titles adopt bold, large caps; action buttons remain uppercase and bold; supporting info stays light and small.
- Maintain line-height at 1.4× for readability and apply 0.5% letter-spacing to Russo One headings.

**Colour System & Rarity Mapping:**

| Token / Context                     | Value                  | Usage                          |
| ----------------------------------- | ---------------------- | ------------------------------ |
| Primary (`--color-primary`)         | #CB2504                | Buttons, highlights, CTAs      |
| Secondary (`--color-secondary`)     | #0C3F7A                | Navigation bars, stat blocks   |
| Tertiary (`--color-tertiary`)       | #E8E8E8                | Backgrounds, outlines          |
| Link (`--link-color`)               | var(--color-secondary) | Anchor tags and focus outlines |
| Hover (`--button-hover-bg`)         | #0B5BB0                | Button hover state             |
| Active (`--button-active-bg`)       | #0C3F7A                | Button active state            |
| Switch Off (`--switch-off-bg`)      | #707070                | Toggle off background          |
| Switch On (`--switch-on-bg`)        | #007F00                | Toggle on background           |
| Button Text (`--button-text-color`) | #FFFFFF                | Primary button text            |

Additional rarity colour mapping keeps game identity distinct:

| Rarity    | Background | Border  | Judogi Colour  |
| --------- | ---------- | ------- | -------------- |
| Common    | #3C5AD6    | #3C5AD6 | White (#FFF)   |
| Epic      | #C757DA    | #C757DA | Blue (#3C7DC4) |
| Legendary | #E4AB19    | #E4AB19 | Blue (#3C7DC4) |

**Tokens, Shadows, and Motion:**

| Token / Variable                                                | Value                                                       | Purpose                               |
| --------------------------------------------------------------- | ----------------------------------------------------------- | ------------------------------------- |
| `--radius-sm` / `--radius-md` / `--radius-lg` / `--radius-pill` | 4px / 8px / 12px / 9999px                                   | Shared corner radii by component type |
| `--shadow-base` / `--shadow-hover`                              | `0 4px 12px rgba(0,0,0,0.1)` / `0 8px 24px rgba(0,0,0,0.2)` | Elevation + hover effects             |
| `--transition-fast`                                             | `all 150ms ease`                                            | Snappy interaction animations         |
| `--color-slider-dot` / `--color-slider-active`                  | #666666 / #333333                                           | Carousel indicator styling            |
| `--scroll-marker-size`                                          | 10px                                                        | Carousel scroll marker sizing         |
| `--logo-max-height`                                             | `min(8dvh, 44px)`                                           | Responsive logo scaling               |

**Accessibility & Responsiveness:**

- Keyboard focusable controls with visible focus indicators on every element.
- Tap targets ≥48px and responsive grid behaviour (mobile-first, desktop enhancements, tablet scaling).
- Carousels support swipe, arrow keys, and screen readers; modals trap focus when open.
- Navigation condenses into hamburger menus <480px while maintaining active state highlighting.

**Branding & Tone:**

- Respect logo safe zones, orientation, and colour fidelity; only use the SHIHO emblem in approved secondary contexts.
- Keep interactions fun-first—snappy, playful, and kid-friendly without sacrificing clarity.
- Use vibrant highlights sparingly to emphasise primary actions while preserving readability.

### 6. Settings Page Guidelines (P2)

**Layout Requirements:**

- Organise settings into `<fieldset>` sections with descriptive `<legend>` headings (e.g., General, Game Modes, Feature Flags).
- Maintain consistent form structure, either one form per section or a single form containing multiple fieldsets.
- Wrap controls inside `<div class="settings-item">` containers to preserve spacing and modularity.
- Apply `.game-mode-toggle-container` to fieldsets that should render responsive grids (3 columns desktop, single column mobile).
- Preserve logical top-down hierarchy (title → general → advanced) and maintain tab order through DOM structure.
- Display all sections simultaneously to simplify automated testing; avoid collapsible panels.

**Structure Template:**

```html
<div class="settings-item">
  <label for="example-toggle">Example Toggle</label>
  <p class="settings-description">Explains what the option does.</p>
</div>
```

**Styling Patterns:**

- Reuse `.settings-form` wrappers and consistent `<legend>` typography (Russo One, 24px).
- Implement feature toggles with the existing `.switch` markup, including tooltip and automation attributes:

  ```html
  <label for="feature-enable-test-mode" class="switch">
    <input
      type="checkbox"
      id="feature-enable-test-mode"
      name="enableTestMode"
      data-tooltip-id="settings.enableTestMode"
      data-flag="enableTestMode"
      aria-label="Test Mode"
    />
    <div class="slider round"></div>
    <span>Test Mode</span>
  </label>
  ```

- Style selects and radio buttons with existing dark backgrounds, padding, and rounded borders; avoid bespoke colour values—use CSS variables (`--color-primary`, `--button-bg`, etc.).
- Honour Light, Dark, and Retro themes, ensuring snackbars use `--color-tertiary` with a contrasting border to avoid conflict with the navigation bar.
- Apply spacing tokens (`--space-sm`, `--space-md`, etc.) and keep inputs at least 48px tall for touch accessibility.
- Use `.settings-description` for general text and `.flag-description` for feature flag details (or standardise on one class when refactoring).

**Accessibility & UX:**

- All controls must be reachable via Tab with visible focus outlines; do not remove default focus styling.
- Provide `aria-label` or `<label>` for every control; reference descriptive copy via `aria-describedby` when needed.
- Announce state changes via native semantics, route error states through a dedicated `<div id="settings-error-popup" role="alert" aria-live="assertive">`, and ensure messages dismiss after ~3 seconds.
- Guarantee colour contrast of 4.5:1 across all themes and surface immediate visual feedback for toggles.
- Enforce consistent UX: settings auto-save via `updateSetting()`, reload with persisted values, and integrate with existing error feedback flows.
- Include a clearly labelled `.settings-item` link to `changeLog.html` before the error container for transparency.
- Provide a `Links` fieldset grouping supplemental pages (`changeLog.html`, `prdViewer.html`, `mockupViewer.html`, `tooltipViewer.html`, `vectorSearch.html`) arranged with `.settings-links-list` (3-column desktop, single column <768px, sequential tabindex such as 99+).

**Feature Flags & Agent Observability:**

- Implement feature flags with predictable IDs (`feature-<kebab-case>`) and camelCase `name` attributes; include `data-flag` for automation and `data-tooltip-id` for tooltip integration.
- Place all feature flags within a dedicated `<fieldset id="feature-flags-container" class="game-mode-toggle-container settings-form">`.
- Feature flags should be listed in alphabetical order by their `name` attribute to ensure a consistent and predictable layout.
- Trigger snackbars via `showSnackbar()` when a flag changes to provide confirmation feedback.
- Ensure internal state remains observable via DOM attributes and support AI-assisted workflows.

### 7. PRD Authoring Standards (P2)

**Required Sections:**

- Every PRD must include a TL;DR overview, problem statement, goals/success metrics, user stories, prioritized functional requirements, acceptance criteria, non-functional requirements, dependencies, and open questions.
- Functional requirements should appear in a prioritised table (typically P1/P2/P3) naming each feature and describing expected behaviour.
- Acceptance criteria list measurable, testable statements (covering success and failure states) that map directly to the prioritized requirements.

**Structure & Consistency:**

- Use consistent headings (`## Goals`, `## User Stories`, `## Functional Requirements`, `## Acceptance Criteria`, etc.) so humans and agents can parse documents reliably.
- Reference related PRDs where helpful and note dependencies that affect implementation (e.g., Classic Battle rules or Team Battle logic).
- Maintain clarity and completeness—avoid vague language and ensure no critical requirement is omitted.

**Authoring Guidelines:**

- Acceptance criteria should cover happy paths, error handling, timing thresholds, and accessibility expectations where relevant.
- Provide persona-driven user stories in the “As a [user], I want [action] so that [outcome]” format to tie requirements to real scenarios.
- Capture non-functional considerations (performance budgets, accessibility targets, UX tone) alongside functional requirements.
- Document outstanding questions and assumptions so follow-up work can close gaps quickly.
- Treat these standards as mandatory for both human authors and AI agents generating new PRDs.

---

## Validation Command Matrix & Operational Playbooks

The development standards rely on a consistent validation workflow that protects quality across formatting, linting, testing, and documentation. This section captures the canonical command matrix previously hosted in `docs/validation-commands.md` and clarifies how contributors should apply it. Advanced test-quality verification commands now live alongside testing policies in [PRD: Testing Standards](./prdTestingStandards.md#quality-verification-commands-operational-reference).

### Core Validation Commands

| Focus Area               | Command(s)                                           | Purpose                                                                      | When to Run                                                                         |
| ------------------------ | ---------------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Code formatting          | `npx prettier . --check` \\ `npx prettier . --write` | Enforces repository-wide formatting discipline.                              | Run `--check` before every commit; use `--write` to auto-correct issues.            |
| Linting                  | `npx eslint .` \\ `npx eslint . --fix`               | Detects logic bugs and enforces coding conventions.                          | Execute prior to commit; rely on `--fix` for autofixable findings.                  |
| Documentation validation | `npm run check:jsdoc` \\ `npm run check:jsdoc:fix`   | Confirms that public APIs include compliant JSDoc with `@pseudocode`.        | Run after adding or updating exported functions and before commit.                  |
| Unit tests               | `npx vitest run` \\ `npm run test:style` (on demand) | Guards core logic against regressions.                                       | Required before every commit; run style tests when touching visual styling helpers. |
| Playwright tests         | `npx playwright test`                                | Validates end-to-end UI workflows.                                           | Run before committing, especially for UI-affecting changes.                         |
| Accessibility & contrast | `npm run check:contrast`                             | Ensures color contrast meets accessibility standards.                        | Mandatory after UI/styling updates and before commit.                               |
| RAG system               | `npm run rag:validate`                               | Confirms offline model hydration and hot-path safeguards for the RAG system. | Use after documentation or RAG-adjacent updates and prior to commit.                |

### Hot Path & Log Discipline Commands

```bash
# Detect dynamic imports in performance-critical paths
grep -RIn "await import\(" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle 2>/dev/null \
  && echo "❌ Found dynamic import in hot path" && exit 1 || echo "✅ No dynamic imports in hot paths"

# Check for unsilenced console output in tests
grep -RInE "console\.(warn|error)\(" tests | grep -v "tests/utils/console.js" \
  && echo "❌ Unsilenced console found" && exit 1 || echo "✅ Console discipline maintained"
```

### Combined Validation Suites

- **Quick check (one-liner):**

  ```bash
  npm run check:jsdoc && npx prettier . --check && npx eslint . && npm run check:contrast
  ```

- **Full validation (including RAG preflight):**

  ```bash
  npm run check:jsdoc && npx prettier . --check && npx eslint . && npx vitest run && npx playwright test && npm run check:contrast && npm run rag:validate
  ```

### Audience-Specific Playbooks

- **Human contributors:** Run the full quick-check suite (formatting, linting, JSDoc, unit tests, Playwright tests, contrast) before committing changes.
- **AI agents:** Execute the quick-check suite **plus** `npm run rag:validate` and the hot-path/log discipline grep commands above to ensure automation does not introduce regressions.

> **See also:** [PRD: Testing Standards](./prdTestingStandards.md#quality-verification-commands-operational-reference) for advanced test quality verification commands and anti-pattern checks tailored to unit and Playwright suites.

### Troubleshooting & Performance Tips

- **Prettier fails:** Run `npx prettier . --write` to auto-correct formatting issues.
- **ESLint fails:** Run `npx eslint . --fix` for autofixable lint errors.
- **Playwright fails:** Ensure the application server is available on `localhost:5000` (`npm start`).
- **Tests fail with `localStorage` errors:** Clear browser `localStorage` manually before re-running.
- **RAG validation fails:** Run `npm run rag:prepare:models` to hydrate offline models.
- **General performance:** Parallelize tests where possible, avoid running `npm run test:style` unless necessary, and pre-hydrate offline RAG models in CI environments.

---

## Acceptance Criteria

- [ ] All new public functions include compliant JSDoc documentation
- [ ] Function names follow established prefix conventions
- [ ] Complex functions include @pseudocode documentation
- [ ] No functions exceed 50 lines without refactoring
- [ ] UI components follow design system token usage
- [ ] Settings pages implement required layout structure
- [ ] All code passes automated quality checks (ESLint, Prettier)
- [ ] Documentation matches actual function implementations
- [ ] Accessibility standards met for all UI components
- [ ] Consistent module organization and export patterns

---

## Non-Functional Requirements

**Performance:**

- Documentation generation must not impact build times
- Code quality checks integrated into CI/CD pipeline
- Automated validation of naming conventions

**Maintainability:**

- Standards must be easily discoverable through PRD system
- Regular updates to reflect evolving best practices
- Clear migration path for existing non-compliant code

**Accessibility:**

- All UI components meet WCAG AA standards
- Keyboard navigation support for all interactive elements
- Screen reader compatibility for all text content

**Developer Experience:**

- Standards enforceable through automated tooling
- Clear examples for all documented patterns
- Integration with AI agent workflows

---

## Dependencies and Open Questions

**Dependencies:**

- ESLint configuration for automated checking
- Prettier integration for consistent formatting
- CI/CD pipeline for quality validation
- RAG system integration for AI agent access

**Open Questions:**

- Should standards be enforced retroactively on existing code?
- What level of automation is appropriate for documentation generation?
- How to handle standards conflicts between different component types?

---

## Tasks

- [x] Consolidate existing code standards into unified PRD
- [ ] Update ESLint rules to enforce naming conventions
- [ ] Create automated documentation validation
- [ ] Integrate standards into AI agent workflows
- [ ] Develop migration guide for existing non-compliant code
- [ ] Create developer onboarding checklist based on standards
- [ ] Set up automated quality reporting in CI/CD

---

## Source Files Consolidated

This PRD consolidates content previously maintained in `design/codeStandards/` (now retired):

- `codeJSDocStandards.md` — JSDoc formatting and documentation requirements
- `codeNamingPatterns.md` — Function naming conventions and patterns
- `codePseudocodeStandards.md` — Pseudocode documentation standards
- `codeUIDesignStandards.md` — UI design principles, component patterns, tokens, and accessibility rules
- `settingsPageDesignGuidelines.md` — Layout, styling, accessibility, and feature flag requirements for the settings interface
- `prdRulesForAgents.md` — Canonical PRD structure, prioritization rules, and acceptance criteria expectations
