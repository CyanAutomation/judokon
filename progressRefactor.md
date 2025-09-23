## Goal

Produce a small, actionable plan to make `design/productRequirementsDocuments/` the single source of truth by comparing the existing `docs/` and top-level `design/` documents to the PRDs, flagging missing PRDs and documents that should be assimilated into PRDs. This revision documents the validation results and updates the plan accordingly.

## Validation summary

- Confirmed that every PRD referenced below exists under `design/productRequirementsDocuments/`.
- There is no `design/technical/` directory; the duplicated audits live under `docs/technical/` and at the root of `design/`. Language below reflects the actual paths.
- Additional documents surfaced during validation require explicit mapping: `docs/TestValuePolicy.md`, `docs/rag-system.md`, `docs/technical/architecture.md`, `docs/technical/classicBattleTesting.md`, `design/architecture.md`, `design/testing/classicBattleTesting.md`, and the `design/eventAudit/` artifacts.
- The Battle CLI topic is split between `docs/battle-cli.md` (usage) and `docs/battleCLI.md` (module structure). Those guides should be merged while migrating content into `prdBattleCLI.md`.
- `design/codeStandards/` already holds deep dives referenced by `prdCodeStandards.md`; make sure those references stay canonical when content moves.

## Inventory & mapping (docs → PRD home)

- `docs/battle-cli.md` / `docs/battleCLI.md` → `design/productRequirementsDocuments/prdBattleCLI.md` (exists; merge usage + module structure into PRD appendix and collapse duplicate Markdown once PRD is authoritative).
- `docs/round-selection.md` → `prdRoundSelection.md` (exists).
- `docs/vector-search.md` → `prdVectorDatabaseRAG.md` (exists).
- `docs/rag-system.md` → `prdVectorDatabaseRAG.md` (PRD covers RAG operations; incorporate agent usage guidance or reference it from PRD).
- `docs/testing-modes.md` → `prdTestMode.md` and `prdTestingStandards.md` (exists; split mode taxonomy vs helper APIs).
- `docs/testing-guide.md` / `docs/validation-commands.md` / `docs/TestValuePolicy.md` → `prdTestingStandards.md` plus `prdCodeStandards.md` (exists; ensure evaluation rubrics and command matrix live in PRDs).
- `docs/components.md` → `prdUIDesignSystem.md` (exists).
- `docs/roundUI.md` → `prdBattleMarkup.md` or `prdUIDesignSystem.md` (decide based on whether the content is markup contract vs component style guidance).
- `docs/product-docs.md` → `prdPRDViewer.md` (exists).
- `docs/technical/architecture.md` / `design/architecture.md` → `prdArchitecture.md` (exists; collapse duplicate Markdown after integrating callouts).
- `docs/technical/battleMarkup.md` / `design/battleMarkup.md` → `prdBattleMarkup.md` (exists; treat Markdown as temporary appendix until canonical schema lives in PRD).
- `docs/technical/dataSchemas.md` → `prdDataSchemas.md` (exists).
- `docs/technical/eventNamingAudit.md` / `design/eventNamingAudit.md` / `design/eventAudit/*.txt` → `prdEventContracts.md` (exists; move migration tables + listener inventories).
- `docs/technical/stateHandlerAudit.md` / `design/stateHandlerAudit.md` → `prdStateHandler.md` (exists).
- `docs/technical/classicBattleTesting.md` / `design/testing/classicBattleTesting.md` → `prdBattleClassic.md` (testing section) with a cross-link from `prdTestingStandards.md`.
- `docs/technical/ui-tooltips-manifest.md` → `prdTooltipSystem.md` / `prdTooltipViewer.md` (exists).
- `design/testing/classicBattleTesting.md`, `design/codeStandards/*.md`, and similar deep dives remain valuable as implementation notes; decide per file whether to fold content into the owning PRD or keep them as linked appendices with a clear authority statement.

## Missing PRDs or extensions

1. **Public API & integration contracts** – No single PRD enumerates CLI telemetry, Test API surfaces, and automation hooks. Either extend `prdBattleCLI.md` and `prdDevelopmentStandards.md` with a consolidated table or create `prdPublicAPIs.md`.
2. **Classic Battle test harness ownership** – Expand `prdBattleClassic.md` with an explicit testing appendix summarizing harness helpers and promises (or create `prdBattleClassicTesting.md` if scope demands a standalone PRD).
3. **Event migration tracker** – Extend `prdEventContracts.md` with migration status, acceptance criteria, and exit checklist. Split into a companion PRD only if the material outgrows the main document.
4. **Test helper governance (optional)** – If helper APIs require explicit owners and change control, introduce `prdTestHelpers.md`; otherwise add a dedicated section to `prdTestingStandards.md`.

## Documents to assimilate or cross-reference

- `docs/technical/eventNamingAudit.md`, `design/eventNamingAudit.md`, `design/eventAudit/*.txt` → combine into `prdEventContracts.md` with an audit appendix; leave a stub README pointing to the PRD.
- `docs/technical/stateHandlerAudit.md` & `design/stateHandlerAudit.md` → integrate diagrams + compliance table into `prdStateHandler.md`.
- `docs/technical/battleMarkup.md` & `design/battleMarkup.md` → integrate canonical markup into `prdBattleMarkup.md`; reference `design/dataSchemas/battleMarkup.json` and `battleMarkup.generated.js`.
- `docs/testing-modes.md`, `docs/testing-guide.md`, `docs/TestValuePolicy.md`, `design/codeStandards/evaluatingPlaywrightTests.md`, `design/codeStandards/evaluatingUnitTests.md` → consolidate into `prdTestingStandards.md` with clear subsections for agent vs human workflows.
- `docs/validation-commands.md` → split command matrix between `prdTestingStandards.md` (test suite) and `prdDevelopmentStandards.md` (agent/dev workflows); keep CLI script references synchronized.
- `docs/rag-system.md` → summarize agent workflow in `prdVectorDatabaseRAG.md` and link to `design/agentWorkflows/` examples.
- `docs/technical/architecture.md`, `design/architecture.md` → migrate architectural overview into `prdArchitecture.md` (with diagrams referenced from `design/architecture/` if needed).
- `docs/technical/classicBattleTesting.md`, `design/testing/classicBattleTesting.md` → embed deterministic testing checklist in `prdBattleClassic.md` and `prdTestingStandards.md`, then archive duplicates.
- `docs/components.md` and `docs/roundUI.md` → integrate into `prdUIDesignSystem.md` and ensure `prdBattleMarkup.md` owns DOM contracts.

## Proposed mapping for currently-unmapped docs (recommended)

Below are the unmapped documents discovered in the inventory scan with a recommended PRD target, a suggested action (assimilate, stub, or create new PRD), and a short rationale. If you approve, I will implement these as stubs or appendices on a feature branch.

- `docs/TestValuePolicy.md` -> `prdTestingStandards.md`
  - Action: Assimilate (append acceptance criteria + testing rubric)
  - Rationale: This doc belongs with test value definitions and evaluation rules used by Playwright/Vitest; `prdTestingStandards.md` should own the policy.

- `docs/components.md` -> `prdUIDesignSystem.md`
  - Action: Assimilate (migrate component descriptions and examples into PRD appendix)
  - Rationale: Component-level guidance supports the UI design system and should be consolidated under `prdUIDesignSystem.md`.

- `docs/product-docs.md` -> `prdPRDViewer.md`
  - Action: Stub (create redirect stub pointing to `prdPRDViewer.md` and note owner)
  - Rationale: This is documentation about product docs themselves; the PRD viewer PRD is the natural owner.

- `docs/rag-system.md` -> `prdVectorDatabaseRAG.md`
  - Action: Assimilate (append agent usage guidance and provenance rules)
  - Rationale: The RAG usage and agent workflow belong with the vector/RAG PRD.

- `docs/roundUI.md` -> `prdBattleMarkup.md` (or `prdUIDesignSystem.md`)
  - Action: Decide + Assimilate (prefer `prdBattleMarkup.md` for DOM contract content; move style/UX guidance to `prdUIDesignSystem.md`)
  - Rationale: Round UI contains both markup contract and styling guidance; split accordingly.

- `docs/testing-guide.md` -> `prdTestingStandards.md`
  - Action: Assimilate (merge testing how-tos and actionable commands into PRD sections)
  - Rationale: Operational testing guidance should live in the testing standards PRD alongside validation commands and policies.

- `docs/testing-modes.md` -> `prdTestMode.md` + `prdTestingStandards.md`
  - Action: Assimilate (taxonomy into `prdTestMode.md`, enforcement and rubrics into `prdTestingStandards.md`)
  - Rationale: Mode definitions and test runner modes deserve a small dedicated PRD but must be cross-linked to standards.

- `docs/validation-commands.md` -> `prdTestingStandards.md` + `prdDevelopmentStandards.md`
  - Action: Split & Assimilate (test-run commands into testing PRD; agent/dev workflow commands into dev standards PRD)
  - Rationale: The command matrix serves both test operations and developer/agent workflows; split reduces PRD scope creep.

- `docs/vector-search.md` -> `prdVectorDatabaseRAG.md` (verify)
  - Action: Confirm assimilation (ensure Appendix contains the workflow and remove source or add stub)
  - Rationale: Vector search content belongs in the RAG PRD; if not already fully merged, finish assimilation.

- `design/battleCLI-legacy-alignment.md` -> `prdBattleCLI.md`
  - Action: Assimilate (append legacy alignment notes and migration checklist)
  - Rationale: Legacy alignment concerns the CLI behavior; `prdBattleCLI.md` should document compatibility and migration steps.

- `design/eventNamingAudit.md` -> `prdEventContracts.md`
  - Action: Assimilate (append audit tables and migration checklist)
  - Rationale: Event naming and listener contract audits belong under the event contracts PRD.

- `design/retroThemeContrast.md` -> `prdUIDesignSystem.md`
  - Action: Assimilate (accessibility contrast guidance into UI PRD)
  - Rationale: Theme and contrast guidance is a UI concern and should sit under the design system PRD.

- `design/stateHandlerAudit.md` -> `prdStateHandler.md`
  - Action: Assimilate (add diagrams, compliance table, and acceptance criteria)
  - Rationale: State handler audits and compliance belong with the state handler PRD.

Notes:

- For long/deep docs consider adding an Appendix section in the PRD and keeping the original file as a short stub that points to the PRD until the PRD is reviewed.
- I can implement these as non-destructive stubs first (feature branch), then follow up with assimilation and source deletions after review.

## Revised phased approach

**Phase 1 – Confirm inventory & patch references**

- Run `node scripts/generatePrdIndex.js` and `npm run sync:agents` to capture the current asset map before editing.
- Update PRDs with `See also` references pointing at the authoritative Markdown so consumers do not lose context during migration.
- Correct documentation headers/footers to state that PRDs are the source of truth.

**Phase 2 – Migrate duplicate audits into PRDs**

- Fold event naming, state handler, battle markup, Classic Battle testing, and architecture content into their target PRDs.
- Add acceptance criteria, owners, and change control notes while migrating.
- Leave short stub files in `docs/` and `design/` that redirect to the PRD until cleanup.

**Phase 3 – Author or extend PRDs for uncovered surfaces**

- Consolidate Public API/Test API/CLI metadata under a dedicated section or new PRD.
- Expand `prdBattleClassic.md` and `prdTestingStandards.md` with the Classic Battle harness details.
- Decide whether test helper governance warrants a new PRD or can live inside existing ones.
- Update `prdIndex.json` and assign owners as PRDs are added or expanded.

**Phase 4 – Automation & schema support**

- Move machine-readable artifacts (e.g., future `design/dataSchemas/events/*.json`) into the repo and backfill AJV validation tests once the corresponding PRD sections are stable.
- Add a script (e.g., `npm run generate:markup`) only after confirming desired JSON inputs and consumption patterns; wire it into CI alongside existing `validate:data`.

**Phase 5 – Deprecation & governance**

- Remove or archive redundant Markdown once consumers reference PRDs; refresh links across README, docs, and tests.
- Document migration results in `prdChangeLog.md` and/or release notes.
- Update `prdCodeStandards.md` with a PRD update checklist for new documentation work and ensure each PRD lists an explicit owner.

## Risks and mitigations

- **Link rot / consumer drift** – Addressed by Phase 1 cross-links and staggered removals; run `node scripts/validateDocs.mjs` before deleting stubs.
- **Scope creep in “low-risk” work** – Creation of new schemas/scripts moved to Phase 4 when requirements are codified.
- **PRD bloat** – Introduce appendices or reference implementation notes in `design/` when content is too detailed; keep summaries concise.
- **Automation drift** – Re-run `npm run sync:agents` and `npm run rag:validate` after migrations to keep agent tooling aligned.

### Phase 1 — Detailed plan (added by agent)

Status: planning completed. Execution is paused awaiting your approval. No files were moved or deleted.

Planned activities (non-destructive, low-risk):

1. Generate canonical PRD index

- Command: `node scripts/generatePrdIndex.js` then `npm run sync:agents`
- Expected artifacts: machine-readable index (e.g., `design/productRequirementsDocuments/prdIndex.json`) and agent sync report.
- Acceptance: scripts exit 0; index lists PRDs and unmapped docs.
- Fallback: if script fails, produce a minimal map via targeted grep queries.

2. Review index and produce mapping report

- Produce `reports/prd-mapping-report.json` and `.csv` with columns: source path, mapped PRD, status (mapped/unmapped/duplicate), suggested action, owner.

3. Create stub redirect files (non-destructive)

- For each duplicate/mapped doc create a short stub that points to the authoritative PRD and includes last-updated + owner metadata. Prefer committing to a feature branch for review.

4. Add 'Authoritative' header + 'See also' to PRDs

- Add a short header block to PRDs stating authority, canonical path, owner, and links to implementation appendices in `design/`.

5. Run validation and smoke checks

- Commands: `npm run validate:data` (if available), `npx prettier . --check`, `npx eslint .`, `npm run rag:validate` (if present), and a markdown-link-check on changed files.

6. Produce Phase-1 report and open PR

- Commit the index, reports, stub files, and PRD header edits to a feature branch and open a PR with a short migration plan for Phase 2.

Deliverables for Phase 1:

- `design/productRequirementsDocuments/prdIndex.json` (script output)
- `reports/prd-mapping-report.json` and `.csv`
- stub redirect files in `docs/` and `design/`
- updated PRD headers with authority + owner
- Phase-1 PR (branch) with validation checks passing


### Phase 1 — Execution (current state)

Status: Phase 1 tooling and mapping artifacts were produced; assimilation work has started in PRDs (appendices added for several topics). Importantly, the repository still contains most original source files — deletions described in earlier drafts were not committed to `main`. This file has been updated to reflect that reality.

Artifacts present (verified):

- `design/productRequirementsDocuments/prdIndex.json` (generated by `node scripts/generatePrdIndex.js` or equivalent tooling)
- `reports/prd-mapping-report.json` and `reports/prd-mapping-report.csv` (generated by `scripts/generatePrdMappingReport.mjs`)
- `scripts/generatePrdMappingReport.mjs` (helper script)

What changed from earlier drafts:

- Several PRDs already include appended/assimilated content (examples below), but the original source files remain in the repository in most cases. The narrative in previous edits that claimed those source files were deleted has been corrected here.
- The mapping script's filename-normalization heuristic can produce some false negatives (e.g., `docs/vector-search.md` may show as unmapped even when a PRD appendix contains the content). The mapping report is authoritative for automated decisions but should be supplemented with spot checks.

Representative PRDs with assimilation already present (examples):

- `design/productRequirementsDocuments/prdBattleCLI.md` — contains an Appendix merging CLI usage and module notes.
- `design/productRequirementsDocuments/prdBattleMarkup.md` — contains canonical markup and an Appendix referencing the battle markup material.
- `design/productRequirementsDocuments/prdVectorDatabaseRAG.md` — contains a "Vector Search Workflow" appendix.
- `design/productRequirementsDocuments/prdRoundSelection.md` — contains implementation notes for round selection.

Current duplication state:

- For safety, original source files remain in-place on `main`. This means for a short window there will be duplicate content (PRD + original source). To avoid leaving stubs/remnants, the recommended migration flow (below) performs assimilation and removal in the same feature-branch PR so no long-lived stubs are left behind.

Recommended safe migration flow (no stubs left behind):

1. Create a feature branch (e.g., `prd-migration/phase1`).
2. For each mapped source: append the content into the target PRD under an Appendix heading that records the original path (for example: "Appendix: migrated from docs/foo.md").
3. In the same commit, remove the original source file from its location (so the PR shows the assimilation + deletion together).
4. Update the PRD header with an "Authoritative" block (canonical path, owner, last-updated).
5. Run validations (prettier, eslint, npm run validate:data, markdown-link-check) on the branch.
6. Open a single PR containing these changes for review. When merged, the repository will not retain stubs or remnant files for assimilated content.

This approach balances your preference (no stubs/remnants) with safety (a reviewable PR and validation before deletion).

Next recommended actions (short list):

1. Confirm you want the feature-branch, single-PR approach that assimilates content into PRDs and removes original files in the same commits (recommended if you want no stubs).
2. If you prefer a staged preview, approve a single example PR (I will perform one example assimilation+delete for review and run validations).
3. Optionally ask for the mapping script to be extended with a small manual override mapping file (e.g., `reports/manual-prd-mapping.json`) to resolve known false-negatives before migration.

Options for how I can proceed now:

- A) Implement Phase‑1 across the repo on a feature branch (recommended): assimilate mapped sources into PRDs and remove originals in the same commits; run validations and open a PR.
- B) Create a single example PR for your review (safe incremental): apply the assimilation+delete pattern to one source file (suggested: `docs/TestValuePolicy.md` → append to `prdTestingStandards.md`) and run validations.
- C) Improve the mapping script first: add a manual-mapping override or a fuzzy-match pass; regenerate the mapping report; then pick A or B.

If you pick A or B, tell me the branch name you prefer (default: `prd-migration/phase1`). If you pick B, confirm which example source file to migrate first. If you pick C, tell me if you prefer a manual mapping JSON or fuzzy matching logic.

### Recent agent observations (no deletions were performed on `main`)

- I inspected the mapping report and PRDs and verified appendices exist for multiple topics. I did not delete original `docs/` or `design/` files on `main` as part of this update. Any deletions should be performed on a feature branch PR per the flow above to avoid accidental breakage.

Validation checklist (to run on the migration branch before merging):

- npx prettier . --check
- npx eslint .
- npm run validate:data (if present)
- npm run rag:validate (if present)
- markdown link check on changed files

---


Please confirm which option you want (A/B/C) and I will implement it.

### Recent agent action — review of mapped sources (no-op)

- Re-checked mapped source files from `reports/prd-mapping-report.json` to avoid deleting files that were edited manually since my last run.
- I inspected the following mapped sources and confirmed their content is present in their target PRDs; I did not perform deletions because manual edits were made to PRDs or the files since the previous pass:
  - `docs/battle-cli.md` (content present in `prdBattleCLI.md`)
  - `docs/battleCLI.md` (content present in `prdBattleCLI.md`)
  - `docs/round-selection.md` (content present in `prdRoundSelection.md`)
  - `design/battleMarkup.md` (content present in `prdBattleMarkup.md`)
