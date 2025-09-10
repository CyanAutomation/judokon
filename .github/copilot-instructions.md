# 🤖 JU-DO-KON! Agent Guide

**Purpose**: Define deterministic rules, workflows, and safety requirements for AI Agents operating in the JU-DO-KON! repository.  
**Audience**: AI Agents only. Human readability is not the priority.

---

## 🗂️ Workflow Order

1. Context acquisition (queryRag, key file references)
2. Task contract definition (inputs/outputs/success/error)
3. Implementation (import policy, coding rules)
4. Validation (lint, format, tests, contrast, logs)
5. Delivery (PR body with verification summary)

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

### Agent Usage Tips (RAG)

- Prefer `queryRag({ withProvenance: true })` for “How/Why/What/Where/Which” questions to include `contextPath` and a short `rationale` explaining ranking.
- During development, you may pass `withDiagnostics: true` to receive `{ expandedQuery, multiIntentApplied, timingMs }` for debugging. Do not enable diagnostics in hot paths.
- For compound queries, RAG automatically splits simple conjunctions and re-ranks the union; still keep queries concise and specific.

Example:

```js
import queryRag from "./src/helpers/queryRag.js";
const results = await queryRag("classic battle countdown snackbar", { withProvenance: true, withDiagnostics: true });
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

Run before commit:

```bash
npx prettier . --check
npx eslint .
npm run check:jsdoc
npx vitest run
npx playwright test
npm run check:contrast
```

Fix:

```bash
npx prettier . --write
npx eslint . --fix
npm run check:jsdoc:fix
```

Quick autochecks (bundle as `npm run check:agents` if desired):

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

```json
{
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
  "validationCommands": [
    "npx prettier . --check",
    "npx eslint .",
    "npm run check:jsdoc",
    "npx vitest run",
    "npx playwright test",
    "npm run check:contrast"
  ],
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
