# Project Architecture Overview

This document summarizes the main source folders and their responsibilities.

## game.js

The entry point for the browser. It waits for `DOMContentLoaded` and wires up all game interactions. Helper functions are imported here to build the card carousel, fetch data, and render random judoka cards.

## helpers/

Reusable utilities organized by concern (card building, data fetching, random card generation, etc.). Each module is documented with JSDoc and `@pseudocode` blocks for clarity.

## data and schemas

Structured gameplay data lives in `src/data`. Matching JSON Schemas in `src/schemas` describe and validate these files. The `npm run validate:data` script uses Ajv to ensure data integrity.

## tests

Unit tests under `tests/` run in the Vitest `jsdom` environment. The `playwright/` directory contains end‑to‑end tests and screenshot comparisons to prevent UI regressions.
