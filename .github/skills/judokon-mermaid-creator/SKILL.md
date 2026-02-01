---
name: judokon-mermaid-creator
description: Creates clear, semantically meaningful Mermaid diagrams for JU-DO-KON! PRDs, optimised for AI comprehension first and human readability second.
---
Skill Instructions
This skill treats Mermaid diagrams as structured reasoning artefacts, not decoration.
Diagrams must encode system intent, relationships, and constraints in a way that downstream AI agents can reliably parse, reference, and extend.

Inputs / Outputs / Non-goals
Inputs
PRD sections (problem statement, goals, non-goals)
Feature specs or workflows
Data models or state transitions
Architectural constraints or assumptions
Outputs
Mermaid diagrams embedded in PRDs
Diagrams aligned with PRD semantics and terminology
Optional beautiful-mermaid annotations or layout hints
Non-goals
Purely aesthetic diagrams
Diagrams that duplicate prose without adding structure
Overly detailed UML-style modelling unless explicitly requested
What this skill helps accomplish
Make PRDs machine-readable and agent-friendly
Reduce ambiguity in workflows, state transitions, and ownership
Enable AI agents to reason about architecture and behaviour visually
Provide a single source of truth for feature structure
When to use this skill
Writing or updating PRDs
Introducing new features or game modes
Clarifying workflows, lifecycles, or decision trees
Explaining data flow, state machines, or component boundaries
Supported Mermaid diagram types
Use the simplest diagram that expresses intent:
flowchart — feature flows, decision logic, user journeys
sequenceDiagram — interactions between systems or actors
stateDiagram-v2 — game states, modes, or lifecycle transitions
classDiagram — conceptual data models (not implementation classes)
graph — high-level architecture or dependency mapping
beautiful-mermaid integration
When appropriate, this skill may:
Use %%{init: {...}}%% blocks for layout clarity
Apply consistent directionality (LR, TB) across diagrams
Group related nodes using subgraphs
Prefer readable node IDs over auto-generated labels
Aesthetic enhancements must never obscure semantic meaning.
Diagram design rules
Semantic clarity over completeness
If a concept is not important to reasoning, omit it.
Stable naming
Use PRD terminology exactly. Do not invent synonyms.
Explicit decision points
Conditional logic must be visually obvious.
Bounded scope
One diagram = one idea. Split if necessary.
AI-readable first
Assume another agent will parse and build on this diagram.
Common PRD locations
docs/prd/*.md
Feature sections within README.md
Design notes and architecture overviews
Required behaviour
Briefly explain why a given diagram type was chosen
Call out assumptions or inferred structure
Flag any ambiguity in the PRD that affects the diagram
Suggest follow-up diagrams if complexity grows
Expected output
Valid Mermaid syntax
Diagram embedded in Markdown
Short rationale (2–4 lines)
Notes on limitations or future extensions