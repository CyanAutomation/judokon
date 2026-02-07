---
name: judokon-json-authority
description: Creates, modifies, and validates JU-DO-KON! JSON files while preserving schema consistency and downstream compatibility.
---

# Skill Instructions

This skill treats JSON as executable configuration.

## Inputs / Outputs / Non-goals

- Inputs: JSON schemas, affected feature specs, validation commands.
- Outputs: schema-safe JSON edits, impact notes, suggested validations.
- Non-goals: schema-breaking changes without explicit approval.

## Key files

- `src/data/judoka.json`
- `src/data/tooltips.json`
- `src/config/settingsDefaults.js`
- `design/productRequirementsDocuments/prdDevelopmentStandards.md`

## What this skill helps accomplish

- Maintain consistent data contracts
- Prevent silent breakage across modules
- Improve predictability of AI-generated data changes

## When to use this skill

- Editing judoka.json or battle state files
- Adding new metadata or configuration
- Modifying tooltips or content files

## Rules for JSON changes

1. **Schema stability first**
2. **Additive changes preferred**
3. **Explicit defaults for new fields**
4. **Identify impacted consumers**

## Validation

- Prefer `npm run validate:data` after JSON edits.

## Operational Guardrails

- **Task Contract**: declare `inputs`, `outputs`, `success`, and `errorMode` before implementation.
- **RAG-first**: run `queryRag(...)` for How/Why/What/Where/Which work; if results are weak twice, fallback to targeted `rg`/file search.
- **Validation + targeted tests**: run `npm run check:jsdoc && npx prettier . --check && npx eslint .` plus `npm run check:contrast` when UI changes and only targeted `vitest`/Playwright tests related to changed files.
- **Critical prohibitions**: no dynamic imports in hot paths (`src/helpers/classicBattle*`, `src/helpers/battleEngineFacade.js`), and no unsilenced `console.warn/error` in tests.

## Required behaviour

- Explain why a change is safe
- Call out any required code updates
- Suggest validation or tests if needed

## Expected output

- Well-structured JSON
- Clear explanation of changes
- Impact analysis
