---
name: judokon-planning-and-investigation
description: Supports planning, investigation, and analysis tasks by encouraging structured reasoning and use of the JU-DO-KON! RAG vector database.
---

# Skill Instructions

This skill is for thinking before coding.

## Inputs / Outputs / Non-goals

- Inputs: user questions, relevant PRDs/docs, RAG queries and results.
- Outputs: investigation summary, sources, unknowns, recommended next steps.
- Non-goals: implementation changes without a follow-up task.

## Key files

- `AGENTS.md`
- `design/productRequirementsDocuments/prdAIAgentWorkflows.md`
- `design/productRequirementsDocuments/prdVectorDatabaseRAG.md`
- `src/helpers/queryRag.js`

## What this skill helps accomplish

- Avoid reinventing solutions
- Surface existing knowledge
- Ground decisions in prior work

## When to use this skill

- Investigating bugs
- Planning new features
- Exploring design options
- Answering “how does this work?” questions

## Mandatory behaviour

1. **Search the RAG vector database first**
2. **Summarise relevant findings**
3. **Cite existing code, PRDs, or docs**
4. **Identify unknowns explicitly**

## RAG format

- Query template: `"topic + file type + context"` (example: "battle timer phases scoreboard implementation").
- Prefer `withProvenance: true` and quote sources in the summary.

## Investigation steps

1. Query RAG embeddings for related concepts
2. Review similar past implementations
3. Identify constraints and invariants
4. Propose next steps (not solutions yet)

## Stop conditions

- If RAG results are weak twice, fallback to targeted file search.

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
  - No dynamic imports in hot paths: `src/helpers/classicBattle*`, `src/helpers/BattleEngine.js`, `src/helpers/battle/*`.
  - No unsilenced `console.warn/error` in tests (use `tests/utils/console.js` helpers).
  - Validate prohibitions with:
    - `grep -RIn "await import\(" src/helpers/classicBattle src/helpers/BattleEngine.js src/helpers/battle 2>/dev/null`
    - `grep -RInE "console\.(warn|error)\(" tests | grep -v "tests/utils/console.js"`

## Execution handoff target

- For coding execution, hand off to `judokon-implementation-engineer` at `.github/skills/judokon-implementation-engineer/SKILL.md`.

## Expected output

- Investigation summary
- Referenced sources
- Clear recommendations or questions
