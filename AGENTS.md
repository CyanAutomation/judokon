# 🤖 JU-DO-KON! Agent Guide

This guide helps AI agents (and human collaborators) make effective, accurate, and consistent contributions to the JU-DO-KON! codebase. Treat it as both a checklist and a playbook.

## Table of Contents

- [🎯 Mission Statement](#mission-statement)
- [🧠 RAG Usage](#rag-usage)
- [🧪 Prompt Templates](#prompt-templates)
- [✅ Evaluation Criteria for Agent Contributions](#evaluation-criteria-for-agent-contributions)
- [📚 Key Files for AI Agents](#key-files-for-ai-agents)
- [✅ DOs and ❌ DON’Ts](#dos-and-donts)
  - [Classic Battle: Testing and Rebinding](#classic-battle-testing-and-rebinding)
- [🧯 Runtime Safeguards](#runtime-safeguards)
  - [Terminal Safety](#terminal-safety)
  - [🎞️ Animation Scheduler](#animation-scheduler)
  - [⏱️ Selection Timer Cleanup](#selection-timer-cleanup)
- [🔧 Module Loading Policy for Agents](#module-loading-policy-for-agents)
  - [Decision Checklist](#decision-checklist)
  - [Definition of Hot Path (JU-DO-KON!)](#definition-of-hot-path-ju-do-kon)
  - [Agent Requirements](#agent-requirements)
  - [Anti-Patterns to Avoid](#anti-patterns-to-avoid)
  - [PR Deliverables for Import Changes](#pr-deliverables-for-import-changes)
- [🛠 Programmatic Checks Before Commit](#programmatic-checks-before-commit)
- [Testing Discipline: Keep Vitest Output Clean](#testing-discipline-keep-vitest-output-clean-consolewarn--consoleerror)
- [🔗 Related Docs](#related-docs)
- [Task Contract (required for each assignment)](#task-contract-required-for-each-assignment)
- [Assumptions & Clarifying Questions](#assumptions--clarifying-questions)
- [RAG provenance and citation](#rag-provenance-and-citation-required-when-using-queryrag)
- [Verification / Green-before-done checklist](#verification--green-before-done-checklist)
- [Prompting templates (system / user / output)](#prompting-templates-system--user--output)
- [Tool-batch preface example](#tool-batch-preface-example)
- [PR guidance for agent-made changes](#pr-guidance-for-agent-made-changes)

---

## 🎯 Mission Statement

AI agents play a vital role in maintaining quality, clarity, and scalability across JU-DO-KON!. This guide ensures:

- Consistent logic and style across contributions
- Awareness of available tooling and data
- Efficient collaboration with human reviewers
- A bias toward clarity, simplicity, and modularity

A successful agent contribution is concise, compliant with code standards, and adds lasting value without introducing regressions or complexity.

## 🧠 RAG Usage

Use the vector database before inspecting files to collect relevant context and reduce unnecessary search work. It excels at:

- Answering architectural questions
- Surfacing design rationale
- Illuminating cross-cutting concerns across modules

Sample queries:

- "Explain the data flow for user authentication"
- "Summarize the classicBattle module"
- "Outline how settings persistence works"

- When a prompt starts with question patterns like "Explain X" or "How does Y work?", call [`queryRag(question)`](src/helpers/queryRag.js) to gather context before scanning files.
- For deeper guidance and code samples, see [example vector queries](design/agentWorkflows/exampleVectorQueries.md#queryrag-helper).

---

## 🧪 Prompt Templates

Before applying any template, look for question-style prompts such as "Explain X" or "How does Y work?" and run `queryRag` for context.

Use these prompt formats when engaging with AI or testing tools:

### 📝 Evaluate a PRD

```markdown
You are a PRD reviewer for the JU-DO-KON! game project. Evaluate the following Product Requirements Document for clarity, completeness, and testability. Identify any gaps or ambiguities and suggest improvements.
```

### 🧮 Audit a JSON File for Duplication

Scan `src/data/<filename>.json` for duplicate stat names, redundant fields, or overlapping values. Recommend deduplication or structural improvements. Include reasoning.

### 🧷 Check Tooltip Coverage

Review `src/data/tooltips.json` and match entries against UI elements using `data-tooltip-id`. Identify missing tooltips or unused keys. Suggest where to add or remove entries.

### 🔘 Validate Feature Flag Functionality

Inspect `src/pages/settings.html` and corresponding helpers. Confirm that all feature flags expose `data-flag` and `data-tooltip-id`. Check toggle persistence and observability.

---

## ✅ Evaluation Criteria for Agent Contributions

Before submitting or completing a task, verify that your work:

- Maintains modular, single-purpose logic
- Includes or updates appropriate @pseudocode in JSDoc
- Passes all programmatic checks (format, lint, test, contrast)
- Improves clarity, reusability, or structure
- Avoids duplication or placeholder text

---

## 📚 Key Files for AI Agents

| Purpose                       | File(s)                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------- |
| Tooltip content               | `src/data/tooltips.json`                                                        |
| Game stats and player data    | `src/data/judoka.json`, `src/data/statNames.js`                                 |
| Feature flags & settings      | `src/pages/settings.html`, `src/config/settingsDefaults.js`                     |
| Tooltip viewer                | `src/pages/tooltipViewer.html`                                                  |
| Debug + Observability targets | Components with `data-_`, like `data-tooltip-id`, `data-flag`, `data-feature-_` |
| UI test entry points          | `playwright/_.spec.js`, `tests/**/_.test.js`                                    |
| Component factories           | `src/components/*.js`                                                           |
| Battle logic and UI           | `classicBattle.js`, `setupScoreboard.js`, `Scoreboard.js`                       |

---

## ✅ DOs and ❌ DON’Ts

### ✅ DO

- Use `data-flag`, `data-tooltip-id`, and `data-feature-*` for all toggles and testable features
- Refactor large functions into smaller helpers (~50 lines max)
- Write and maintain clear @pseudocode for public functions
- Validate all modified JSON files with `npm run validate:data`
- Use createButton, createCard, createModal factories when building UI

### Classic Battle: Testing and Rebinding

- Prefer `tests/helpers/initClassicBattleTest.js` to initialize bindings:
  - Call `await initClassicBattleTest({ afterMock: true })` immediately after `vi.doMock(...)` inside a test to rebind event listeners and reset promises.
- Prefer event promises over sleeps:
  - `getRoundPromptPromise`, `getCountdownStartedPromise`, `getRoundResolvedPromise`, `getRoundTimeoutPromise`, `getStatSelectionStalledPromise`.
- Assert against the correct surface:
  - Outcome → `#round-message`; countdown/hints → snackbar.
- Bindings are idempotent and per-worker via `__ensureClassicBattleBindings()`.
- Global `afterEach` clears snackbar and `#round-message` to prevent bleed.

### ❌ DON’T

- Don’t commit baseline screenshots manually. Playwright baselines (`playwright/*-snapshots`) are updated and committed by the nightly GitHub Action only.
- Don’t introduce placeholder text in tooltips or stats
- Don’t skip pseudocode updates when changing logic
- Don’t duplicate stat labels or tooltip keys
- Don’t forget to run the full test suite before committing

---

## 🧯 Runtime Safeguards

### Terminal Safety

To prevent session crashes in the terminal:

> **Always exclude `client_embeddings.json` and `offline_rag_metadata.json` from terminal searches.**  
> It contains very long lines that can exceed the 4096-byte output limit and terminate the shell.

#### ✅ Use safe search patterns

```bash
grep "kumi-kata" . --exclude=client_embeddings.json --exclude=offline_rag_metadata.json
```

Or recursively:

```bash
grep -r "kumi-kata" . --exclude-dir=node_modules --exclude=client_embeddings.json --exclude=offline_rag_metadata.json
```

🔍 Why it matters

Even if you’re not directly searching client_embeddings.json or offline_rag_metadata.json, tools like grep -r . may include it by default. This results in output overflow and abrupt session termination. Always exclude this file unless explicitly working with it.

### 🎞️ Animation Scheduler

- Use `requestAnimationFrame` for one-shot UI updates (for example, toggling a CSS class on the next frame).
- Avoid `scheduler.onFrame()` for one-off work — it registers a persistent callback; repeated use during timers can leak callbacks and stall the UI.
- Reserve `scheduler.onFrame()` for continuous per-frame tasks and always cancel with `scheduler.cancel(id)` when done.

### ⏱️ Selection Timer Cleanup

- Clear stat-selection timeouts and auto-select callbacks (`statTimeoutId`, `autoSelectId`) before emitting `statSelected`.
- Stalled timers can dispatch late events and interrupt the next round, causing unintended restarts.

---

## 🔧 Module Loading Policy for Agents

> This section is the canonical source for JU-DO-KON!'s static vs dynamic import rules.
> Update this section when import policy changes; other docs link here.

> JU-DO-KON! runs unbundled on GitHub Pages, relying on native ES modules.

When reviewing or modifying imports, agents must apply the JU-DO-KON! static vs dynamic policy to ensure gameplay remains smooth and errors surface early.

### Decision Checklist

- **Hot path or always-used?** → **Static import**
- **Optional, heavy, or feature-flagged?** → **Dynamic import with preload**
- **Failure should surface at build/start?** → **Static import**
- **Risk of input-time hitch?** → **Static import**

### Definition of Hot Path (JU-DO-KON!)

- Stat selection handlers
- Round decision logic
- Event dispatchers / orchestrators
- Per-frame animation or rendering in battle

### Agent Requirements

- No `await import()` inside stat selection, round decision, event dispatch, or render loops.
- Keep optional modules dynamic, but **preload** them during idle/cooldown to avoid UI stalls.
- Preserve existing feature flag logic when changing imports.
- Update or add tests to verify static imports for core gameplay and preload behavior for optional modules.

### Anti-Patterns to Avoid

- ❌ Dynamic import inside click handlers for core gameplay
- ❌ Variable dynamic import paths that obscure module resolution
- ❌ Removing feature flag guards during refactor
- ❌ Eagerly importing heavy optional modules on page load without justification

### PR Deliverables for Import Changes

1. Summary of files changed and reason for static/dynamic decision.
2. Test updates reflecting the new loading behavior.
3. Notes on any preloading strategy implemented for optional modules.

---

## 🛠 Programmatic Checks Before Commit

Run these from the repo root:

```bash
npm run check:jsdoc
npx prettier . --check
npx eslint .
npx vitest run
npx playwright test
npm run check:contrast
```

**Common fixes**

```bash
npm run check:jsdoc:fix
npx prettier . --write
npx eslint . --fix
```

---

## Testing Discipline: Keep Vitest Output Clean (console.warn / console.error)

To keep CI and local runs readable, **no test should emit unsilenced `console.warn` or `console.error`**. Expected logs must be **stubbed, spied, or muted**.

### Agent / Developer Checklist

- Wrap code paths that intentionally log with **`withMutedConsole(fn)`** (see helper below), or
- Use `vi.spyOn(console, 'error').mockImplementation(() => {})` (same for `warn`) for the narrowest scope possible.
- If a test _must_ allow logs, wrap the specific execution in `withAllowedConsole(fn)`.
- Never leave raw `console.warn/error` in production code. Prefer domain-specific loggers or error channels.

---

## 🔗 Related Docs

- `README.md` – Project overview and setup
- `architecture.md` – System layout and entry points
- `CONTRIBUTING.md` – Commit etiquette and agent rules

---

## Task Contract (required for each assignment)

Before acting, every agent must include a short task contract (2–4 bullets) at the top of the reply or PR description.

- Inputs: files, data, and commands the agent will read (e.g., `src/components/*`, `playwright/*.spec.js`).
- Outputs: exact artifacts to produce (files changed, tests added, docs updated).
- Success criteria: what counts as done (tests green, linter/jsdoc checks pass, no unsuppressed console.warn/error in tests).
- Error/stop mode: when the agent will pause and ask instead of proceeding (missing files, public API changes, ambiguous requirements).

Example:

- Inputs: `src/classicBattle.js`, `playwright/classicBattle.spec.js`.
- Outputs: updated `classicBattle.js`, one unit test `tests/classicBattle.spec.js`, PR with test results.
- Success: `npm run check:jsdoc` + `npx eslint .` + `npx vitest run` all pass; no new `console.error` in tests.
- Error mode: stop and ask if changes would modify a public API surface.

## Assumptions & Clarifying Questions

When a task is ambiguous the agent must follow this pattern:

- If the ambiguity blocks safe progress, ask up to 2 clarifying questions before making edits.
- If the ambiguity is non-blocking, list up to 2 explicit assumptions at the top of the reply and proceed. Mark them clearly with `Assumption:` and continue.
- Example assumption line: `Assumption: New feature is behind feature-flag 'foo' and does not require migration.`

Agents must not silently make major design decisions such as changing public APIs, database schemas, or user-visible copy without explicit confirmation.

## RAG provenance and citation (required when using `queryRag`)

When using the RAG/vector DB (`queryRag`) to inform decisions or copy content, include a short provenance block for any external fact or quote used:

- Source: `<doc-id or filename>` — Confidence: `high|medium|low` — Quote (if verbatim): "..."

Example:

- Source: `design/agentWorkflows/exampleVectorQueries.md` — Confidence: high — Quote: "Use `queryRag` for architectural questions."

If a fact is uncertain or inferred from multiple sources, state that explicitly (e.g., `Derived from: fileA, fileB — confidence: medium`).

## Verification / Green-before-done checklist

For any code or behavior change, perform the following and include a short result summary in the PR body or reply:

- Run targeted tests (prefer small, focused suites). Report `PASS` or `FAIL` and top-level failing tests.
- Run linters and jsdoc checks: `npx eslint .`, `npm run check:jsdoc` (report PASS/FAIL).
- Ensure no test emits unsuppressed `console.warn`/`console.error`. If logs are expected, mute or spy them locally in the test.
- If you added or changed public behavior, include one minimal test (happy path + 1 edge case).

Include the short test output lines for verification (for example: `vitest: 8 passed, 0 failed`).

If any check fails, iterate until targeted checks pass or stop and document why further work is blocked.

## Prompting templates (system / user / output)

When assembling prompts or system messages for model-driven work, prefer a small, structured template to reduce ambiguity. Agents should follow this example where applicable:

- System: You are a concise, safety-minded coding assistant. Prefer short, actionable replies and include a 2–4 bullet task contract at the top. Output files in a clear list and include test/lint results when present.
- User: Implement X. Provide the inputs (files), desired outputs (files/tests), and any constraints (no public API changes, follow import policy).
- Output (structured):
  - filesChanged: ["path/to/file1", ...]
  - testsAdded: ["path/to/test1", ...]
  - verification: { lint: "PASS|FAIL", tests: "PASS|FAIL", notes: "short note" }

Agents may adapt this to human-readable PR descriptions, but the information must be present.

## Tool-batch preface example

Before invoking tooling or making multiple tool calls (search, RAG, terminal commands), preface the batch with a single sentence in this style:

"Why/what/outcome: calling `queryRag` to fetch design rationale for `classicBattle`; expected outcome: top-3 snippets and actionable guidance for changes."

This makes tool usage auditable and easier to review.

## PR guidance for agent-made changes

When creating a branch/PR for code or doc changes, include a concise PR body that contains:

- Task Contract (use the template above).
- Files changed list and one-line purpose for each file.
- Verification summary: lint/tests/jsdoc results (short lines, e.g., `eslint: PASS`, `vitest: 5 passed`).
- Short note on risk and follow-ups (e.g., "No public API changes; follow-up: add integration tests").

Small doc-only changes may be committed directly to the default branch if that matches repo policy, otherwise open a PR.

---
