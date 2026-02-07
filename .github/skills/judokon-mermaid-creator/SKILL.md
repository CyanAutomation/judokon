---
name: judokon-mermaid-creator
description: Creates clear, semantically meaningful Mermaid diagrams for JU-DO-KON! PRDs, optimised for AI comprehension first and human readability second.
---

# Skill Instructions

This skill treats Mermaid diagrams as structured reasoning artefacts, not decoration. Diagrams must encode system intent, relationships, and constraints in a way that downstream AI agents can reliably parse, reference, and extend.

## Inputs / Outputs / Non-goals

**Inputs:**

- PRD sections (problem statement, goals, non-goals)
- Feature specs or workflows
- Data models or state transitions
- Architectural constraints or assumptions

**Outputs:**

- Mermaid diagrams embedded in PRDs
- Diagrams aligned with PRD semantics and terminology
- Optional beautiful-mermaid rendering guidance

**Non-goals:**

- Rewriting PRD intent without confirmation
- Producing decorative diagrams detached from requirements

## Key files

- `design/productRequirementsDocuments/*.md`
- `README.md`
- `AGENTS.md`

## When to use this skill

- Creating PRD diagrams from plain-language requirements
- Updating architecture, sequence, state, or flow diagrams
- Translating existing diagrams into cleaner semantic structures

## Diagram rules

1. Match diagram type to intent (flowchart/sequence/state/class/ER).
2. Keep labels explicit and domain-accurate.
3. Keep node count manageable; split large diagrams.
4. Prefer stable node IDs and deterministic ordering.
5. Validate syntax before delivery.

## Styling and readability

- Use consistent direction (`TD`/`LR`) per document section.
- Group related nodes with `subgraph` when it clarifies domain boundaries.
- Avoid excessive inline styling that harms readability.
- Prefer readable node IDs over auto-generated labels.

Aesthetic enhancements must never obscure semantic meaning.

## Operational Guardrails

- **Task Contract**: declare `inputs`, `outputs`, `success`, and `errorMode` before implementation.
- **RAG-first**: run `queryRag(...)` for How/Why/What/Where/Which work; if results are weak twice, fallback to targeted `rg`/file search.
- **Validation + targeted tests**: run `npm run check:jsdoc && npx prettier . --check && npx eslint .` plus `npm run check:contrast` when UI changes and only targeted `vitest`/Playwright tests related to changed files.
- **Critical prohibitions**: no dynamic imports in hot paths (`src/helpers/classicBattle*`, `src/helpers/battleEngineFacade.js`), and no unsilenced `console.warn/error` in tests.

## Required behaviour

- Briefly explain why a given diagram type was chosen
- Call out assumptions or inferred structure
- Flag any ambiguity in the PRD that affects the diagram
- Suggest follow-up diagrams if complexity grows

## Expected output

- Valid Mermaid syntax
- Diagram embedded in Markdown
- Short rationale (2–4 lines)
- Notes on limitations or future extensions
