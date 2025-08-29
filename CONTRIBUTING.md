# Contributing to JU-DO-KON!

This document summarizes the key steps and rules for submitting pull requests.
It consolidates the instructions from `AGENTS.md` and the design documents so contributors can quickly confirm the required checks and documentation standards.

The project ships directly as static ES modules without a build step.

---

## ✅ Required Programmatic Checks

Before committing any changes, run the following commands from the repository root. Fix any issues and rerun the checks until they all pass:

```bash
npx prettier . --check # verify formatting
npx eslint . # lint the codebase
npx vitest run # run unit tests
npm run test:style # run style tests on demand
npx playwright test # run Playwright UI tests
```

- Confirm that any new or modified functions include JSDoc with an `@pseudocode` block so documentation stays complete.
- Playwright tests clear localStorage at startup. If a manual run fails unexpectedly, clear it in your browser and ensure [http://localhost:5000](http://localhost:5000) is served (start it with `npm start`).
- Use `src/helpers/storage.js` for persistent data access instead of direct `localStorage` calls.
- Use the shared scheduler (`src/utils/scheduler.js`) for all timing-sensitive work instead of standalone timers.

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

---

## Testing Discipline: Keep Vitest Output Clean (console.warn / console.error)

To keep CI and local runs readable, **no test should emit unsilenced `console.warn` or `console.error`**. Expected logs must be **stubbed, spied, or muted**.

### Agent / Developer Checklist

- Wrap code paths that intentionally log with **`withMutedConsole(fn)`** (see helper below), or
- Use `vi.spyOn(console, 'error').mockImplementation(() => {})` (same for `warn`) for the narrowest scope possible.
- If a test _must_ allow logs, wrap the specific execution in `withAllowedConsole(fn)`.
- Never leave raw `console.warn/error` in production code. Prefer domain-specific loggers or error channels.

---

## 🧭 Static vs Dynamic Import Checklist

When contributing code, especially in gameplay or input-related areas, follow these rules for module loading:

### ✅ Use Static Imports When:

- Code runs on a **hot path**:
  - Stat selection handlers
  - Round decision logic
  - Event dispatchers / orchestrators
  - Per-frame animation or rendering in battle
- Code is **always required** in a normal play session.
- Breakage should be detected at build/startup (fail fast).

### ✅ Use Dynamic Imports (with Preload) When:

- The module is **optional** or **infrequently used** (e.g., Settings, Tooltip Viewer, Credits).
- The module is **heavy** or behind a **feature flag** (e.g., canvas/WebGL renderer, debug panels, markdown/HL libs).
- You can **preload** it during idle/cooldown to hide latency.

### 🚫 Anti-Patterns to Avoid:

- ❌ `await import()` inside click/input handlers for core gameplay.
- ❌ Removing feature flag checks during refactor.
- ❌ Adding heavy optional modules to the initial bundle without justification.

---

## 📎 Related AI Agent Docs

- `AGENTS.md` – Tasks, prompts, and expectations for agents
- `architecture.md` – Feature flags, data observability, testing conventions
- `README.md` – Project overview, setup, and gameplay

---

Thank you for helping improve JU-DO-KON! Whether human or AI, your contributions matter. 🙌
