# Contributing to JU-DO-KON

_Last reviewed: 2026-02-13_

This document summarizes the key steps and rules for submitting pull requests.
It consolidates the instructions from `AGENTS.md` and the design documents so contributors can quickly confirm the required checks and documentation standards.

**Content Ownership**: This file provides practical contributor guidance. For comprehensive agent rules, see [AGENTS.md](./AGENTS.md). For detailed validation workflows, see [PRD: Development Standards – Validation Command Matrix](./design/productRequirementsDocuments/prdDevelopmentStandards.md#validation-command-matrix--operational-playbooks) and the test-focused playbooks in [PRD: Testing Standards – Quality Verification Commands](./design/productRequirementsDocuments/prdTestingStandards.md#quality-verification-commands-operational-reference).

Start with the top-level documentation map: [docs/INDEX.md](./docs/INDEX.md).

The project ships directly as static ES modules without a build step.

### Terminal Safety

When running terminal searches like `grep` or `find`, exclude `client_embeddings.json` and `offline_rag_metadata.json` to prevent output overflow. See [AGENTS.md](./AGENTS.md#terminal-safety) for details.

### Code Navigation Workflow

Use targeted lookups before edits:

```bash
rg -n "<symbol-or-topic>" src tests docs -g "!client_embeddings.json"
rg --files src tests docs | rg "<feature-or-file-name>"
```

Open the nearest implementation + test pair and expand scope only if needed.

### Data Test IDs

- Include a `data-testid` on interactive elements needed for automation.
- Keep existing `id` attributes for runtime hooks but query via `data-testid` in tests.

---

## ✅ Required Programmatic Checks

### Summary

- Run formatting, lint, JSDoc, and data checks as baseline quality gates before pushing.
- Run targeted Vitest and Playwright coverage for the files and flows you changed; expand only when change scope requires it.
- Include contrast/style checks when UI or visual behavior changes.
- Resolve all failures before commit so PR reviewers can focus on behavior, not broken checks.

Canonical links: **[PRD: Development Standards – Validation Command Matrix](./design/productRequirementsDocuments/prdDevelopmentStandards.md#validation-command-matrix--operational-playbooks)** · **[PRD: Testing Standards – Quality Verification Commands](./design/productRequirementsDocuments/prdTestingStandards.md#quality-verification-commands-operational-reference)**.

**Test Helpers Documentation:** See [tests/helpers/README.md](./tests/helpers/README.md) for shared utilities and best practices for writing reliable unit tests.

**Component Factory Documentation:** See [tests/helpers/components/README.md](./tests/helpers/components/README.md) for standardized component factories that provide realistic mock implementations for testing high-traffic UI components.

- Confirm that any new or modified functions include JSDoc with an `@pseudocode` block so documentation stays complete.
- Playwright tests clear localStorage at startup. If a manual run fails unexpectedly, clear it in your browser and ensure [http://localhost:5000](http://localhost:5000) is served (start it with `npm start`).
- Use `src/helpers/storage.js` for persistent data access instead of direct `localStorage` calls.
- Use the shared scheduler (`src/utils/scheduler.js`) for all timing-sensitive work instead of standalone timers.

### Branch Protection Required Checks

The default branch protection should only require active CI workflows. Remove any required checks tied to deleted or retired workflows so PRs are not blocked waiting for non-existent jobs.

Recommended required checks:

- `ESLint`
- `Run Unit Tests`
- `JSDoc Check`
- `Playwright Patterns`

### Animation Scheduler Guidelines

- Use `requestAnimationFrame` for one‑shot UI updates (e.g., toggling a class on the next frame).
- Avoid `scheduler.onFrame()` for one‑off work — it registers a persistent callback; repeated use during timers can leak callbacks and stall the UI.
- Reserve `scheduler.onFrame()` for continuous per‑frame tasks and always cancel with `scheduler.cancel(id)` when done.

**For UI-related changes (styles, components, layout):**

- Confirm visual correctness on modern desktop resolutions.
- Use feature flags for experimental features if applicable.
- Run and validate the Layout Debug Panel if working on visuals.

### Playwright CLI for UI Design Validation

Use the Playwright CLI to record user flows, validate selectors, and generate design baselines:

```bash
# Start interactive recording session
npm run test:ui:codegen

# Inspect a saved trace file
npm run test:ui:trace <path-to-trace-file>

# Install browser dependencies (run once per environment)
npx playwright install
```

**When to use:**

- Recording new user flows for design documentation
- Validating `data-testid` attributes and semantic selectors
- Creating screenshot baselines for visual regression testing
- Debugging layout or interaction issues

**Key principles:**

- Use semantic selectors (`data-testid`, `role=`) instead of implementation-detail CSS selectors
- Record interactions naturally (`click()`, `fill()`, `press()`) without synthetic events
- Always capture contrast and focus indicators for accessibility validation
- Generate traces with full network/timeline data for debugging context

**Artifacts:** All recordings are saved to `artifacts/` with descriptive flow names and timestamps. See [judokon-playwright-cli skill](.github/skills/judokon-playwright-cli/SKILL.md) for detailed usage.

### Generating Mermaid Diagrams with mermaid-cli

Use mermaid-cli to generate diagrams programmatically from `.mmd` files:

```bash
# Generate SVG diagram
npm run diagram:gen -i flowchart.mmd -o flowchart.svg

# Generate PNG with project theme
node scripts/runMermaid.js -i diagram.mmd -o diagram.png

# Quick preview (saves to /tmp/preview.svg)
npm run diagram:preview
```

**When to use:**

- Exporting PRD diagrams as static assets (PNG, SVG, PDF)
- Generating diagram families from data structures
- Creating documentation archives
- Converting diagram sources to image formats for sharing

**Configuration:** Defaults are set in `mermaid.config.json` (theme, output format, CSS). Override per-command using mermaid-cli flags as needed. See [judokon-mermaid-creator skill](.github/skills/judokon-mermaid-creator/SKILL.md) for full CLI documentation.

---

## 👤 Contributing as a Human Collaborator

Please follow these practices:

- Write descriptive commit messages
- Keep pull requests focused (1 feature/fix per PR)
- Document any new feature in the README or relevant docs/page
- Prefer clarity over cleverness in code
- Submit Playwright snapshots if visual updates are involved

---

## 🤖 Contributing as an AI Agent

AI contributors should follow a structured and predictable format when submitting contributions. These rules help humans and other agents review and trace AI-generated changes.

Before scanning broadly for any question-style prompt, start with targeted file lookup (`rg`) to identify the closest implementation and test coverage first.

### 🎯 Scope of Work

AI agents are encouraged to contribute in areas such as:

- Tooltips (`tooltips.json`) – adding, validating, or updating entries
- PRD generation or review (start with `design/productRequirementsDocuments/INDEX.md`, then open targeted docs)
- Layout, accessibility, and stat consistency checks
- Feature flag testing
- Prompt engineering and agent documentation

### 📐 Contribution Expectations

- Output must be structured (Markdown, JSON, HTML, etc.) with consistent formatting
- Include a reference to the originating user prompt or task context in the PR description
- Avoid speculative or filler content (e.g., “TBD”, “Lorem ipsum”)
- Exclude unrelated or opportunistic refactors unless explicitly asked

---

## 🏷 Commit Format for AI Agents

Use descriptive and consistent prefixes to signal agent activity:

- `chore(agent): tooltip audit for settings panel`
- `feat(agent): generate PRD for Card of the Day feature`
- `fix(agent): resolve stat mismatch in judoka.json`

Each commit should represent a logical unit of work aligned with a specific prompt or task.

---

## 🧪 Validation and Logs

Where applicable, attach a brief checklist or self-review log in the PR description. This can include:

- ✅ Formatting verified
- ✅ Tests updated or added
- ✅ Linked to originating user task
- ✅ Aligned with AGENTS.md requirements

This helps reviewers validate AI-generated work more quickly.

---

## 🚫 Anti-Patterns to Avoid

- ❌ Don’t commit placeholder content (e.g. xxx, TODO, lorem)
- ❌ Don’t generate unrelated files or assets unless prompted
- ❌ Don’t refactor files that aren’t directly related to the task
- ❌ Don’t ignore requested formats (e.g. return PRDs in Markdown if specified)

- ❌ Don’t manipulate the DOM directly in tests

  Justification: directly mutating DOM nodes in unit or integration tests (for example calling
  appendChild/replaceChildren, setting innerHTML, toggling classes, or changing attributes to
  simulate state) bypasses the application’s runtime logic, lifecycle hooks, accessibility
  attributes, and scheduling. That makes tests brittle and can hide regressions — tests may
  pass because they short-circuit real code paths rather than exercising them.

  Recommended alternatives:
  - Drive behavior through public APIs and helpers (e.g. click handlers, `setup*` helpers,
    orchestrator mocks) so tests exercise the same code the app runs in production.
  - Use user-focused testing helpers (Playwright `page.click`/`page.fill`, @testing-library's
    `userEvent` / `fireEvent`) to simulate interactions instead of directly mutating nodes.
  - In unit tests prefer querying and asserting observable state changes (DOM queries,
    emitted events, store/orchestrator calls) rather than checking implementation details.
  - If a test must manipulate DOM (rare), isolate it, document why it's required, restore
    the DOM state after the test, and prefer using helper fixtures rather than ad-hoc mutations.

  Short rule: assert behavior, not implementation; simulate users, not internals.

---

## 🧪 Unit Test Quality Standards

### Anti-Pattern Prevention

The following patterns have been systematically eliminated from our test suite and must not be reintroduced:

**❌ Prohibited Patterns:**

- **Direct DOM Manipulation**: Don't call `appendChild`, `innerHTML`, or manually create DOM elements
- **Synthetic Event Dispatching**: Don't use `dispatchEvent` or `createEvent` for user interactions
- **Raw Console Spies**: Don't use `vi.spyOn(console, 'error')` without proper muting
- **Real Timers**: Don't use `setTimeout`/`setInterval` in deterministic tests
- **Manual Element Creation**: Don't create DOM nodes without component factories

**✅ Required Patterns:**

- **Natural Component Interaction**: Use public APIs and component test utilities
- **Keyboard/Gesture Simulation**: Use `pressKey()` and `simulateGesture()` helpers
- **Console Discipline**: Use `withMutedConsole()` for all error-generating tests
- **Fake Timer Control**: Use `vi.useFakeTimers()` with `vi.runAllTimersAsync()`
- **Component Factories**: Use standardized test component creation utilities

### Testing Infrastructure

**Component Test Utilities (`tests/utils/componentTestUtils.js`):**

```js
// Natural interaction patterns
const { container, pressKey, simulateGesture } = createTestComponent(componentFactory);
await pressKey("ArrowLeft"); // Keyboard navigation
await simulateGesture("swipeLeft"); // Gesture interaction
```

**Console Discipline (`tests/utils/console.js`):**

```js
import { withMutedConsole } from "../utils/console.js";

// Standard pattern for error testing
await withMutedConsole(async () => {
  expect(() => functionThatLogs()).toThrow();
});
```

**Timer Management:**

```js
// Setup for deterministic timing control
beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.runAllTimers();
  vi.restoreAllMocks();
});

// Advance timers deterministically
await vi.runAllTimersAsync();
```

### Quality Verification Commands

### Summary

- Validate unit tests against the anti-pattern policy (natural interactions, muted console output, deterministic timers).
- Confirm new/updated tests include at least one happy-path and one edge-case assertion where applicable.
- Keep verification scoped to touched modules first, then expand if shared behavior is affected.

Canonical link: [PRD: Testing Standards – Quality Verification Commands](./design/productRequirementsDocuments/prdTestingStandards.md#quality-verification-commands-operational-reference).

### Performance and Reliability Goals

- **Deterministic Execution**: No flaky tests due to timing or async issues
- **Clean Console Output**: No unsilenced warnings or errors in test runs
- **Natural User Simulation**: Test interactions as users would perform them
- **Component-Driven Testing**: Exercise real code paths instead of shortcuts
- **Fast Execution**: Fake timers eliminate real delays and improve speed

---

## 🎭 Playwright Test Quality Standards

### Anti-Pattern Prevention

The following patterns have been identified as problematic in end-to-end testing and must be avoided:

**❌ Prohibited Patterns:**

- **Direct DOM Manipulation**: Don't use `page.evaluate()` to manually modify DOM elements
- **Hardcoded Wait Times**: Don't use `page.waitForTimeout()` with fixed milliseconds
- **Implementation Detail Selectors**: Don't use complex CSS selectors that break on refactoring
- **Manual State Management**: Don't manually clear localStorage or modify global state in individual tests
- **Assertions Without Waiting**: Don't use basic assertions without proper condition waiting

**✅ Required Patterns:**

- **Natural User Interactions**: Use `page.click()`, `page.fill()`, `page.press()` for real user actions
- **Conditional Waiting**: Use `page.waitForSelector()`, `page.waitForLoadState()` for specific conditions
- **Semantic Selectors**: Use `data-testid`, `role=`, or accessible names for reliable element targeting
- **Centralized Setup**: Use fixtures and global setup for consistent test state management
- **Auto-Retrying Assertions**: Use `expect().toHaveText()` with built-in retry mechanisms

### Playwright Infrastructure

**Natural User Interactions:**

```js
// Real user actions that match production usage
await page.click('[data-testid="submit-button"]');
await page.fill('[data-testid="username-input"]', "testuser");
await page.press("body", "Escape");
await page.selectOption('[data-testid="dropdown"]', "option-value");
```

**Proper Waiting Strategies:**

```js
// Wait for specific conditions, not arbitrary time
await page.waitForSelector('[data-testid="success-message"]');
await page.waitForLoadState("networkidle");
await expect(page.locator('[data-testid="result"]')).toBeVisible();
```

**Semantic Selector Strategy:**

```js
// Robust selectors that survive refactoring
await page.click('[data-testid="navigation-menu"]');
await page.click('role=button[name="Submit"]');
await page.getByLabel("Username").fill("testuser");

// Avoid implementation details
// ❌ await page.click('.menu > div:nth-child(2) > button.primary');
```

**Test State Management:**

```js
// Use fixtures for consistent setup
test.beforeEach(async ({ page }) => {
  await page.goto("/test-page");
  await page.waitForLoadState("networkidle");
});

// Use global setup for authentication/data seeding
// See playwright.config.js globalSetup configuration
```

### Quality Verification Commands

### Summary

- Prefer semantic selectors and natural user interactions in Playwright coverage.
- Avoid hardcoded waits and direct DOM mutation patterns in end-to-end tests.
- Confirm assertions rely on auto-retry-aware expectations for asynchronous UI states.

Canonical link: [PRD: Testing Standards – Quality Verification Commands](./design/productRequirementsDocuments/prdTestingStandards.md#quality-verification-commands-operational-reference).

### Performance and Reliability Goals

- **No Flaky Tests**: Conditional waiting eliminates timing-dependent failures
- **Maintainable Selectors**: Semantic selectors survive UI refactoring
- **Real User Simulation**: Test interactions match actual user behavior patterns
- **Proper Test Isolation**: Consistent setup/teardown prevents test interdependencies
- **Auto-Retry Reliability**: Built-in assertion retries handle async state changes

---

## Testing Discipline: Keep Vitest Output Clean (console.warn / console.error)

To keep CI and local runs readable, **no test should emit unsilenced `console.warn` or `console.error`**. Expected logs must be **stubbed, spied, or muted**.

### Agent / Developer Checklist

- Wrap code paths that intentionally log with **`withMutedConsole(fn)`** (see helper below), or
- Use `vi.spyOn(console, 'error').mockImplementation(() => {})` (same for `warn`) for the narrowest scope possible.
- If a test _must_ allow logs, wrap the specific execution in `withAllowedConsole(fn)`.
- Never leave raw `console.warn/error` in production code. Prefer domain-specific loggers or error channels.

---

### Classic Battle DOM Guardrails

Battle helpers such as `setupNextButton` and `initStatButtons` throw when key elements (e.g. `#next-button`, `#stat-buttons`) are missing. Tests must either provide these nodes or assert the thrown errors to avoid unintended failures.

---

## 🧭 Module Loading Policy

Use static imports for hot paths and always-required modules; use dynamic imports with preload for optional or heavy features. See the canonical [Module Loading Policy for Agents](./AGENTS.md#module-loading-policy-for-agents) for the full policy.

---

## 🔄 Migration Notes: Classic Battle Dispatch

- All Classic Battle events now dispatch through a single pathway: `orchestrator.dispatchBattleEvent`.
- Modules should import `dispatchBattleEvent` from `orchestrator.js`.
- The orchestrator internally creates and stores the machine; consumers do not call `setMachine`.
- Tests can mock `orchestrator.dispatchBattleEvent` to observe transitions.

---

## 📎 Related AI Agent Docs

- `AGENTS.md` – Tasks, prompts, and expectations for agents
- `architecture.md` – Feature flags, data observability, testing conventions
- `README.md` – Project overview, setup, and gameplay

---

Thank you for helping improve JU-DO-KON! Whether human or AI, your contributions matter. 🙌
