---
name: judokon-playwright-cli
description: Records, traces, and validates UI design changes using the Playwright CLI for UI inspection and design verification.
---

# Skill Instructions

## Inputs / Outputs / Non-goals

- Inputs: UI component specifications, user flow descriptions, design requirements, locator strategies.
- Outputs: Playwright recordings (video/trace files), design validation artifacts, inspector output, accessibility findings.
- Non-goals: Running test suites (use `judokon-test-author` skill for that); general test framework usage.

## Trigger conditions

Use this skill when prompts include or imply:

- Recording or validating UI flows and user interactions.
- Generating visual baselines or design documentation.
- Inspecting element selectors and validating DOM structure.
- Tracing performance or debugging layout issues.
- Verifying touch targets, contrast, and accessibility compliance.

## Mandatory rules

- Use semantic selectors: `data-testid`, `role=`, accessible names (avoid implementation-detail CSS selectors).
- Record interactions naturally: `click()`, `fill()`, `press()` APIs; never synthetic events.
- Always capture contrast and focus indicators for accessibility validation.
- Generate traces with full network/timeline data for debugging context.
- Document assumptions about viewport, device, or browser state.

## Validation checklist

- [ ] Recordings capture natural user interactions (no synthetic events).
- [ ] Selectors use semantic attributes or role-based queries.
- [ ] Traces include network and timeline events for performance context.
- [ ] Output artifacts (videos, traces, HAR files) are organized in a clear output directory.
- [ ] Accessibility baseline captured (contrast, focus, touch targets validated).

## Expected output format

- Trace files (`.trace`) stored in `artifacts/` directory with descriptive names.
- Video recordings (`.webm`) with flow labels.
- Inspector command output or selector validation report.
- Brief markdown summary: flow recorded, browsers tested, accessibility checks noted.

## Failure/stop conditions

- Stop if UI elements cannot be located via semantic selectors (indicate missing `data-testid` attributes).
- Stop if viewport or device state is ambiguous or results in flaky recordings.
- Stop if contrast/accessibility baseline cannot be captured (note required style fixes).

## CLI Usage

### Common Commands

```bash
# Record a new user flow (interactive browser session)
npm run test:ui:codegen

# Inspect and replay a saved trace file
npm run test:ui:trace <path-to-trace-file>

# Generate HAR file for network inspection
npx playwright show --har <trace-file>

# Install browser dependencies (run once per environment)
npx playwright install
```

### Wrapper Script Integration

Use `scripts/runPlaywright.js` for consistent CLI invocation with config and logging:

```bash
node scripts/runPlaywright.js codegen --url http://localhost:5000
node scripts/runPlaywright.js show <trace-file>
```

### Output Organization

Save all artifacts in a timestamped directory:

```
artifacts/
  ui-flows-2026-02-08/
    battle-round-selection.trace
    stat-hotkey-validation.video.webm
    opponent-message-flow.har
    README.md (flow summary)
```
