# Refactoring the Vitest Test Harness (Hub)

**Owner:** QA Platform Team  
**Review cadence:** Monthly (hub links and ownership audit)

This file is now a navigation hub for the harness refactor documentation set. The previous monolithic document exceeded maintainable size, so content was split into stable themed references.

## Documentation Map

- **Architecture reference:** `docs/testing/harness-architecture.md`
- **Migration playbook:** `docs/testing/harness-migration-playbook.md`
- **Troubleshooting guide:** `docs/testing/harness-troubleshooting.md`
- **Command catalog:** `docs/status/reference/harness-command-catalog.md`
- **Migration log (status):** `docs/status/reference/harness-migration-log.md`

## Why this split

- Architecture and troubleshooting are long-lived and belong in `docs/testing/`.
- Operational command references and migration status belong in `docs/status/reference/`.
- Session-by-session procedural notes were reduced to condensed milestones to keep maintenance cost low.

---

## Anchor-preserving redirects

The headings below preserve legacy anchors that external links may still use.

## 1. Executive Summary

Moved to: `docs/testing/harness-architecture.md#purpose`

## 2. Problem and Root Cause Analysis

Moved to: `docs/testing/harness-architecture.md#context`

## 3. The New Test Harness Architecture

Moved to: `docs/testing/harness-architecture.md#architecture-principles`

## 4. Implementation Plan

Moved to: `docs/testing/harness-migration-playbook.md#migration-workflow`

## 5. Developer Guide: Writing Tests

Moved to: `docs/testing/harness-architecture.md#canonical-patterns`

## 6. Opportunities for Improvement & Next Steps

Moved to: `docs/testing/harness-migration-playbook.md#completion-criteria`

## 7. Success Criteria

Moved to: `docs/testing/harness-migration-playbook.md#completion-criteria`

## 8. IMPLEMENTATION LOG

Moved to: `docs/status/reference/harness-migration-log.md`

## Appendix A: Vitest Quick Reference

Moved to: `docs/status/reference/harness-command-catalog.md`
