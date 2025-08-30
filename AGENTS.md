# 🤖 JU-DO-KON! Agent Guide

This document exists to help AI agents (and human collaborators) make effective, accurate, and consistent contributions to the JU-DO-KON! codebase. Agents should treat this guide as both a checklist and a playbook.

---

## 🎯 Mission Statement

AI agents play a vital role in maintaining quality, clarity, and scalability across JU-DO-KON!. This guide ensures:

- Consistent logic and style across contributions
- Awareness of available tooling and data
- Efficient collaboration with human reviewers
- A bias toward clarity, simplicity, and modularity

A successful agent contribution is **concise**, **compliant with code standards**, and **adds lasting value** without introducing regressions or complexity.

## 🧠 RAG Usage

Use the vector database before inspecting files to collect relevant context and reduce unnecessary search work. It excels at:

- Answering architectural questions
- Surfacing design rationale
- Illuminating cross-cutting concerns across modules

Sample queries:

- "Explain the data flow for user authentication"
- "Summarize the classicBattle module"
- "Outline how settings persistence works"

- When a prompt starts with question patterns like "Explain X" or "How does Y work?",
  call [`queryRag(question)`](src/helpers/queryRag.js) to gather context before scanning files.
- For deeper guidance and code samples, see
  [example vector queries](design/agentWorkflows/exampleVectorQueries.md#queryrag-helper).

---

## 🧪 Prompt Templates

Before applying any template, look for question-style prompts such as
"Explain X" or "How does Y work?" and run `queryRag` for context.

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

| Purpose                       | File(s)                                                                 |
| ----------------------------- | ----------------------------------------------------------------------- |
| Tooltip content               | src/data/tooltips.json                                                  |
| Game stats and player data    | src/data/judoka.json, src/data/statNames.json                           |
| Feature flags & settings      | src/pages/settings.html, src/config/settingsDefaults.js                 |
| Tooltip viewer                | src/pages/tooltipViewer.html                                            |
| Debug + Observability targets | Components with data-_, like data-tooltip-id, data-flag, data-feature-_ |
| UI test entry points          | playwright/_.spec.js, tests/\*\*/_.test.js                              |
| Component factories           | src/components/\*.js                                                    |
| Battle logic and UI           | classicBattle.js, setupScoreboard.js, Scoreboard.js                     |

---

## ✅ DOs and ❌ DON’Ts

### ✅ DO

- Use data-flag, data-tooltip-id, and data-feature-\* for all toggles and testable features
- Refactor large functions into smaller helpers (~50 lines max)
- Write and maintain clear @pseudocode for public functions
- Validate all modified JSON files with `npm run validate:data`
- Use createButton, createCard, createModal factories when building UI

## Classic Battle: Testing and Rebinding

- Prefer `tests/helpers/initClassicBattleTest.js` to initialize bindings:
  - Call `await initClassicBattleTest({ afterMock: true })` immediately after `vi.doMock(...)` inside a test to rebind event listeners and reset promises.
- Prefer event promises over sleeps:
  - `getRoundPromptPromise`, `getCountdownStartedPromise`, `getRoundResolvedPromise`, `getRoundTimeoutPromise`, `getStatSelectionStalledPromise`.
- Assert against the correct surface:
  - Outcome → `#round-message`; countdown/hints → snackbar.
- Bindings are idempotent and per-worker via `__ensureClassicBattleBindings()`.
- Global `afterEach` clears snackbar and `#round-message` to prevent bleed.

### ❌ DON’T

- Don’t commit baseline screenshots (playwright/\*-snapshots)
- Don’t introduce placeholder text in tooltips or stats
- Don’t skip pseudocode updates when changing logic
- Don’t duplicate stat labels or tooltip keys
- Don’t forget to run the full test suite before committing

---

## 🧯 Runtime Safeguards

### 🚫 Avoid Output Errors in Terminal

To prevent session crashes in the terminal:

> **Always exclude `client_embeddings.json` from terminal searches.**  
> It contains very long lines that can exceed the 4096-byte output limit and terminate the shell.

#### ✅ Use safe search patterns:

```bash
grep "kumi-kata" . --exclude=client_embeddings.json
```

Or recursively:

```bash
grep -r "kumi-kata" . --exclude-dir=node_modules --exclude=client_embeddings.json
```

🔍 Why it matters

Even if you’re not directly searching client_embeddings.json, tools like grep -r . may include it by default. This results in output overflow and abrupt session termination. Always exclude this file unless explicitly working with it.

### 🎞️ Animation Scheduler

- Use `requestAnimationFrame` for one-shot UI updates (for example, toggling a CSS class on the next frame).
- Avoid `scheduler.onFrame()` for one-off work — it registers a persistent callback; repeated use during timers can leak callbacks and stall the UI.
- Reserve `scheduler.onFrame()` for continuous per-frame tasks and always cancel with `scheduler.cancel(id)` when done.

---

## 🔧 Module Loading Policy for Agents

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

**Common fixes:**

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
