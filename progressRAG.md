# RAG System Investigation, Root Cause, and Remediation Plan

## 1) Summary

Issue: Some agents (e.g., OpenAI Codex without internet) fail to use RAG with error: "queryRag invocation failed to load the model due to network restrictions; proceeded with repo inspection for guidelines".

Root cause: Query-time embedding relies on a feature-extraction model. When `models/minilm` is absent, the loader falls back to downloading `Xenova/all-MiniLM-L6-v2`. In a network-restricted environment this download fails, causing `queryRag` to error even though offline vector artifacts exist.

Scope: Affects all offline contexts attempting to run `queryRag` without a locally provisioned model.

## 2) Evidence

- Query path: `src/helpers/queryRag.js` → `getExtractor()` → encodes the user query before scoring.
- Model loader: `src/helpers/api/vectorSearchPage.js#getExtractor`
  - Node: prefers local `models/minilm`; if missing, warns and falls back to remote `Xenova/all-MiniLM-L6-v2` (requires network on first use).
  - Browser: uses CDN `@xenova/transformers` (requires network).
- Offline artifacts: `src/data/offline_rag_vectors.bin` and `src/data/offline_rag_metadata.json` exist and are correctly loaded by `src/helpers/vectorSearch/loader.js`, but these contain only corpus vectors/metadata, not the query encoder model.
- Workflow: `.github/workflows/updateEmbeddings.yml` builds/commits embeddings and offline files, but not a local model bundle.
- Local repo: No `models/minilm` directory present by default.

Conclusion: Without a local model, `getExtractor()` attempts a remote download, which fails offline and blocks `queryRag`.

## 3) Plan of Record (Phased)

- Phase 1: Strict Offline Mode (fast-fail, actionable)
- Phase 2: Deterministic Model Provisioning (script + workflow option)
- Phase 3: Optional Lexical Fallback (flagged, non-silent)
- Phase 4: Validation/CI Hardening (preflight + smoke)
- Phase 5: Docs and Agent Guidance

Details for each phase were prepared; see below for execution notes and outcomes as phases complete.

---

## Phase 1 – Strict Offline Mode

Actions Taken

- Updated `src/helpers/api/vectorSearchPage.js#getExtractor`:
  - If `RAG_STRICT_OFFLINE=1` and the local model (`models/minilm`) is missing, throw a clear error instead of attempting a remote download.
  - In browser path, when strict offline is set, throw immediately (CDN path disabled) with guidance to use Node + local model.
- Enhanced CLI messaging in `scripts/queryRagCli.mjs` to suggest a remediation command when a strict-offline error occurs: `npm run rag:prepare:models` (to be implemented in Phase 2).
- Added unit test `tests/queryRag/strictOffline.test.js` that mocks modules to simulate missing local model and verifies the fast‑fail behavior without invoking transformers.

Validation

- Ran targeted tests (only impacted area):
  - tests/queryRag/strictOffline.test.js → PASS
  - tests/queryRag/queryRag.test.js → PASS (regression check)

Outcome

- In network-restricted environments, `queryRag` no longer attempts remote model downloads when `RAG_STRICT_OFFLINE=1`; it fails fast with an actionable message.
- No public API change; behavior gated behind environment variable.

Next

- Proceed to Phase 2 to add a deterministic script to hydrate `models/minilm` locally (and optionally wire into CI as an artifact), enabling fully offline use without errors.

---

## Phase 2 – Deterministic Model Provisioning (Planned)

Planned actions

- Add `scripts/prepareLocalModel.mjs` that materializes a quantized MiniLM under `models/minilm` using `@xenova/transformers` cache.
- NPM script: `rag:prepare:models` → `node scripts/prepareLocalModel.mjs`.
- Workflow option A: commit `models/minilm/**` in embedding PRs (consider LFS and repo size impact).
- Workflow option B: publish an artifact `models_minilm.tgz` and hydrate via the script.

Validation

- Add a preflight check to ensure required model files are present and non-empty.
- Run a small smoke test: `RAG_STRICT_OFFLINE=1 npm run rag:query -- "tooltip guidelines"` returns results.

---

## Phase 3 – Optional Lexical Fallback (Planned)

Planned actions

- Add a flagged fallback: `{ allowLexicalFallback: true }` and/or `RAG_ALLOW_LEXICAL_FALLBACK=1`.
- Use `offline_rag_metadata.json` sparse vectors to compute a lexical score when the model is unavailable.
- Preserve provenance; clearly label degraded path via diagnostics.

Validation

- Unit tests for normal path (neural) and fallback path (lexical), both with muted console.

---

## Phase 4 – Validation/CI Hardening (Planned)

Planned actions

- Extend `rag:validate` with:
  - Strict-offline preflight for `models/minilm` presence.
  - Offline artifact consistency checks.
- Add a CI smoke test that runs a strict-offline query to ensure non-crashing behavior.

---

## Phase 5 – Docs and Agent Guidance (Planned)

Planned actions

- Update `AGENTS.md` and `README.md` with offline quickstart, environment flags, and provenance examples.

