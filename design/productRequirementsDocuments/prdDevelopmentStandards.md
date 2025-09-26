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

**Core Design Principles:**

- Touch-first interaction (minimum 48x48px targets)
- Responsive feedback for all interactions
- Visual hierarchy with clear information prioritization
- Progressive disclosure of complex features
- WCAG AA accessibility compliance
- Consistent component reuse patterns

**Color System:**

- Primary: #CB2504 (buttons, highlights)
- Structured token-based color usage
- High contrast requirements for accessibility
- Consistent application across components

**Component Structure:**

- Flat color with geometric background textures
- Layered card layouts with z-depth
- Emphasis typography (caps, bold, white-on-color)
- Panelled layout with modular sections

### 6. Settings Page Guidelines (P2)

**Layout Requirements:**

- Section grouping with `<fieldset>` elements and descriptive `<legend>` titles
- Consistent form structure across all sections
- Settings item containers using `<div class="settings-item">`
- Responsive grid layout using `.game-mode-toggle-container` class

**Structure Template:**

```html
<div class="settings-item">
  <label for="example-toggle">Example Toggle</label>
  <p class="settings-description">Explains what the option does.</p>
</div>
```

**Responsive Design:**

- 3-column layout on desktop
- 1-column stacked layout on mobile
- Logical keyboard navigation order
- Simultaneous section display (no collapsible containers)

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

This PRD consolidates content from the following design/codeStandards files:

- `codeJSDocStandards.md` - JSDoc formatting and documentation requirements
- `codeNamingPatterns.md` - Function naming conventions and patterns
- `codePseudocodeStandards.md` - Pseudocode documentation standards
- `codeUIDesignStandards.md` - UI design principles and component standards
- `settingsPageDesignGuidelines.md` - Specific layout requirements for settings interfaces
