---
name: judokon-mermaid-creator
description: Creates clear, semantically meaningful Mermaid diagrams for JU-DO-KON! PRDs, optimised for AI comprehension first and human readability second.
---

# Skill Instructions

## Inputs / Outputs / Non-goals

- Inputs: PRD sections, workflows, data models, state transitions, architecture constraints.
- Outputs: valid Mermaid diagrams aligned with PRD semantics and terminology.
- Non-goals: decorative diagrams that diverge from requirements.

## Trigger conditions

Use this skill when prompts include or imply:

- Creating or updating PRD architecture/flow/state diagrams.
- Translating plain-language requirements into Mermaid syntax.
- Refactoring unclear diagrams into semantic structures.

## Mandatory rules

- Match diagram type to intent (flowchart/sequence/state/class/ER).
- Keep labels explicit, domain-accurate, and deterministic.
- Split oversized diagrams rather than overloading one chart.
- Use stable node IDs and validate syntax before delivery.
- Keep styling secondary to semantic clarity.

## Validation checklist

- [ ] Diagram parses as valid Mermaid syntax.
- [ ] Node labels and terms match source PRD language.
- [ ] Scope and assumptions are explicitly documented.
- [ ] Markdown rendering remains readable.

## Expected output format

- Mermaid block embedded in Markdown.
- 2–4 line rationale for diagram type and structure choices.
- Notes on assumptions, ambiguities, and future extension opportunities.

## Failure/stop conditions

- Stop if requirements are too ambiguous to model faithfully.
- Stop if diagram semantics conflict with source PRD terminology.
