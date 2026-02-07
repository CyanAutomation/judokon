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

- **Task Contract**: declare `inputs`, `outputs`, `success`, and `errorMode` before implementation.
- **RAG-first**: run `queryRag(...)` for How/Why/What/Where/Which work; if results are weak twice, fallback to targeted `rg`/file search.
- **Validation + targeted tests**: run `npm run check:jsdoc && npx prettier . --check && npx eslint .` plus `npm run check:contrast` when UI changes and only targeted `vitest`/Playwright tests related to changed files.
- **Critical prohibitions**: no dynamic imports in hot paths (`src/helpers/classicBattle*`, `src/helpers/battleEngineFacade.js`), and no unsilenced `console.warn/error` in tests.

## Expected output

- Investigation summary
- Referenced sources
- Clear recommendations or questions
