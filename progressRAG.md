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

Actions Taken

- Added `scripts/prepareLocalModel.mjs`:
  - Supports `--from-dir <path>` to copy required files locally (config.json, tokenizer.json, tokenizer_config.json, onnx/model_quantized.onnx).
  - Attempts hydration via `@xenova/transformers` when no `--from-dir` is provided (will download when network is available), then validates presence.
  - Destination aligns with runtime loader: `src/models/minilm`.
- Added npm script: `rag:prepare:models` → `node scripts/prepareLocalModel.mjs`.
- Improved CLI hint to reference `src/models/minilm`.

Validation (targeted tests)

- tests/scripts/prepareLocalModel.test.js
  - copies required files from --from-dir into src/models/minilm → PASS
  - allows getExtractor to use local model path when present (ensures pipeline called with local path) → PASS

Outcome

- Deterministic local provisioning enabled without requiring network (via --from-dir).
- Path alignment fixed/documented: runtime expects `src/models/minilm` (not project-root models/).
- No public API changes; new script and tests only.

Validation

- Manual smoke (optional): with model present, `RAG_STRICT_OFFLINE=1 npm run rag:query -- "tooltip guidelines"` should not error (neural path). In strict offline without model, CLI now prints clear remediation.

---

## Phase 3 – Optional Lexical Fallback

Actions Taken

- Implemented a flagged fallback in `src/helpers/queryRag.js`:
  - When the extractor fails and `allowLexicalFallback` option is true or `RAG_ALLOW_LEXICAL_FALLBACK=1`, compute lexical similarity using item `sparseVector`.
  - Scoring uses cosine over TF sparse vectors plus small bonuses for tag overlap and exact text containment.
  - Preserves provenance (`contextPath`, `rationale`) and adds `lexicalFallback: true` in diagnostics.
- Added targeted unit test `tests/queryRag/lexicalFallback.test.js` that:
  - Forces extractor failure and mocks `loadEmbeddings` to provide deterministic corpus entries with `sparseVector`.
  - Verifies results are returned in fallback mode and provenance fields exist when requested.

Validation

- tests/queryRag/lexicalFallback.test.js → PASS
- Regression checks (related area) still PASS:
  - tests/queryRag/queryRag.test.js
  - tests/queryRag/strictOffline.test.js

Outcome

- Offline resilience improved without changing defaults. Agents in restricted environments can opt in to lexical fallback to avoid hard failures.
- No unsuppressed console logs in tests; no public API changes (fallback is opt-in via flag/env).

---

## Phase 4 – Validation/CI Hardening

Actions Taken

- Added `scripts/checkRagPreflight.mjs` with two checks:
  - Strict offline model check: when `RAG_STRICT_OFFLINE=1`, ensure `src/models/minilm` has all required files (non-empty).
  - Offline artifacts consistency: verify `src/data/offline_rag_metadata.json` and `src/data/offline_rag_vectors.bin` lengths align (vectorLength × count).
- Wired preflight into `npm run rag:validate` ahead of existing checks.
- Added focused tests: `tests/scripts/checkRagPreflight.test.js` to validate both success and failure cases via fs mocks.

Validation (targeted tests)

- tests/scripts/checkRagPreflight.test.js → PASS

Outcome

- Fails early when strict-offline mode is requested but the local model is missing, with actionable messages.
- Detects corrupted/mismatched offline artifacts deterministically.
- Keeps existing validation flow intact.

---

## Phase 5 – Docs and Agent Guidance (Planned)

Actions Taken

- Updated `README.md` with an "Run queries offline" section:
  - Added `npm run rag:prepare:models` and `--from-dir` usage, clarified destination at `src/models/minilm`.
  - Documented `RAG_STRICT_OFFLINE=1` for enforcing no network usage and `RAG_ALLOW_LEXICAL_FALLBACK=1` for degraded mode.
  - Added tips on behavior and CLI hints when strict offline is enabled.
- Updated `AGENTS.md` with an "Offline Usage (Agents)" subsection covering strict offline, lexical fallback flags, and provenance requirements.

Validation (targeted tests)

- Re-ran RAG-related unit tests to ensure no regressions:
  - tests/queryRag/queryRag.test.js → PASS
  - tests/queryRag/strictOffline.test.js → PASS
  - tests/queryRag/lexicalFallback.test.js → PASS

Outcome

- Clear developer + agent guidance for offline operation and flags.
- Documentation now matches the implemented behavior and paths.

Addendum: CONTRIBUTING updates

- CONTRIBUTING.md now references `npm run rag:validate` (preflight + evaluator + JSON + hot‑path checks).
- Added a RAG contribution checklist covering model hydration (`rag:prepare:models`), strict offline in CI (`RAG_STRICT_OFFLINE=1`), and optional lexical fallback flag.
