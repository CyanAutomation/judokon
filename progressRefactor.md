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
