## Goal

Produce a small, actionable plan to make `design/productRequirementsDocuments/` the single source of truth by comparing the existing `docs/` and top-level `design/` documents to the PRDs, flagging missing PRDs and documents that should be assimilated into PRDs.

This file is a short audit, mapping, and phased plan. After you review, I'll implement the changes you approve (create missing PRDs or merge docs into PRDs).

## Quick summary (high level)

- I compared `docs/` and `design/technical` against `design/productRequirementsDocuments/`.
- Most high-level topics in `docs/` already have a matching PRD (or a related PRD exists). Several technical/operational docs in `docs/technical` and `design/` should be assimilated into their corresponding PRDs (for discoverability and governance). A few topics are missing an explicit PRD and should be created.

## Inventory & mapping (docs -> PRD)

The following maps the main files I checked to existing PRDs (exact matches or recommended home):

- `docs/battle-cli.md` / `docs/battleCLI.md` → `design/productRequirementsDocuments/prdBattleCLI.md` (exists)
- `docs/round-selection.md` → `design/productRequirementsDocuments/prdRoundSelection.md` (exists)
- `docs/vector-search.md` → `design/productRequirementsDocuments/prdVectorDatabaseRAG.md` (exists)
- `docs/testing-modes.md` → `design/productRequirementsDocuments/prdTestMode.md` (exists)
- `docs/testing-guide.md` / `docs/validation-commands.md` → `design/productRequirementsDocuments/prdTestingStandards.md` (exists) or `prdDevelopmentStandards.md` / `prdCodeStandards.md` (review/merge recommended)
- `docs/roundUI.md` → candidate to be assimilated into `prdBattleMarkup.md` or `prdUIDesignSystem.md` (PRD exists)
- `docs/components.md` → `prdUIDesignSystem.md` (exists)
- `docs/product-docs.md` (PRD reader) → `prdPRDViewer.md` (exists)
- `docs/technical/dataSchemas.md` → `prdDataSchemas.md` (exists)
- `docs/technical/eventNamingAudit.md` → content should be assimilated or referenced by `prdEventContracts.md` (exists)
- `docs/technical/stateHandlerAudit.md` → should be assimilated or referenced by `prdStateHandler.md` (exists)
- `docs/technical/battleMarkup.md` → canonical markup should be assimilated into `prdBattleMarkup.md` (exists)
- `docs/technical/ui-tooltips-manifest.md` → `prdTooltipSystem.md` / `prdTooltipViewer.md` (exists) — merge guidance into the PRD

Notes: the `design/` folder also contains `battleMarkup.md`, `eventNamingAudit.md`, and `stateHandlerAudit.md` (plus `design/testing/`) which are technical audits and implementation notes — these should be either referenced by matching PRDs or their authoritative content moved into PRDs.

## Missing PRDs (recommend creating)

Based on the scan there are a few topics where a dedicated PRD is missing or where the doc currently lives outside `productRequirementsDocuments` and would benefit from a PRD-style treatment:

1. Integration & Public API Contracts PRD (if not covered) — a place to centralize CLI / Test API / public browser Test API contracts. I did not find a single PRD that explicitly lists the Test API surface and CLI telemetry contracts. If you want this explicitly, create `prdPublicAPIs.md` or fold into `prdBattleCLI.md`.
2. Event naming migration plan as a PRD supplement — `docs/technical/eventNamingAudit.md` is an audit; the migration plan and acceptance criteria should live in `prdEventContracts.md` (extend it). No new PRD necessary, but a short PRD supplement page (e.g., `prdEventNamingMigration.md`) could be created if you want a separate tracked plan.
3. Test utilities & Playwright helpers PRD — `docs/testing-modes.md` and `playwright/fixtures` contain helpers and conventions; some of this is in `prdTestingStandards.md`, but a focused `prdTestHelpers.md` would help standardize helper APIs and governance (optional).

If you prefer a minimal approach, these can be merged into existing PRDs instead of creating new ones. I recommend folding (2) into `prdEventContracts.md` and (1) into `prdBattleCLI.md` or `prdDevelopmentStandards.md` unless you want separate ownership.

## Documents I recommend assimilating into PRDs

These docs are currently authoritative but are better governed as PRD content (or referenced from PRD with a snapshot/gist):

- `docs/technical/eventNamingAudit.md` → merge into `prdEventContracts.md` (inventory + migration plan + test helpers + mapping table)
- `design/stateHandlerAudit.md` & `docs/technical/stateHandlerAudit.md` → merge into `prdStateHandler.md` (state graph, required actions, compliance matrix)
- `design/battleMarkup.md` and `docs/technical/battleMarkup.md` → merge into `prdBattleMarkup.md` (canonical IDs + machine-readable mapping) — note: `design/dataSchemas/battleMarkup.json` and generated module already exists from previous work and should be referenced by the PRD
- `docs/testing-modes.md` → merge into `prdTestMode.md` or expand `prdTestingStandards.md` to include the test utilities and modes
- `docs/validation-commands.md` → reference or extract key commands into `prdTestingStandards.md` and `prdDevelopmentStandards.md` (CI-level requirements)
- `docs/roundUI.md` → assimilate to `prdBattleMarkup.md` or `prdUIDesignSystem.md` depending on scope (UI contract vs high-level design)

Rationale: PRDs are the discoverable canonical source and include acceptance criteria, owners, and change policy. Technical audits and how-to docs are valuable, but they should either be referenced from PRDs or included inside PRDs under a clearly labeled "implementation notes / audits" section.

## Planned approach — phased, discrete steps

Phase 0 — Confirm scope (this PR)
- Deliverable: this `progressRefactor.md` with mapping and proposed plan. You review and confirm which items to create vs assimilate.

Phase 1 — Low-risk assimilation (quick wins)
- For each doc flagged above (event naming, state handler, battle markup, testing modes, validation commands):
	- Create PRD supplement entries or extend existing PRDs with a new section "Implementation notes / audit" and link to original doc.
	- Add acceptance criteria and owner for each inserted section.
	- Create machine-readable artifacts where useful (e.g., `design/dataSchemas/events/*.json` for schemas; `design/dataSchemas/battleMarkup.generated.js` already exists).
- Success criteria: PRDs updated, CI and Prettier pass, no behavior changes.

Phase 2 — New PRDs and consolidation (if approved)
- Create any missing PRDs (e.g., `prdPublicAPIs.md` or `prdEventNamingMigration.md`) with the standard PRD template.
- Migrate significant content from `docs/` into PRDs (copy with attribution) and mark original doc as archived or redirect to PRD.
- Success criteria: New PRDs created, index updated (`prdIndex.json`) and reviewers assigned.

Phase 3 — Test & automation
- Add small consumer tests where PRDs added schema/artifacts (e.g., AJV-based schema validation tests under `tests/` referencing `design/dataSchemas/events/*.json`).
- Add a generation script to build `design/dataSchemas/battleMarkup.generated.js` from the canonical JSON and include it in `package.json` (e.g., `npm run generate:markup`).
- Success criteria: Tests that validate schemas and helpers run in CI; generated artifact pipeline in place.

Phase 4 — Cleanup and deprecation
- Remove or archive duplicate docs from `docs/` if their content is fully absorbed into PRDs. Keep short redirect doc with a pointer back to PRD. Update links across the repo (README, docs, tests).
- Add a short changelog entry listing the moves.

Phase 5 — Governance & ongoing maintenance
- Add a small checklist in `prdCodeStandards.md` requiring new PRDs or PRD updates when design/docs content is added.
- Add owners to PRDs that currently have placeholders so future changes are gated and traceable.

## Risks and mitigations

- Risk: Breaking links or CI if tests depend on docs in place. Mitigation: Phase 1 only adds references; Phase 4 removes content only after PRD consumers point to PRD and tests pass.
- Risk: PRDs become large. Mitigation: keep PRD sections focused; move large implementation guides to `design/implementation/` and link them from PRD with a summary.

## Suggested immediate next actions (pick one)

1. "Minimal": I will implement Phase 1 for the high-value items (eventNamingAudit → `prdEventContracts.md`, stateHandlerAudit → `prdStateHandler.md`, battleMarkup → `prdBattleMarkup.md`, testing-modes → `prdTestMode.md`) and add links to the original docs. This is low-risk and makes PRDs authoritative quickly.
2. "Full consolidation": I will implement Phases 1–3 (create any missing PRDs, move docs into PRDs, add generated artifacts and minimal consumer tests). This is more work but finishes the job end-to-end.

Please tell me which immediate action you prefer (1 or 2). Once you confirm, I'll begin Phase 1 and apply the agreed changes. I'll pause here awaiting your review and choice.

