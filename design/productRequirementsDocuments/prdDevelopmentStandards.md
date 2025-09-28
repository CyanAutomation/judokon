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
| P1       | PRD Authoring Standards       | Required structure, priorities, and acceptance criteria for PRD content     |
| P1       | Code Quality Rules            | Function length limits, modularity requirements, and refactoring guidelines |
| P2       | UI Design System Integration  | Component design patterns, color systems, and accessibility standards       |
| P2       | Settings Page Guidelines      | Specific layout and structure requirements for settings interfaces          |
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

#### Language & Style

- Write comments in clear, professional English with proper grammar and punctuation
- Favor clarity over brevity; longer comments are acceptable when they improve comprehension
- Maintain a neutral tone focused on intent and behavior

#### Acceptance Criteria (JSDoc Specific)

- Every exported class, function, or module exposes a structured JSDoc block
- Functions longer than 20 lines include a summary comment unless self-explanatory
- Parameters document type, name, and purpose—including optional/default information where applicable
- Public API changes update the associated JSDoc in the same commit

#### Edge Cases & Failure States

- Missing or outdated documentation blocks must be resolved before merge approval
- Comments marked with `@pseudocode` cannot be altered without explicit reviewer approval
- Complex workarounds require JSDoc that references the tracking issue or follow-up task

#### Additional Notes

- JSDoc supplements, not replaces, expressive naming—keep code self-documenting where possible
- Use tooling compatible with JSDoc generation to support automated documentation pipelines
- Preserve `@pseudocode` markers so structured logic descriptions survive formatting tools and automation

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

#### Language & Style

- Explain intent using clear, plain English and imperative phrasing ("Initialize", "Render")
- Focus on why operations occur, not line-by-line implementation details
- Maintain a professional, concise tone that prioritizes comprehension

#### Acceptance Criteria (Pseudocode Specific)

- Complex workflows include numbered `@pseudocode` lists summarizing the logical flow
- Every pseudocode block begins with the `@pseudocode` marker to keep tooling accurate
- Updates to logic include matching pseudocode updates in the same change set

#### Edge Cases & Failure States

- Missing pseudocode on complex routines blocks merge until documentation is added
- Outdated pseudocode must be corrected whenever functionality changes
- Overly literal pseudocode that mirrors the code should be rewritten to emphasize decision points and intent

#### Additional Notes

- Reserve pseudocode for areas where it materially improves onboarding or maintenance
- Surface guard clauses, error handling, and branching logic to aid reviewers and AI agents
- Keep pseudocode colocated with the functions it describes to maintain context

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

#### Purpose & Design Language

- Maintain a bold, high-contrast visual identity optimized for players ages 8–12
- Combine flat color fields, geometric textures, and layered card layouts to create depth
- Ensure layouts scale from mobile to desktop while preserving continuity and recognizability

#### Design Principles

- Touch-first interaction (minimum 48x48px targets with tactile feedback)
- Responsive feedback for every interaction (scale, glow, ripple, or animation)
- Clear visual hierarchy that highlights rarity tiers, modes, and progression
- Progressive disclosure that reveals additional detail only when needed
- Strict reuse of shared UI patterns to promote familiarity and reduce maintenance
- WCAG AA accessibility compliance for contrast, focus states, and keyboard navigation

#### Color System

| Token / Usage           | Value      | Notes                                                     |
| ----------------------- | ---------- | --------------------------------------------------------- |
| `--color-primary`       | #CB2504    | Buttons, highlights, and key action accents               |
| `--color-secondary`     | #0C3F7A    | Navigation, stat blocks, secondary surfaces               |
| `--color-tertiary`      | #E8E8E8    | Backgrounds, outlines, panel separators                   |
| `--link-color`          | `var(--color-secondary)` | Anchor tags and interactive text                      |
| `--button-hover-bg`     | #0B5BB0    | Hover state for buttons                                   |
| `--button-active-bg`    | #0C3F7A    | Active button state                                       |
| `--switch-on-bg`        | #007F00    | Feature flag toggles (on state)                           |

- Validate color choices with `npm run check:contrast` to maintain ≥4.5:1 ratios
- Preserve vibrant judoka card palettes while keeping the UI shell muted for focus

#### Rarity & Feature Color Mapping

| Context         | Background | Notes                               |
| --------------- | ---------- | ----------------------------------- |
| Common cards    | #3C5AD6    | Pair with white judogi for clarity  |
| Epic cards      | #C757DA    | Supports expressive, celebratory UI |
| Legendary cards | #E4AB19    | High-energy, prestigious styling    |
| Classic Battle  | #E53935    | Competitive, urgent presentation    |
| Team Battle     | #8E24AA    | Cooperative, strategic tone         |
| Update Judoka   | #00897B    | Constructive, calm vibe             |
| Browse Judoka   | #3949AB    | Archival, structured interactions    |
| Meditation      | #F9A825    | Reflective, low-intensity cadence   |

#### Typography

- Headings use Russo One; body copy uses Open Sans with 1.4× line height
- Section titles appear in uppercase with generous tracking
- Avoid all caps in body text and use `.settings-description` for secondary copy
- Validate contrast in all themes, including dark and retro variants

#### Imagery & Iconography

- Use cut-out portrait art with clean edges, expressive poses, and subtle drop shadows
- Layer characters above blurred backgrounds to reinforce depth and focus
- Keep iconography bold and minimal so it remains legible on small screens

#### Visual Hierarchy & Layout

- Emphasize rarity tiers and ranking with scale, placement, and color weight
- Group content using panelled sections, alternating backgrounds, and clear separators
- Ensure CTAs and cards visually pop via elevation, blur, or scale changes

#### Grid & Spacing System

- Follow a 4-column responsive grid anchored by an 8px spacing rhythm
- Align components to the grid baseline and maintain consistent padding and margins
- Compose screens from reusable modules (card carousels, mode tiles, quote panels, galleries)

#### Component Patterns

- Card carousel: 3–5 visible cards with scroll snap and swipe affordances
- Mode selection panels: bold icon + label tiles with hover/press feedback
- Create/Edit modals: floating layout with left-aligned cancel, right-aligned save, and live previews
- Meditation screen: language toggle, fade transitions, vertically separated CTAs

#### Token Reference

- Use `design/productRequirementsDocuments/prdUIDesignSystem.md#10-tokens` for the authoritative token list
- Dark mode overrides adjust `--color-primary` to #ff4530 and `--link-color` to #3399ff
- Re-run `npm run check:contrast` whenever introducing new UI surfaces or tokens

### 6. Settings Page Guidelines (P2)

#### Layout Requirements

- Group controls with `<fieldset>` elements and descriptive `<legend>` titles
- Maintain consistent form structure (either one form per section or a single form containing multiple fieldsets)
- Wrap each control in `<div class="settings-item">` to guarantee spacing and alignment
- Apply `.game-mode-toggle-container` for sections that should render in responsive grids

#### Settings Item Structure

```html
<div class="settings-item">
  <label for="example-toggle">Example Toggle</label>
  <p class="settings-description">Explains what the option does.</p>
</div>
```

#### Responsive Design & Navigation

- Render three-column grids on desktop, stacking to a single column on mobile
- Order markup top-to-bottom to match the desired tab sequence
- Display all sections at once—avoid collapsible containers to simplify automation

#### Styling Guidelines

- Reuse existing classes (`.settings-form`, `.settings-item`, `.flag-description`) instead of creating new ones
- Keep typography consistent: Russo One for headings, base font for descriptive text
- Use CSS variables (e.g., `--color-primary`) rather than hard-coded hex values
- Ensure toggles include `data-tooltip-id` (and `data-flag` for feature toggles) so helper systems can attach copy and automation hooks

#### Accessibility & UX Expectations

- Guarantee keyboard access with visible focus states and appropriate `aria-label` or `aria-describedby`
- Maintain a minimum interactive size of 44×44px and provide immediate feedback (snackbar or UI state) on change
- Screen readers should announce updates using native semantics or dedicated `role="alert"` regions
- Preserve instant-apply behavior—settings save automatically without a dedicated "Save" button

#### Feature Flags & Observability

- Group feature toggles under a dedicated `Feature Flags` fieldset using `.game-mode-toggle-container`
- Follow predictable naming conventions (`id="feature-kebab-case"`, `name="camelCase"`, include `data-flag`)
- Confirm UI reflects persisted values on load and surface flag changes through snackbars or messaging hooks

#### Links & Error Handling

- Provide a `Links` fieldset containing navigation to `changeLog.html`, PRD viewer, mockup viewer, tooltip viewer, and vector search tools
- Assign sequential `tabindex` values for supplemental links and ensure responsive stacking below 768px
- Include an error container (e.g., `<div id="settings-error-popup" role="alert" aria-live="assertive">`) for surfaced issues and ensure messages auto-dismiss after a short timeout

### 7. PRD Authoring Standards (P1)

#### Required Sections

- Title/TL;DR summarizing the feature purpose
- Problem statement articulating the user or business gap
- Goals and success metrics that justify the work
- Persona-driven user stories following the "As a [user], I want [action] so that [outcome]" pattern
- Prioritized functional requirements with P1/P2/P3 tagging and concise descriptions
- Acceptance criteria translating requirements into verifiable outcomes
- Non-functional requirements covering accessibility, performance, or UX constraints
- Dependencies, open questions, and follow-up tasks or risks

#### Prioritized Requirements Expectations

- Present requirements in tabular form (Priority, Feature, Description) for readability and automation
- Document discrete behaviors (timers, scoring, navigation) separately for clarity
- Add supporting notes after the table when nuanced behavior needs further explanation

#### Acceptance Criteria Discipline

- Provide measurable, testable statements covering success and failure scenarios
- Pair each high-priority requirement with at least one acceptance bullet that can be validated manually or via automation
- Maintain consistent formatting (bulleted lists, present-tense imperatives) to support review checklists and linting

#### Additional Authoring Notes

- Reference related PRDs to document dependencies and prevent conflicting guidance
- Use precise language that can map to automated tests or validation scripts
- Update PRDs alongside implementation changes so they remain the canonical source of truth

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
  npm run check:jsdoc && npx prettier . --check && npx eslint . && npx vitest run && npx playwright test && npm run check:contrast
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

This PRD supersedes the retired `design/codeStandards` documents and consolidates their guidance into this canonical reference:

- `codeJSDocStandards.md` – JSDoc formatting and documentation requirements
- `codeNamingPatterns.md` – Function naming conventions and patterns
- `codePseudocodeStandards.md` – Pseudocode documentation standards
- `codeUIDesignStandards.md` – UI design principles, tokens, and component guidelines
- `settingsPageDesignGuidelines.md` – Layout, accessibility, and feature flag requirements for settings interfaces
- `prdRulesForAgents.md` – Structure, priorities, and acceptance criteria expectations for new PRDs
