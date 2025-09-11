# Contributing to JU-DO-KON!

This document summarizes the key steps and rules for submitting pull requests.
It consolidates the instructions from `AGENTS.md` and the design documents so contributors can quickly confirm the required checks and documentation standards.

The project ships directly as static ES modules without a build step.

### Terminal Safety

When running terminal searches like `grep` or `find`, exclude `client_embeddings.json` and `offline_rag_metadata.json` to prevent output overflow. See [AGENTS.md](./AGENTS.md#terminal-safety) for details.

### Data Test IDs

- Include a `data-testid` on interactive elements needed for automation.
- Keep existing `id` attributes for runtime hooks but query via `data-testid` in tests.

---

## ✅ Required Programmatic Checks

Before committing any changes, run the following commands from the repository root. Fix any issues and rerun the checks until they all pass:

```bash
npx prettier . --check # verify formatting
npx eslint . # lint the codebase
npx vitest run # run unit tests
npm run test:style # run style tests on demand
npx playwright test # run Playwright UI tests
npm run check:jsdoc # ensure exported helpers have JSDoc + @pseudocode
npm run rag:validate # RAG preflight + evaluator + JSON + hot‑path checks
```

### Test Quality Verification

In addition to the above checks, verify test quality standards compliance:

```bash
# Unit Test Quality Verification
echo "Checking unit test patterns..."
grep -r "dispatchEvent\|createEvent" tests/ && echo "❌ Found synthetic events" || echo "✅ No synthetic events"
grep -r "console\.(warn\|error)" tests/ | grep -v "tests/utils/console.js" && echo "❌ Found unsilenced console" || echo "✅ Console discipline maintained"
grep -r "setTimeout\|setInterval" tests/ | grep -v "fake\|mock" && echo "❌ Found real timers" || echo "✅ Timer discipline maintained"

# Playwright Test Quality Verification  
echo "Checking Playwright test patterns..."
grep -r "waitForTimeout\|setTimeout" playwright/ && echo "❌ Found hardcoded waits" || echo "✅ No hardcoded timeouts"
grep -r "page\.evaluate.*DOM\|innerHTML\|appendChild" playwright/ && echo "❌ Found DOM manipulation" || echo "✅ No DOM manipulation"
echo "Semantic selectors count:" && grep -r "data-testid\|role=\|getByLabel" playwright/ | wc -l
```

- Confirm that any new or modified functions include JSDoc with an `@pseudocode` block so documentation stays complete.
- Playwright tests clear localStorage at startup. If a manual run fails unexpectedly, clear it in your browser and ensure [http://localhost:5000](http://localhost:5000) is served (start it with `npm start`).
- Use `src/helpers/storage.js` for persistent data access instead of direct `localStorage` calls.
- Use the shared scheduler (`src/utils/scheduler.js`) for all timing-sensitive work instead of standalone timers.

### RAG Contribution Checklist

- Use `queryRag` to collect context before large refactors or doc changes; prefer `withProvenance: true` and include `contextPath` in PR descriptions when relevant.
- For offline/CI environments, hydrate the local model once:

  ```bash
  npm run rag:prepare:models
  # or hydrate from an existing directory of MiniLM files
  npm run rag:prepare:models -- --from-dir /path/to/minilm
  ```

- Enforce strict offline in CI jobs that run RAG queries:

  ```bash
  RAG_STRICT_OFFLINE=1 npm run rag:validate
  ```

- Optional degraded mode: if you must run queries without a model, enable lexical fallback explicitly (do not leave it on by default):

  ```bash
  RAG_ALLOW_LEXICAL_FALLBACK=1 npm run rag:query "tooltip guidelines"
  ```

Notes:

- The model is expected under `src/models/minilm`. The preflight will fail if strict offline is enabled and files are missing.
- Keep tests free of unsuppressed `console.warn/error`. Use `withMutedConsole` or spies as needed.

### Animation Scheduler Guidelines

- Use `requestAnimationFrame` for one‑shot UI updates (e.g., toggling a class on the next frame).
- Avoid `scheduler.onFrame()` for one‑off work — it registers a persistent callback; repeated use during timers can leak callbacks and stall the UI.
- Reserve `scheduler.onFrame()` for continuous per‑frame tasks and always cancel with `scheduler.cancel(id)` when done.

**For UI-related changes (styles, components, layout):**

- Confirm responsiveness and visual correctness in desktop and simulated mobile viewport.
- Use feature flags for experimental features if applicable.
- Run and validate Viewport Simulation and Layout Debug Panel if working on visuals.

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

Before scanning files for any question‑style prompt (for example, beginning with
"Explain" or "How does"), run [`queryRag`](./src/helpers/queryRag.js) to collect
relevant context from the embeddings. See
[example vector queries](design/agentWorkflows/exampleVectorQueries.md#queryrag-helper)
for deeper patterns.

### 🎯 Scope of Work

AI agents are encouraged to contribute in areas such as:

- Tooltips (`tooltips.json`) – adding, validating, or updating entries
- PRD generation or review (`docs/prd/`)
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
await pressKey('ArrowLeft'); // Keyboard navigation
await simulateGesture('swipeLeft'); // Gesture interaction
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

Before submitting PRs, verify test quality compliance:
```bash
# Check for synthetic events
grep -r "dispatchEvent\|createEvent" tests/ && echo "❌ Found synthetic events"

# Check for console discipline  
grep -r "console\.(warn\|error)" tests/ | grep -v "tests/utils/console.js" && echo "❌ Found unsilenced console"

# Check for real timers
grep -r "setTimeout\|setInterval" tests/ | grep -v "fake\|mock" && echo "❌ Found real timers"
```

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
await page.fill('[data-testid="username-input"]', 'testuser');
await page.press('body', 'Escape');
await page.selectOption('[data-testid="dropdown"]', 'option-value');
```

**Proper Waiting Strategies:**
```js
// Wait for specific conditions, not arbitrary time
await page.waitForSelector('[data-testid="success-message"]');
await page.waitForLoadState('networkidle');
await expect(page.locator('[data-testid="result"]')).toBeVisible();
```

**Semantic Selector Strategy:**
```js
// Robust selectors that survive refactoring
await page.click('[data-testid="navigation-menu"]');
await page.click('role=button[name="Submit"]');
await page.getByLabel('Username').fill('testuser');

// Avoid implementation details
// ❌ await page.click('.menu > div:nth-child(2) > button.primary');
```

**Test State Management:**
```js
// Use fixtures for consistent setup
test.beforeEach(async ({ page }) => {
  await page.goto('/test-page');
  await page.waitForLoadState('networkidle');
});

// Use global setup for authentication/data seeding
// See playwright.config.js globalSetup configuration
```

### Quality Verification Commands

Before submitting PRs, verify Playwright test quality compliance:
```bash
# Check for hardcoded timeouts
grep -r "waitForTimeout\|setTimeout" playwright/ && echo "❌ Found hardcoded waits"

# Check for semantic selector usage
grep -r "data-testid\|role=\|getByLabel" playwright/ | wc -l && echo "✅ Semantic selectors count"

# Check for DOM manipulation
grep -r "page\.evaluate.*DOM\|innerHTML\|appendChild" playwright/ && echo "❌ Found DOM manipulation"
```

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
