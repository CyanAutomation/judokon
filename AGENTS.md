# Ju-Do-Kon! Agent Guide

This repository contains the source for **JU-DO-KON!**, a browser-based card game about judo.

## Key Directories

- `index.html` – landing page.
- `game.js` – main browser logic.
- `helpers/` – modular utilities used throughout the game. Functions include extensive JSDoc with `@pseudocode` blocks.
- `data/` – JSON files for judoka, gokyo techniques and game configuration.
- `tests/` – Vitest unit tests using the `jsdom` environment.
- `design/` – documentation including code standards. Review `design/codeStandards` for JSDoc and pseudocode expectations.

## Coding Standards

- Use ES modules and modern JavaScript (Node 18+ is expected).
- Format code with Prettier and lint with ESLint. The repo uses the config from `eslint.config.mjs`.
- **JSDoc comments and pseudocode blocks must remain intact**. Keep `@pseudocode` blocks in place, but update them if the code changes so the description stays accurate.
- Public functions should have JSDoc documentation following the examples in `design/codeStandards`.

## Programmatic Checks

Run the following commands from the repository root before committing:

```bash
npx prettier . --check      # verify formatting
npx eslint .                # lint the codebase
npx vitest run              # execute unit tests
```

## Additional Notes

- Debug logging can be enabled by setting `DEBUG_LOGGING=true` in the environment.
- The `tests` directory covers helpers and UI functions. Ensure new functionality includes appropriate unit tests.
- Keep commit messages concise and descriptive.
