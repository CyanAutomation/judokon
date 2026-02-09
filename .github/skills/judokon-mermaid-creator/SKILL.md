---
name: judokon-mermaid-creator
description: Creates clear, semantically meaningful Mermaid diagrams for JU-DO-KON! PRDs, optimised for AI comprehension first and human readability second. Supports both embedded markdown diagrams and CLI-based programmatic generation/export.
---

# Skill Instructions

## Inputs / Outputs / Non-goals

- Inputs: PRD sections, workflows, data models, state transitions, architecture constraints, diagram source files (`.mmd`).
- Outputs: valid Mermaid diagrams aligned with PRD semantics and terminology; CLI-generated image exports (SVG, PNG, PDF).
- Non-goals: decorative diagrams that diverge from requirements.

## Trigger conditions

Use this skill when prompts include or imply:

- Creating or updating PRD architecture/flow/state diagrams.
- Translating plain-language requirements into Mermaid syntax.
- Refactoring unclear diagrams into semantic structures.
- Generating diagrams programmatically from code or data structures.
- Exporting diagrams to static image formats for documentation.

## Mandatory rules

- Match diagram type to intent (flowchart/sequence/state/class/ER).
- Keep labels explicit, domain-accurate, and deterministic.
- Split oversized diagrams rather than overloading one chart.
- Use stable node IDs and validate syntax before delivery.
- Keep styling secondary to semantic clarity.
- When using CLI: ensure source `.mmd` files are validated and theme is consistent with brand guidelines (configured in `mermaid.config.json`).

## Validation checklist

- [ ] Diagram parses as valid Mermaid syntax.
- [ ] Node labels and terms match source PRD language.
- [ ] Scope and assumptions are explicitly documented.
- [ ] Markdown rendering remains readable (for embedded diagrams).
- [ ] CLI exports (if used) render correctly and meet contrast requirements.

## Expected output format

### Markdown-Embedded Diagrams

- Mermaid block embedded in Markdown.
- 2–4 line rationale for diagram type and structure choices.
- Notes on assumptions, ambiguities, and future extension opportunities.

### CLI-Generated Exports

- `.mmd` source file with complete, documented diagram.
- Exported image file (SVG, PNG) in `artifacts/` or `docs/diagrams/` directory.
- Brief markdown summary: diagram purpose, export target, browsers/tools tested.

## CLI Usage (Programmatic Generation & Export)

### Common Commands

```bash
# Generate SVG from a Mermaid source file
npm run diagram:gen -i flowchart.mmd -o flowchart.svg

# Generate PNG with project theme defaults
node scripts/runMermaid.js -i diagram.mmd -o diagram.png

# Quick preview (saves to /tmp/preview.svg for inspection)
npm run diagram:preview
```

### Wrapper Script Integration

Use `scripts/runMermaid.js` for consistent CLI invocation with config and logging:

```bash
# Direct invocation with custom theme
node scripts/runMermaid.js -i state-machine.mmd -o state-machine.svg --theme dark

# Batch export (loop over multiple files)
for file in src/diagrams/*.mmd; do
  node scripts/runMermaid.js -i "$file" -o "artifacts/$(basename $file .mmd).svg"
done
```

### Configuration

Project defaults are defined in `mermaid.config.json`:

- `theme`: Default rendering theme (e.g., "default", "forest", "dark")
- `outputFormat`: Default export format (svg, png, pdf)
- `cssFile`: Optional custom CSS for styling (path or null)

Override per-command as needed using mermaid-cli flags.

### Output Organization

Save all programmatic exports in a structured directory:

```
artifacts/
  diagrams-2026-02-08/
    battle-flow.mmd (source)
    battle-flow.svg (export)
    state-machine.mmd
    state-machine.svg
    README.md (index/summary)
```

## Failure/stop conditions

- Stop if requirements are too ambiguous to model faithfully.
- Stop if diagram semantics conflict with source PRD terminology.
- Stop if CLI export fails (indicate missing system dependencies, e.g., Graphviz).
- Stop if rendered diagram contrast or legibility is insufficient for documentation use.
