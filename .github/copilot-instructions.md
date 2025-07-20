# JU-DO-KON! Copilot Instructions

This file guides GitHub Copilot agents contributing to the JU-DO-KON! repository. It consolidates the contributor notes from `AGENTS.md` and `CONTRIBUTING.md`.

## Key Directories

- `index.html` – landing page
- `game.js` – main browser logic
- `helpers/` – modular utilities with extensive JSDoc `@pseudocode` blocks
- `data/` – JSON files for judoka, gokyo techniques, and game configuration
- `tests/` – Vitest unit tests using the `jsdom` environment
- `playwright/` – Playwright UI tests, including screenshot tests
- `design/` – code standards and other docs. Review `design/codeStandards/codeJSDocStandards.md` and `design/codeStandards/codePseudocodeStandards.md`

## Coding Standards

- Use ES modules and modern JavaScript (Node 18+ expected)
- Format code with Prettier and lint with ESLint (`eslint.config.mjs`)
- **Preserve all JSDoc comments and `@pseudocode` blocks**; update them when the code changes
- Public functions require JSDoc following the design docs
- Always refactor complex logic into smaller helpers and keep modules focused on a single responsibility.

## Required Programmatic Checks

Run these commands from the repository root before committing. Resolve issues and rerun until they succeed:

```bash
npx prettier . --check       # verify formatting
npx eslint .                 # lint the codebase
npm run check:contrast       # Pa11y accessibility audit (dev server must run)
npx vitest run               # unit tests
npx playwright test          # Playwright UI tests
```

Useful fixes:

```bash
npx eslint . --fix    # auto-fix lint errors
npx prettier . --write # reformat files
```

Screenshot tests:

```bash
npm run test:screenshot              # run visual regression tests
npx playwright test --update-snapshots  # update baseline screenshots when needed
```

Playwright uses multiple browser projects. The screenshot suite runs separately
for each project and stores snapshots under their respective folders.

- **Do not commit files under `playwright/*-snapshots`.** Baseline screenshots
  are updated automatically by `.github/workflows/playwright-baseline.yml`.
  If Playwright tests fail because visuals changed, note the failure in the pull
  request description but avoid committing new snapshot images.

Screenshot tests are optional for minor changes but strongly encouraged when UI layout or style updates occur.

## Git Hooks

After cloning, run `npm install` and `npm run prepare` to enable Husky pre-commit hooks. The hook automatically runs `npm run lint` and `npm test`.

## Pseudocode and Documentation Rules

- Begin each pseudocode block with `@pseudocode`
- Write numbered, step‑by‑step explanations describing **why** the code acts as it does
- Keep language concise and avoid repeating the code line by line
- Update pseudocode whenever logic changes
- Do not remove existing `@pseudocode` blocks without discussion

## Additional Notes

- Set `DEBUG_LOGGING=true` to enable debug logging
- Ensure new functionality includes unit tests and Playwright validation when relevant

## Commit Messages

- Keep commit messages short and in the imperative mood
- Reference related issues when applicable
- Examples:
  - `Add carousel component to homepage`
  - `Fix failing date formatter tests`
  - `Update Battle Mode layout`
