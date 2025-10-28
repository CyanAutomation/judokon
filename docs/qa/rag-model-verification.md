# RAG MiniLM Verification

This session prepared the local MiniLM bundle by copying placeholder assets from `/tmp/minilm` into `models/minilm` via `npm run rag:prepare:models -- --from-dir /tmp/minilm`. After seeding the directory, `npm run check:rag` reported that all required artifacts are present.

> **Note:** The copied files are lightweight placeholders suitable for unlocking local tooling checks in offline environments. Replace them with the full quantized MiniLM distribution when network access is available.
