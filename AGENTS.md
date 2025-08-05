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

---

## 🧪 Prompt Templates

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

| Purpose                        | File(s)                                         |
| ------------------------------ | ----------------------------------------------- |
| Tooltip content                | src/data/tooltips.json                          |
| Game stats and player data     | src/data/judoka.json, src/data/statNames.json   |
| Feature flags & settings       | src/pages/settings.html, src/data/settings.json |
| Tooltip viewer                 | src/pages/tooltipViewer.html                    |
| Debug + Observability targets  | Components with data-*, like data-tooltip-id, data-flag, data-feature-* |
| UI test entry points           | playwright/*.spec.js, tests/**/*.test.js        |
| Component factories            | src/components/*.js                             |
| Battle logic and UI            | classicBattle.js, setupBattleInfoBar.js, InfoBar.js |

---

## ✅ DOs and ❌ DON’Ts

### ✅ DO

- Use data-flag, data-tooltip-id, and data-feature-* for all toggles and testable features
- Refactor large functions into smaller helpers (~50 lines max)
- Write and maintain clear @pseudocode for public functions
- Validate all modified JSON files with `npm run validate:data`
- Use createButton, createCard, createModal factories when building UI

### ❌ DON’T

- Don’t commit baseline screenshots (playwright/*-snapshots)
- Don’t introduce placeholder text in tooltips or stats
- Don’t skip pseudocode updates when changing logic
- Don’t duplicate stat labels or tooltip keys
- Don’t forget to run the full test suite before committing

---

## 🛠 Programmatic Checks Before Commit

Run these from the repo root:

```bash
npx prettier . --check
npx eslint .
npx vitest run
npx playwright test
npm run check:contrast
```

**Common fixes:**

```bash
npx prettier . --write
npx eslint . --fix
```

---

## 🔗 Related Docs

- `README.md` – Project overview and setup
- `architecture.md` – System layout and entry points
- `CONTRIBUTING.md` – Commit etiquette and agent rules

---
