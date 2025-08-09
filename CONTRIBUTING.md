# Contributing to JU-DO-KON!

This document summarizes the key steps and rules for submitting pull requests.  
It consolidates the instructions from `AGENTS.md` and the design documents so contributors can quickly confirm the required checks and documentation standards.

---

## ✅ Required Programmatic Checks

Before committing any changes, run the following commands from the repository root. Fix any issues and rerun the checks until they all pass:

```bash
npx prettier . --check # verify formatting
npx eslint . # lint the codebase
npx vitest run # run unit tests
npx playwright test # run Playwright UI tests
```

- Confirm that any new or modified functions include JSDoc with an `@pseudocode` block so documentation stays complete.
- Playwright tests clear localStorage at startup. If a manual run fails unexpectedly, clear it in your browser and ensure [http://localhost:5000](http://localhost:5000) is served (start it with `npm start`).

### Storage Utility

- Persist data with `src/helpers/storage.js` rather than using `localStorage` directly.
- The helper provides `getItem`, `setItem`, and `removeItem` with JSON serialization and in-memory fallback when storage is unavailable.
- In unit tests, mock this module instead of the `localStorage` global.

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

## 📎 Related AI Agent Docs

- `AGENTS.md` – Tasks, prompts, and expectations for agents
- `architecture.md` – Feature flags, data observability, testing conventions
- `README.md` – Project overview, setup, and gameplay

---

Thank you for helping improve JU-DO-KON! Whether human or AI, your contributions matter. 🙌
