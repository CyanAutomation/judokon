---
name: judokon-planning-and-investigation
description: Supports planning, investigation, and analysis tasks by encouraging structured reasoning and use of the JU-DO-KON! RAG vector database.
---

# Skill Instructions

## Inputs / Outputs / Non-goals

- Inputs: user questions, relevant PRDs/docs, RAG queries and results.
- Outputs: investigation summary, sources, unknowns, recommended next steps.
- Non-goals: implementation changes without a follow-up task.

## Trigger conditions

Use this skill when prompts include or imply:

- Investigating bugs or unclear behavior.
- Planning new features before coding.
- Answering architecture/workflow questions.

## Mandatory rules

- Query RAG first for discovery; retry once with a rephrased query if weak.
- Summarize findings with provenance from docs/code.
- Identify unknowns and assumptions explicitly.
- Fallback to targeted file search when RAG is insufficient.

## Validation checklist

- [ ] At least one RAG query executed for the investigation topic.
- [ ] Sources are cited from PRDs/docs/code.
- [ ] Unknowns and next steps are explicit.
- [ ] Fallback search performed when RAG quality is weak.

## Expected output format

- Investigation summary.
- Source list (RAG and/or direct file inspection).
- Recommended next actions and open questions.

## Failure/stop conditions

- Stop after two weak RAG attempts and report fallback findings + remaining gaps.
- Stop when missing context blocks reliable recommendations.
