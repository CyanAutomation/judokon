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

---

## 🧠 Context Rules (RAG)

- Use [`queryRag(question)`](src/helpers/queryRag.js) for prompts containing `Explain` or `How does`.  
- RAG provides context; confirm against source files.  
- Include provenance for RAG-derived facts:  
  - `Source: <doc>` — `Confidence: high|medium|low` — `Quote: "..."`.  

---

## 📚 Key Repository Targets

| Domain         | Files / Paths                                                  |
| -------------- | -------------------------------------------------------------- |
| Tooltips       | `src/data/tooltips.json`                                       |
| Stats          | `src/data/judoka.json`, `src/data/statNames.js`                |
| Flags/Settings | `src/pages/settings.html`, `src/config/settingsDefaults.js`    |
| Tooltip Viewer | `src/pages/tooltipViewer.html`                                 |
| Factories      | `src/components/*.js`                                          |
| Battle Logic   | `classicBattle.js`, `setupScoreboard.js`, `Scoreboard.js`      |
| Entry Points   | `src/pages/*.html`                                             |
| Tests          | `tests/**/*.test.js`, `playwright/*.spec.js`                   |

⚠️ Exclude from searches:  
- `client_embeddings.json`  
- `offline_rag_metadata.json`  

---

## 🧪 Task Contract

Declare before execution:

- **Inputs**: explicit files/data/commands  
- **Outputs**: changed files/tests/docs  
- **Success**: all validation passes, no unsuppressed console logs  
- **Error mode**: explicit stop conditions  

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

## 🧯 Runtime Safeguards

- Exclude embeddings files in grep/search  
- Animation:  
  - One-shot → `requestAnimationFrame`  
  - Continuous → `scheduler.onFrame()` + cancel with `scheduler.cancel(id)`  
- Selection timers: clear `statTimeoutId` + `autoSelectId` before `statSelected`  

---

## 🔧 Import Policy

- Hot path → static import  
- Optional/heavy/flagged → dynamic import + preload during idle  
- No `await import()` in stat selection, round decision, event dispatch, or render loops  
- Preserve feature flag guards  
- Deliverables: file list + rationale, tests for static/preload behavior  

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

---

## 🧪 Log Discipline
No unsuppressed console.warn/error in code/tests
Wrap with withMutedConsole(fn) or spy via vi.spyOn(console, 'error')

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

## 📊 Machine-Readable Ruleset
```json
{
  "workflowOrder": ["context", "taskContract", "implementation", "validation", "delivery"],
  "corePrinciples": ["clarity", "modularity", "determinism", "no_public_api_changes", "verification_required"],
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
