# Classic Battle Long-Run Hang Probe

This playbook documents how to stress-test the Classic Battle flow for the intermittent long-run hang reported in QA Issue #3.

## Prerequisites

- Local Playwright dependencies installed (`npm install`).
- No Playwright server already listening on port `5000`.

## Running the probe

```bash
node scripts/playwright-long-run-probe.mjs
```

- Defaults to `--repeat-each=10`.
- Use `--repeat-each <count>` to increase coverage, e.g. `--repeat-each 25` for heavier stress.

## Artifacts

- Each run writes to `reports/long-run-probe/<timestamp>/`.
- Includes:
  - `results.json` — Playwright JSON reporter output.
  - Standard Playwright traces/videos/screenshots on failure (enabled via `trace: on-first-retry`).

## Investigation workflow

1. **Watch the CLI output** for early failures. The script exits non-zero if any repeat fails.
2. **Inspect `results.json`** for failing iterations; `repeatEachIndex` reveals which loop hung.
3. **Open the trace viewer** (`npx playwright show-trace path/to/trace.zip`) if artifacts were captured.
4. **Capture repro notes** (repeat index, failing assertion, observed UI state) to feed telemetry or bug reports.

## Follow-up actions

- On success: record the timestamped run directory in progress docs to show continued monitoring.
- On failure: attach `results.json`, trace artifacts, and observed symptoms to the open issue; escalate if the hang reproduces consistently.
