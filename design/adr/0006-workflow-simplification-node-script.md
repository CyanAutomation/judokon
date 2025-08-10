# ADR 0006: Node Script for Test Stats and Dice Roll

## Status

Accepted

## Context

The Playwright baseline workflow used long inline Bash blocks to gather test
statistics and generate a random "judo throw" message. The logic was hard to
reuse and difficult to test.

## Decision

Moved stats gathering and dice-roll logic into `scripts/collectTestStats.mjs`.
The workflow now invokes `node scripts/collectTestStats.mjs` and reads the
outputs. This script is unit tested and can be reused in other workflows. We
considered extracting the repeated setup steps of the workflow into a composite
action but deferred until more workflows need the same setup.

## Consequences

- Workflow YAML is shorter and easier to maintain.
- Test stats and dice-roll logic are reusable across workflows.
- Future consolidation of setup steps can use the shared script as a building
  block.
