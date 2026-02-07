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

- **Task Contract (required before implementation):**
  - `inputs`: exact files/data/commands you will use.
  - `outputs`: exact files/tests/docs you will change.
  - `success`: required outcomes (checks/tests/log discipline).
  - `errorMode`: explicit stop condition (for example: ask on public API change).
- **RAG-first rule + fallback process:**
  1. Use `queryRag(...)` first for How/Why/What/Where/Which questions and implementation lookups.
  2. If results are weak, rephrase and run a second RAG query.
  3. If still weak, fall back to targeted `rg`/file search and cite what was checked.
- **Required validation commands + targeted-test policy:**
  - Run core checks: `npm run check:jsdoc && npx prettier . --check && npx eslint . && npm run check:contrast`.
  - Run only targeted tests for changed files (`npx vitest run <path>` / focused Playwright spec). Run full suite only for cross-cutting changes.
- **Critical prohibitions (must not violate):**
  - No dynamic imports in hot paths: `src/helpers/classicBattle*`, `src/helpers/battleEngineFacade.js`, `src/helpers/battle/*`.
  - No unsilenced `console.warn/error` in tests (use `tests/utils/console.js` helpers).
  - Validate prohibitions with:
    - `grep -RIn "await import\(" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle 2>/dev/null`
    - `grep -RInE "console\.(warn|error)\(" tests | grep -v "tests/utils/console.js"`

## Required behaviour

- Explain why a change is safe
- Call out any required code updates
- Suggest validation or tests if needed

## Expected output

- Well-structured JSON
- Clear explanation of changes
- Impact analysis
