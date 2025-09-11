# 🤖 JU-DO-KON! Agent Guide

**Purpose**: Define d---

## 🎯 Quick Reference Cards

### 🔍 Context Acquisition
```bash
# Start with RAG for any question
queryRag("How does the battle engine work?")

# Key files to check
src/data/tooltips.json        # Tooltip content
src/data/judoka.json          # Card data
src/config/settingsDefaults.js # Settings source of truth
```

### 📋 Task Contract Template
```json
{
  "inputs": ["src/classicBattle.js", "tests/battle.test.js"],
  "outputs": ["src/classicBattle.js", "tests/battle.test.js"],
  "success": ["eslint: PASS", "vitest: PASS", "no_unsilenced_console"],
  "errorMode": "ask_on_public_api_change"
}
```

### ✅ Essential Validation
```bash
# Core validation (run before commit)
npm run check:jsdoc && npx prettier . --check && npx eslint . && npx vitest run && npx playwright test && npm run check:contrast

# Agent-specific checks
grep -RIn "await import\(" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle && echo "❌ Dynamic import in hot path"
```

### 🚫 Critical Violations
- ❌ Dynamic imports in hot paths (`src/helpers/classicBattle*`, `battleEngineFacade.js`)
- ❌ Unsilenced `console.warn/error` in tests (use `withMutedConsole`)
- ❌ Functions >50 lines without refactoring
- ❌ Missing `@pseudocode` in public function JSDoc
- ❌ Modifying public APIs without explicit approval

---

## 🗂️ Workflow Orderrministic rules, workflows, and safety requirements for AI Agents operating in the JU-DO-KON! repository.  
**Audience**: AI Agents only. Human readability is not the priority.

**Content Ownership**: This file is the authoritative source for agent-specific rules, validation commands, and quality standards. Other documentation files reference this for agent-specific details.

**Quick Reference**: [docs/validation-commands.md](./docs/validation-commands.md) | [docs/rag-system.md](./docs/rag-system.md)

---

## ⚡ Executive Summary

**Quick Orientation for AI Agents (30-second read):**

1. **Default to RAG first** - Query `queryRag("your question")` for any "How/Why/What/Where" questions (15x faster than manual exploration)
2. **Follow 5-step workflow** - Context → Task Contract → Implementation → Validation → Delivery  
3. **Core validation suite** - `npm run check:jsdoc && npx prettier . --check && npx eslint . && npx vitest run && npx playwright test && npm run check:contrast`
4. **Critical rules** - No dynamic imports in hot paths, no unsilenced console in tests, include @pseudocode in JSDoc
5. **Key files** - `src/data/tooltips.json`, `src/data/judoka.json`, `src/config/settingsDefaults.js`
6. **Quality standards** - Functions ≤50 lines, test happy+edge cases, maintain net-better repo state
7. **Hot path protection** - Use static imports in `src/helpers/classicBattle*`, `battleEngineFacade.js`
8. **Machine-readable rules** - See JSON ruleset at bottom of document for programmatic access
9. **Task contracts required** - Declare inputs/outputs/success/error before execution
10. **Complete validation reference** - [docs/validation-commands.md](./docs/validation-commands.md) contains all commands and troubleshooting

**JSON Ruleset Location**: [Line 545+](#machine-readable-ruleset) | **RAG Guide**: [docs/rag-system.md](./docs/rag-system.md)

---

## � Table of Contents

- [⚡ Executive Summary](#-executive-summary)
- [🗂️ Workflow Order](#️-workflow-order)  
- [🎯 Core Principles](#-core-principles)
- [🧠 RAG Policy](#-rag-retrieval-augmented-generation-policy)
- [📚 Key Repository Targets](#-key-repository-targets)
- [🧪 Task Contract](#-task-contract)
- [✅ Evaluation Criteria](#-evaluation-criteria)
- [⚔️ Classic Battle Testing](#️-classic-battle-testing)
- [🧪 Unit Test Quality Standards](#-unit-test-quality-standards)
- [🎭 Playwright Test Quality Standards](#-playwright-test-quality-standards)
- [🧯 Runtime Safeguards](#-runtime-safeguards)
- [🔧 Import Policy](#-import-policy)
- [🛠 Validation Commands](#-validation-commands)
- [🧪 Log Discipline](#-log-discipline)
- [📦 PR Delivery Rules](#-pr-delivery-rules)
- [🧭 Plan Discipline](#-plan-discipline-for-bots)
- [📊 Machine-Readable Ruleset](#-machine-readable-ruleset)

---

## �🗂️ Workflow Order

1. Context acquisition (queryRag, key file references)
2. Task contract definition (inputs/outputs/success/error)
3. Implementation (import policy, coding rules)
4. Validation (lint, format, tests, contrast, logs)
5. Delivery (PR body with verification summary)
```bash
# Fail if dynamic import appears in hot paths
grep -RIn "await import\(" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle 2>/dev/null
  && echo "Found dynamic import in hot path" && exit 1 || true

# Fail if unsilenced console.warn/error found in tests (ignore utility wrapper)
grep -RInE "console\.(warn|error)\(" tests | grep -v "tests/utils/console.js"
  && echo "Unsilenced console found" && exit 1 || true

# JSON validation
npm run validate:data

# RAG validation
npm run rag:validate
```

**For complete validation commands, quality verification, and troubleshooting, see [docs/validation-commands.md](./docs/validation-commands.md).**ody with verification summary)

---

## 🎯 Core Principles

- Maintain clarity, modularity, determinism.
- Do not silently modify public APIs, schemas, or user-facing text.
- Ensure all outputs are verifiable (tests, linters, CI must pass).

## Policy Manifest

```json
{
  "must": ["no_dynamic_imports_in_hot_paths", "no_unsilenced_console_warn_error_in_tests"],
  "should": ["preload_optional_modules", "add_pseudocode_for_public_functions"],
  "must_not": ["placeholder_text_tooltips", "duplicate_stat_labels"]
}
```

---

## 🧠 RAG (Retrieval-Augmented Generation) Policy

This project contains a high-performance vector database with 16,000+ indexed chunks covering documentation, code standards, and game rules. RAG queries return results in ~2 seconds with 62.5% accuracy for finding correct sources.

**See also**: [Quick Reference Cards](#-quick-reference-cards) | [docs/rag-system.md](./docs/rag-system.md) for complete usage guide

### 🚀 Performance Benefits

- **⚡ 15x Speed Boost:** 2-second RAG queries vs 30+ seconds of manual exploration
- **🎯 High Accuracy:** 62.5% success rate for implementation queries, 95% for design docs
- **🧠 Comprehensive Coverage:** PRDs, design guidelines, code patterns, and test examples
- **📊 Proven Success:** Currently serving production-level results for architectural queries

### ⚡ Simple Usage Rule

**Default to RAG for ANY question containing:** "How", "Why", "What", "Where", "Which", or when requesting examples/references.

**When in doubt → Query RAG first.**

### 🎯 Optimized Query Patterns

**High-Success Examples:**

```
✅ "tooltip implementation data structure JSON format"
✅ "navigation bar button transition duration styling"
✅ "classic battle mode game timer phases scoreboard"
✅ "judoka bio tone guidelines character design"
```

**Pattern Guide:**

- Include **file types**: "JSON structure", "CSS styling", "JavaScript function"
- Add **context**: "configuration", "data format", "UI component"
- Use **technical terms**: "implementation", "validation", "guidelines"

### 🔄 Smart Workflow

1. **Primary RAG Query** → Use user's terms with optimization
2. **If results are weak** → Rephrase with technical/synonym terms
3. **If still weak** → Use broader category approach
4. **Final step** → Combine RAG context with targeted file search

### 💡 Success Examples from Production

**Query:** `"tooltip content validation requirements"`  
**Result:** Found PRD with validation rules (25 seconds saved)  
**Outcome:** Accurate implementation matching established patterns

**Query:** `"weight category definitions data structure"`  
**Result:** Found exact JSON structure (15 seconds saved)  
**Outcome:** Correct implementation on first attempt

### 📋 Quick Reference

- **Strong Categories:** Design docs (95%), PRDs (90%), Architecture (85%)
- **Improving Categories:** Implementation files (35% → targeting 60%)
- **Detailed Guide:** See [`ragUsageGuide.md`](design/agentWorkflows/ragUsageGuide.md)

You **MUST** use RAG as your first step for questions related to:

1. **"How-to" or "Why"** questions
2. **Definitions** and terminology
3. **Conventions and Standards**
4. **Existing Implementations** and examples

### Workflow

1.  **Receive user prompt.**
2.  **Analyze the prompt.** If it matches any of the categories above, you **MUST** form a search query and call the RAG tool.
3.  **Incorporate RAG results.** Directly use the retrieved context in your answer or plan.
4.  **Cite your sources.** Reference the source documents from the RAG results (e.g., "According to `prdVectorDatabaseRAG.md`...").
5.  **Fallback.** If the RAG search returns no relevant results, you may then proceed with other tools like `glob` or `search_file_content`.

### Offline Usage (Agents)

- Strict offline (no network): set `RAG_STRICT_OFFLINE=1` so model/CDN downloads are not attempted. Ensure `src/models/minilm` exists; hydrate via `npm run rag:prepare:models` (or `--from-dir <path>` if you already have the files).
- Lexical fallback (optional, degraded): if the model is unavailable, set `RAG_ALLOW_LEXICAL_FALLBACK=1` or pass `{ allowLexicalFallback: true }` to `queryRag(...)` to use sparse lexical scoring against the offline corpus. Keep this feature-gated to avoid silent regressions.
- Provenance: prefer `withProvenance: true` and include the provided `contextPath` and `rationale` in your outputs.

### Agent Usage Tips (RAG)

- Prefer `queryRag({ withProvenance: true })` for “How/Why/What/Where/Which” questions to include `contextPath` and a short `rationale` explaining ranking.
- During development, you may pass `withDiagnostics: true` to receive `{ expandedQuery, multiIntentApplied, timingMs }` for debugging. Do not enable diagnostics in hot paths.
- For compound queries, RAG automatically splits simple conjunctions and re-ranks the union; still keep queries concise and specific.

Example:

```js
import queryRag from "./src/helpers/queryRag.js";
const results = await queryRag("classic battle countdown snackbar", {
  withProvenance: true,
  withDiagnostics: true
});
// results[0] → { id, text, score, source, tags, contextPath, rationale }
// results.diagnostics → { expandedQuery: "...", multiIntentApplied: true|false, timingMs }
```

### Example Agent Thought Process

> **User:** "How should I add a new tooltip?"
>
> **Agent's internal monologue:**
>
> 1. The user is asking "How should I...", which falls under the "How-to" category in the RAG policy.
> 2. I must use the RAG tool first. I will form a query.
> 3. **Tool Call:** `query_rag_database(query="adding a new tooltip")`
> 4. **Tool Output:** `[{ "source": "src/data/tooltips.json", "text": "Tooltips are defined in `tooltips.json` with an id and content.", "score": 0.91 }, ...]`
> 5. Now I can form my answer based on this high-confidence information. I will explain that tooltips are added to `src/data/tooltips.json` and describe the required format.

### Provenance

When using information from the RAG tool, include provenance for the facts:

- `Source: <doc>` — `Confidence: high|medium|low` — `Quote: "..."`.

RAG Provenance JSON schema:

```json
{
  "source": "design/agentWorkflows/exampleVectorQueries.md",
  "confidence": "high",
  "quote": "Use queryRag for architectural questions."
}
```

---

## 📚 Key Repository Targets

| Domain         | Files / Paths                                               |
| -------------- | ----------------------------------------------------------- |
| Tooltips       | `src/data/tooltips.json`                                    |
| Stats          | `src/data/judoka.json`, `src/data/statNames.js`             |
| Flags/Settings | `src/pages/settings.html`, `src/config/settingsDefaults.js` |
| Tooltip Viewer | `src/pages/tooltipViewer.html`                              |
| Factories      | `src/components/*.js`                                       |
| Battle Logic   | `classicBattle.js`, `setupScoreboard.js`, `Scoreboard.js`   |
| Entry Points   | `src/pages/*.html`                                          |
| Tests          | `tests/**/*.test.js`, `playwright/*.spec.js`                |

⚠️ Exclude from searches:

- `client_embeddings.json`
- `offline_rag_metadata.json`
- `eslint-dry.json`

---

## 🧪 Task Contract

Declare before execution:

- **Inputs**: explicit files/data/commands
- **Outputs**: changed files/tests/docs
- **Success**: all validation passes, no unsuppressed console logs
- **Error mode**: explicit stop conditions

Task Contract JSON template:

```json
{
  "inputs": ["src/classicBattle.js", "playwright/classicBattle.spec.js"],
  "outputs": ["src/classicBattle.js", "tests/classicBattle.spec.js"],
  "success": ["eslint: PASS", "vitest: PASS", "jsdoc: PASS", "no_unsilenced_console"],
  "errorMode": "ask_on_public_api_change"
}
```

---

## ✅ Evaluation Criteria

- Functions ≤50 lines, modular, single-purpose
- JSDoc `@pseudocode` for public + complex functions
- JSON validated (`npm run validate:data`)
- Repo state “net better” (clarity, naming, structure)
- ≥1 happy-path + 1 edge-case test for new logic

---

## ⚔️ Classic Battle Testing

- Initialize: `initClassicBattleTest({ afterMock: true })` after mocks
- Use event promises:
  - `getRoundPromptPromise`
  - `getCountdownStartedPromise`
  - `getRoundResolvedPromise`
  - `getRoundTimeoutPromise`
  - `getStatSelectionStalledPromise`
- Assert:
  - Round → `#round-message`
  - Countdown/hints → snackbar
- Cleanup: clear snackbar + `#round-message` after each test

---

## 🚫 Don’t manipulate the DOM directly in tests

Justification: directly mutating DOM nodes in unit or integration tests (for example calling
`appendChild`/`replaceChildren`, setting `innerHTML`, toggling classes, or changing attributes to
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

### Core Anti-Patterns to Eliminate

**❌ Avoid These Patterns:**

- Direct DOM manipulation (use natural interactions via component APIs)
- Synthetic event dispatching (use keyboard/mouse simulation utilities)
- Raw console.error/warn spies without muting (use withMutedConsole)
- Real timers in deterministic tests (use fake timers with vi.useFakeTimers)
- Manual element creation (use component test utilities)

**✅ Preferred Patterns:**

- Natural component interaction through public APIs
- Keyboard/gesture simulation via componentTestUtils helpers
- Console discipline with withMutedConsole() standardization
- Fake timer control with vi.runAllTimersAsync() for determinism
- Component factories for consistent test setup

### Testing Infrastructure Standards

**Component Test Utilities (`tests/utils/componentTestUtils.js`):**

```js
// Use natural interaction patterns
const { container, pressKey, simulateGesture } = createTestComponent(componentFactory);
await pressKey("ArrowLeft"); // Natural keyboard navigation
await simulateGesture("swipeLeft"); // Natural gesture interaction
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
// Setup fake timers for deterministic control
beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.runAllTimers();
  vi.restoreAllMocks();
});

// Advance timers deterministically
await vi.runAllTimersAsync();
```

### Performance and Reliability Targets

- **No real timeouts** in unit tests (use fake timers)
- **Muted console discipline** for all error-generating tests
- **Natural interaction patterns** over synthetic event dispatching
- **Component-driven testing** instead of direct DOM manipulation
- **Deterministic timing control** with async timer resolution

### Test Quality Verification

Run validation for established patterns:

```bash
# Verify no synthetic events in hot paths
grep -r "dispatchEvent\|createEvent" tests/ && echo "Found synthetic events"

# Verify console discipline compliance
grep -r "console\.(warn\|error)" tests/ | grep -v "tests/utils/console.js" && echo "Found unsilenced console"

# Verify timer discipline
grep -r "setTimeout\|setInterval" tests/ | grep -v "fake\|mock" && echo "Found real timers"
```

---

## 🎭 Playwright Test Quality Standards

### Core Anti-Patterns to Eliminate

**❌ Avoid These Patterns:**

- Direct page.evaluate() DOM manipulation (use natural user interactions)
- Hardcoded wait times with page.waitForTimeout() (use specific condition waits)
- Complex CSS selectors that test implementation details (use data-testid attributes)
- Manual localStorage clearing in individual tests (use global setup/teardown)
- Assertions without proper waiting (use expect().toHaveText() with auto-retry)

**✅ Preferred Patterns:**

- Natural user interactions via page.click(), page.fill(), page.press()
- Conditional waiting with page.waitForSelector(), page.waitForLoadState()
- Semantic selectors using data-testid, role, or accessible names
- Centralized test state management via fixtures and global setup
- Auto-retrying assertions with proper timeout configuration

### Playwright Infrastructure Standards

**Interaction Patterns:**

```js
// Natural user interactions
await page.click('[data-testid="submit-button"]');
await page.fill('[data-testid="username-input"]', "testuser");
await page.press("body", "Escape");

// Proper waiting for conditions
await page.waitForSelector('[data-testid="success-message"]');
await expect(page.locator('[data-testid="result"]')).toHaveText("Expected");
```

**State Management:**

```js
// Use fixtures for consistent setup
test.beforeEach(async ({ page }) => {
  await page.goto("/test-page");
  await page.waitForLoadState("networkidle");
});

// Avoid manual localStorage manipulation in tests
// Use global setup in playwright.config.js instead
```

**Selector Strategy:**

```js
// Preferred: Semantic selectors
await page.click('[data-testid="navigation-menu"]');
await page.click('role=button[name="Submit"]');

// Avoid: Implementation-detail selectors
// await page.click('.menu-container > div:nth-child(2) > button');
```

### Performance and Reliability Targets

- **No hardcoded timeouts** (use condition-based waiting)
- **Semantic selectors** that survive refactoring
- **Natural user interactions** that match real usage patterns
- **Proper test isolation** with consistent setup/teardown
- **Auto-retrying assertions** with appropriate timeout configuration

### Playwright Quality Verification

Run validation for established patterns:

```bash
# Verify no hardcoded timeouts
grep -r "waitForTimeout\|setTimeout" playwright/ && echo "Found hardcoded waits"

# Verify semantic selectors usage
grep -r "data-testid\|role=" playwright/ | wc -l && echo "Semantic selectors count"

# Verify no direct DOM manipulation
grep -r "page\.evaluate.*DOM\|innerHTML\|appendChild" playwright/ && echo "Found DOM manipulation"
```

---

## 🧯 Runtime Safeguards

- Exclude embeddings files in grep/search
- Animation:
  - One-shot → `requestAnimationFrame`
  - Continuous → `scheduler.onFrame()` + cancel with `scheduler.cancel(id)`
- Selection timers: clear `statTimeoutId` + `autoSelectId` before `statSelected`

Safe search aliases:

```bash
# Prefer ripgrep if available
alias rgs='rg -n --hidden --glob "!node_modules" --glob "!client_embeddings.json" --glob "!offline_rag_metadata.json"'
# grep fallback
alias greps='grep -RIn --exclude-dir=node_modules --exclude=client_embeddings.json --exclude=offline_rag_metadata.json'
```

---

## 🔧 Import Policy

- Hot path → static import
- Optional/heavy/flagged → dynamic import + preload during idle
- No `await import()` in stat selection, round decision, event dispatch, or render loops
- Preserve feature flag guards
- Deliverables: file list + rationale, tests for static/preload behavior

Hot path files (non-exhaustive):

- `src/helpers/classicBattle.js`
- `src/helpers/battleEngineFacade.js`
- `src/helpers/BattleEngine.js`
- `src/helpers/showSnackbar.js` (if used during round flow)

Autotest snippets (optional):

```bash
# Detect dynamic imports in hot paths
grep -RIn "await import\(" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle 2>/dev/null \
  && echo "Found dynamic import in hot path" && exit 1 || true

# Hint: check preload usage for optional modules
rg -n "preload\(|link rel=preload" src || echo "Consider preloading optional modules during idle"
```

---

## 🛠 Validation Commands

**Complete command reference:** [docs/validation-commands.md](./docs/validation-commands.md)  
**See also**: [Quick Reference Cards](#-quick-reference-cards) for essential commands

**Essential validation (run before commit):**

```bash
npx prettier . --check
npx eslint .
npm run check:jsdoc
npx vitest run
npx playwright test
npm run check:contrast
```

**Auto-fix commands:**

```bash
npx prettier . --write
npx eslint . --fix
npm run check:jsdoc:fix
```

**Agent-specific validation (includes hot-path checks):**

```bash
# Fail if dynamic import appears in hot paths
grep -RIn "await import\(" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle 2>/dev/null \
  && echo "Found dynamic import in hot path" && exit 1 || true

# Fail if unsilenced console.warn/error found in tests (ignore utility wrapper)
grep -RInE "console\.(warn|error)\(" tests | grep -v "tests/utils/console.js" \
  && echo "Unsilenced console found" && exit 1 || true

# JSON validation
npm run validate:data
```

---

## 🧪 Log Discipline

No unsuppressed console.warn/error in code/tests
Wrap with withMutedConsole(fn) or spy via vi.spyOn(console, 'error')

Helper and examples (`tests/utils/console.js`):

```js
import { withMutedConsole, withAllowedConsole } from "../utils/console.js";

await withMutedConsole(async () => {
  // code that would warn or error during tests
});

await withAllowedConsole(async () => {
  // code where specific warnings/errors are expected
});
```

---

## 📦 PR Delivery Rules

PR body must contain:
Task Contract (inputs/outputs/success/error mode)
Files changed list with purpose per file
Verification summary:
eslint: PASS|FAIL
vitest: X passed, Y failed
playwright: PASS|FAIL
jsdoc: PASS|FAIL
Risk + follow-up note

---

### ✅ Verification Checklist

prettier, eslint, jsdoc PASS
vitest + playwright PASS
No unsuppressed console logs
Tests cover happy-path + edge case
CI pipeline green

## 🧭 Plan Discipline for Bots

- Exactly one `in_progress` step at a time.
- Mark a step `completed` before starting the next.
- Keep steps concise (≤ 7 words) and 4–7 steps total is typical.
- Update the plan when scope changes; include a short rationale.

## 📊 Machine-Readable Ruleset

**Schema Version**: 1.0.0  
**Last Updated**: September 11, 2025  
**Validation**: This JSON should validate against standard schema checkers

### Version History
- **v1.0.0** (2025-09-11): Initial versioned schema with structured validation commands, comprehensive test standards, and centralized documentation references

### Schema Usage
This JSON ruleset can be programmatically parsed for:
- Automated rule validation in CI/CD pipelines
- Agent configuration and initialization
- Policy compliance checking
- Integration with development tooling

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "JU-DO-KON Agent Rules",
  "version": "1.0.0",
  "lastUpdated": "2025-09-11",
  "workflowOrder": ["context", "taskContract", "implementation", "validation", "delivery"],
  "corePrinciples": [
    "clarity",
    "modularity",
    "determinism",
    "no_public_api_changes",
    "verification_required"
  ],
  "contextRules": {
    "queryRag": true,
    "provenanceRequired": true,
    "confirmationAgainstSource": true
  },
  "keyFiles": {
    "tooltips": "src/data/tooltips.json",
    "stats": ["src/data/judoka.json", "src/data/statNames.js"],
    "flags": ["src/pages/settings.html", "src/config/settingsDefaults.js"],
    "tooltipViewer": "src/pages/tooltipViewer.html",
    "factories": "src/components/*.js",
    "battleLogic": ["classicBattle.js", "setupScoreboard.js", "Scoreboard.js"],
    "entryPoints": "src/pages/*.html",
    "tests": ["tests/**/*.test.js", "playwright/*.spec.js"],
    "excludeFromSearch": ["client_embeddings.json", "offline_rag_metadata.json"]
  },
  "taskContract": ["inputs", "outputs", "success", "errorMode"],
  "evaluationCriteria": {
    "functionLengthMax": 50,
    "requirePseudocode": true,
    "validateJson": true,
    "netBetter": true,
    "testsRequired": ["happyPath", "edgeCase"]
  },
  "unitTestQualityStandards": {
    "antiPatterns": [
      "directDomManipulation",
      "syntheticEventDispatching",
      "rawConsoleSpy",
      "realTimersInTests",
      "manualElementCreation"
    ],
    "preferredPatterns": [
      "naturalComponentInteraction",
      "keyboardGestureSimulation",
      "withMutedConsole",
      "fakeTimerControl",
      "componentFactories"
    ],
    "testingInfrastructure": {
      "componentUtils": "tests/utils/componentTestUtils.js",
      "consoleUtils": "tests/utils/console.js",
      "timerManagement": "vi.useFakeTimers",
      "naturalInteraction": "pressKey/simulateGesture"
    },
    "performanceTargets": [
      "noRealTimeouts",
      "mutedConsoleDiscipline",
      "naturalInteractionPatterns",
      "componentDrivenTesting",
      "deterministicTimingControl"
    ],
    "verificationCommands": [
      "grep -r \"dispatchEvent\\|createEvent\" tests/",
      "grep -r \"console\\.(warn\\|error)\" tests/ | grep -v \"tests/utils/console.js\"",
      "grep -r \"setTimeout\\|setInterval\" tests/ | grep -v \"fake\\|mock\""
    ]
  },
  "playwrightTestQualityStandards": {
    "antiPatterns": [
      "directPageEvaluateDomManipulation",
      "hardcodedWaitTimeouts",
      "complexImplementationSelectors",
      "manualLocalStorageClearing",
      "assertionsWithoutWaiting"
    ],
    "preferredPatterns": [
      "naturalUserInteractions",
      "conditionalWaiting",
      "semanticSelectors",
      "centralizedStateManagement",
      "autoRetryingAssertions"
    ],
    "interactionPatterns": {
      "userActions": "page.click/fill/press",
      "waiting": "page.waitForSelector/waitForLoadState",
      "selectors": "data-testid/role/accessible-names",
      "assertions": "expect().toHaveText() with auto-retry"
    },
    "performanceTargets": [
      "noHardcodedTimeouts",
      "semanticSelectorUsage",
      "naturalUserInteractions",
      "properTestIsolation",
      "autoRetryingAssertions"
    ],
    "verificationCommands": [
      "grep -r \"waitForTimeout\\|setTimeout\" playwright/",
      "grep -r \"data-testid\\|role=\" playwright/ | wc -l",
      "grep -r \"page\\.evaluate.*DOM\\|innerHTML\\|appendChild\" playwright/"
    ]
  },
  "classicBattleTesting": {
    "initHelper": "initClassicBattleTest({ afterMock: true })",
    "eventPromises": [
      "getRoundPromptPromise",
      "getCountdownStartedPromise",
      "getRoundResolvedPromise",
      "getRoundTimeoutPromise",
      "getStatSelectionStalledPromise"
    ],
    "assertions": {
      "outcome": "#round-message",
      "countdown": "snackbar"
    },
    "cleanup": ["clearSnackbar", "clearRoundMessage"]
  },
  "runtimeSafeguards": {
    "excludeEmbeddingsFromSearch": true,
    "animation": {
      "oneShot": "requestAnimationFrame",
      "continuous": "scheduler.onFrame()",
      "cancel": "scheduler.cancel(id)"
    },
    "timers": ["statTimeoutId", "autoSelectId"]
  },
  "importPolicy": {
    "hotPath": "static",
    "optional": "dynamicPreload",
    "forbiddenContexts": ["statSelection", "roundDecision", "eventDispatch", "renderLoop"],
    "preserveFeatureFlags": true
  },
  "validationCommands": {
    "centralReference": "docs/validation-commands.md",
    "essential": [
      "npx prettier . --check",
      "npx eslint .",
      "npm run check:jsdoc",
      "npx vitest run",
      "npx playwright test",
      "npm run check:contrast"
    ],
    "agentSpecific": [
      "npm run rag:validate",
      "npm run validate:data",
      "grep -RIn \"await import\\(\" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle",
      "grep -RInE \"console\\.(warn|error)\\(\" tests | grep -v \"tests/utils/console.js\""
    ]
  },
  "logDiscipline": {
    "forbidUnsuppressed": true,
    "muteHelper": "withMutedConsole",
    "spyHelper": "vi.spyOn"
  },
  "prRules": {
    "requireTaskContract": true,
    "requireFilesChangedList": true,
    "requireVerificationSummary": true,
    "requireRiskNote": true
  },
  "verificationChecklist": [
    "prettier/eslint/jsdoc PASS",
    "vitest + playwright PASS",
    "no unsuppressed logs",
    "tests: happy + edge",
    "CI green"
  ]
}
```
