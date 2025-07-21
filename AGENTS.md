# Ju-Do-Kon! Agent Guide

This repository contains the source for **JU-DO-KON!**, a browser-based card game about judo.

## Key Directories

- `index.html` – landing page.
- `game.js` – main browser logic.
- `src/helpers/` – modular utilities used throughout the game. Functions include extensive JSDoc with `@pseudocode` blocks.
- `data/` – JSON files for judoka, gokyo techniques, and game configuration.
- `tests/` – Vitest unit tests using the `jsdom` environment.
- `playwright/` – Playwright tests for UI and end-to-end validation, including **screenshot tests**.
- `design/` – documentation including code standards. New contributors should read `design/codeStandards/codeJSDocStandards.md` and `design/codeStandards/codePseudocodeStandards.md`.

## Coding Standards

- Use ES modules and modern JavaScript (Node 18+ is expected).
- Format code with Prettier and lint with ESLint. The repo uses the config from `eslint.config.mjs`.
- **JSDoc comments and pseudocode blocks must remain intact**. Keep `@pseudocode` blocks in place, but update them if the code changes so the description stays accurate.
- Public functions should have JSDoc documentation following the examples in `design/codeStandards`.
- Favor small, single-purpose functions and avoid monolithic implementations.
- Always refactor complex logic into smaller helpers and keep modules focused on a single responsibility.
- Keep implementations and tests simple. Break logic into small helpers whenever possible, and refactor complex code rather than layering workarounds.
- Whenever you touch a file, look for opportunities to simplify or refactor the surrounding code.

📝 Note: Code must remain simple and modular at all times.

## Programmatic Checks

Run the following commands from the repository root before committing. If any command fails, resolve the issues and rerun:

```bash
npx prettier . --check       # verify formatting
npx eslint .                 # lint the codebase
npx vitest run                # run unit tests
npx playwright test          # run Playwright UI tests
```

**For UI-related changes** (styles, components, layouts), also run:

```bash
npm run check:contrast       # run Pa11y accessibility audit on http://localhost:5000 (start a dev server first)
```

Common fixes:

```bash
npx eslint . --fix          # auto-fix lint errors when possible
npx prettier . --write      # rewrite files with correct formatting
```

## UI Testing and Screenshot Validation

To ensure the game remains visually consistent, we use Playwright for UI testing, including full-page screenshots and element snapshots.

When updating or creating UI components:

- Take full-page or element-specific screenshots during test runs.
- Save manual screenshots to the screenshots/ directory (if needed).
- Visual regression tests use the **screenshots**/ folders adjacent to test files.

Run screenshot tests locally:

npm run test:screenshot

Check generated screenshots and diffs carefully.

- **Do not commit files under `playwright/*-snapshots`.** Baseline screenshots
  are updated automatically by `.github/workflows/playwright-baseline.yml`.
  If Playwright tests fail because visuals changed, mention the failure in your
  pull request description but avoid committing new snapshot images.

📝 Note: Screenshot tests are optional for minor changes but strongly encouraged for any updates affecting layout, components, or styles.

## Additional Notes

- Debug logging can be enabled by setting `DEBUG_LOGGING=true` in the environment.
- The `tests` directory covers helpers and UI functions. Ensure new functionality includes appropriate unit tests.
- The playwright directory covers UI and browser interaction testing.
- Ensure new functionality includes unit tests and UI validation if applicable.

### Commit Messages

- Keep commit messages short and in the imperative mood.
- Reference related issues when applicable.
- **Examples:**
  - `Add carousel component to homepage`
  - `Fix failing date formatter tests`
  - 'Update Battle Mode layout'
