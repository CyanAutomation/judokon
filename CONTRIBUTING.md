# Contributing to JU-DO-KON!

This document summarizes the key steps and rules for submitting pull requests.
It consolidates the instructions from `AGENTS.md` and the design documents so
contributors can quickly confirm the required checks and documentation
standards.

## Required Programmatic Checks

Before committing any changes run the following commands from the repository
root. Fix any issues and rerun the checks until they all pass.

```bash
npx prettier . --check       # verify formatting
npx eslint .                 # lint the codebase
npm run check:contrast       # ensure CSS meets WCAG AA contrast
npx vitest run               # run unit tests
npx playwright test          # run Playwright UI tests
```

Useful fixes:

```bash
npx eslint . --fix    # auto-fix lint errors
npx prettier . --write # reformat files
```

Playwright also supports visual regression testing. Run screenshot tests with:

```bash
npm run test:screenshot
```

If a UI change is intended, update baseline screenshots with:

```bash
npx playwright test --update-snapshots
```

## Git Hooks

The project uses [Husky](https://typicode.github.io/husky) for local Git hooks.
Run `npm install` followed by `npm run prepare` after cloning to enable the
pre-commit hook. The hook automatically runs `npm run lint` and `npm test` to
catch issues before commits are created.

## Pseudocode and Documentation Rules

JU-DO-KON! relies heavily on detailed JSDoc comments with `@pseudocode`
blocks. Follow these guidelines derived from the design documents:

- Use the `@pseudocode` marker at the start of each pseudocode block.
- Write pseudocode as a numbered, step‑by‑step list that explains **why** the
  code performs its actions.
- Keep language clear and concise. Do not repeat the code line by line.
- Update pseudocode whenever the corresponding logic changes.
- Never remove existing `@pseudocode` blocks without discussing it in review.

See `design/codeStandards/codeJSDocStandards.md` and
`design/codeStandards/codePseudocodeStandards.md` for full examples and
additional guidance.

## Commit Messages

Write short, imperative commit messages. Reference related issues if
applicable, for example:

```
Add carousel component to homepage
Fix failing date formatter tests
Update Battle Mode layout and regenerate screenshots
```

---

Following these steps helps keep the project consistent and ensures PRs are
reviewed quickly. Thanks for contributing!
