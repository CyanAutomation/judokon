# Skills Catalog (Single Discovery Entrypoint)

This README is the **single discovery entrypoint** for all repository skills, including future additions.

## Skill Index

| Skill | Purpose (one line) | Trigger phrases (“use when…”) | Typical input artifacts | Typical output artifacts | Composition role | Ownership | Status |
|---|---|---|---|---|---|---|---|
| Planning | Convert ambiguous requests into a scoped, executable plan and task contract. | “use when requirements are unclear”, “use when work needs sequencing”, “use when defining acceptance criteria” | User request, affected file list, constraints, existing docs | Task plan, scoped checklist, risk notes, success criteria | First step in most flows | AI Agents | Active || Playwright CLI | Records, traces, and validates UI design changes with the Playwright inspector and CLI tools. | "use when recording UI flows", "use when generating design baselines", "use when validating selectors" | UI specifications, user flow descriptions, design requirements | Trace files, video recordings, selector validation report, accessibility findings | Design validation + artifact generation | Engineering + QA | Active || PRD-to-Code | Translate product requirements into concrete implementation tasks and code changes. | “use when implementing from PRD”, “use when converting specs to tickets/code”, “use when mapping requirements to modules” | PRD docs, architecture notes, current source files | Implementation diff, traceability notes (requirement → file), updated docs | Bridges planning to implementation | AI Agents + Product/Engineering | Active |
| Implementation | Apply production-ready code changes following repository conventions and safeguards. | “use when writing/refactoring code”, “use when fixing bugs”, “use when adding features behind existing APIs” | Scoped plan, target source files, existing tests | Updated source code, inline docs/JSDoc, migration notes (if needed) | Core build phase | Engineering | Active |
| Test Author | Create or update targeted tests that validate happy-path and edge-case behavior. | “use when adding/changing logic”, “use when regression risk exists”, “use when coverage gaps are identified” | Changed code, test harness utilities, bug report/repro | New/updated unit/integration/e2e tests, deterministic fixtures, validation notes | Quality gate before release QA | QA + Engineering | Active |
| Release QA | Verify release readiness through focused validation, smoke checks, and risk triage. | “use when preparing to merge/release”, “use when validating critical flows”, “use when regression confidence is needed” | Built branch, test results, changelog/diff summary | QA summary, pass/fail matrix, known-risk register, go/no-go recommendation | Pre-PR/pre-merge validation | QA | Active |
| PR Delivery | Package changes into a clear PR with rationale, verification evidence, and follow-ups. | “use when opening PR”, “use when summarizing verification”, “use when documenting rollout/risks” | Commit history, validation outputs, issue links, screenshots/artifacts | PR title/body, checklist completion, reviewer guidance, release notes snippet | Final step | Engineering | Active |
| Skill Maintenance | Keep this catalog and skill docs current, discoverable, and consistently structured. | “use when adding a new skill”, “use when skill docs drift”, “use when ownership/status changes” | Existing skill files, this README, process feedback | Updated skill metadata, revised trigger phrases, changelog entry | Continuous improvement lane | Repo Maintainers | Needs refresh |
| Experimental Skills Sandbox | Trial new skill workflows safely before promotion to active catalog entries. | “use when piloting a workflow”, “use when uncertain about stability”, “use when evaluating new automation steps” | Draft skill docs, trial tasks, evaluation rubric | Experiment report, promote/deprecate decision, updated status | Optional side lane | Repo Maintainers + Volunteers | Experimental |

## Composition Flows

### Default Delivery Flow
Planning → PRD-to-Code → Implementation → Test Author → Release QA → PR Delivery

### Fast Bugfix Flow
Planning → Implementation → Test Author → Release QA → PR Delivery

### Docs/Process-Only Flow
Planning → PR Delivery

### Experimental Flow
Planning → Experimental Skills Sandbox → Implementation/Test Author (as needed) → Release QA → PR Delivery

## Ownership & Status Definitions

- **Active**: Recommended for normal use; maintained and expected to work in current workflows.
- **Needs refresh**: Usable but should be updated for current standards, tooling, or docs.
- **Experimental**: Trial phase; not required for standard delivery paths.

## Add-a-Skill Checklist (Keep Discovery Centralized)

When adding a new skill, update this file first (or in the same PR) so discovery remains centralized:

1. Add one-line purpose.
2. Add “use when…” trigger phrases.
3. Add typical input/output artifacts.
4. Place the skill in at least one composition flow.
5. Set ownership and status metadata.
6. Link to detailed skill docs (if created).

