# Evaluating Unit Test Value

**Audience**: Human Developers, AI Agents  
**Version**: 1.0

This document outlines the automated system for evaluating the quality and value of unit tests in this repository. Its goal is to maintain a high-quality, efficient, and meaningful test suite by programmatically identifying tests that should be kept, refactored, or removed.

---

## 1. Philosophy & Goal

We aim for a test suite that is:

- **Behavior-focused**: Tests should verify the observable behavior of a unit, not its implementation details.
- **High-signal**: Failures should clearly indicate a genuine problem.
- **Low-cost**: Tests should be fast, reliable, and easy to maintain.

This evaluation system automates the process of identifying tests that deviate from these principles, providing a data-driven approach to test maintenance.

---

## 2. The Evaluation Rubric

Each test file is scored on a 0–10 scale across five criteria. The final score determines its fate: **Keep (≥8)**, **Refactor (5–7)**, or **Remove/Merge (≤4)**.

```json
{
  "rubric": {
    "intentClarity": {
      "weight": 2,
      "description": "How clearly the test's purpose is stated. High scores for descriptive titles (e.g., using 'should', 'when', 'given/then') and links to requirements.",
      "heuristics": ["/should|when|then|given|returns|emits/i", "meta.specId", "meta.linkedReq"]
    },
    "behavioralRelevance": {
      "weight": 2,
      "description": "How well the test relates to a required feature or bug fix. High scores for tests linked to a PRD, issue tracker, or bug report.",
      "heuristics": ["meta.linkedReq", "meta.lastBug", "meta.covers"]
    },
    "assertionQuality": {
      "weight": 2,
      "description": "The quality and precision of assertions. High scores for semantic assertions (`.toEqual`, `.toBeCalledWith`). Low scores for snapshot-only tests.",
      "heuristics": ["semanticExpects > 0", "snapshotExpects === 0"]
    },
    "isolationAndRobustness": {
      "weight": 2,
      "description": "How well the test is isolated from external factors and randomness. High scores for using fake timers. Low scores for `setTimeout` or heavy mocking.",
      "heuristics": ["vi.useFakeTimers", "!setTimeout", "count(vi.spyOn) < 4"]
    },
    "costVsCoverage": {
      "weight": 2,
      "description": "The balance between execution cost (speed) and effectiveness (mutation score). High scores for fast tests that kill a high percentage of mutants.",
      "heuristics": ["durationMs < 300", "mutationLift >= 0.3"]
    }
  },
  "segmentation": {
    "KEEP": "score >= 8",
    "REFACTOR": "score >= 5 && score <= 7",
    "REMOVE_MERGE": "score <= 4"
  }
}
```

---

## 3. How It Works: The Automated Workflow

The evaluation is orchestrated by a primary script that leverages data from multiple sources.

**Workflow Steps**:

1. **Run Tests**: The script first ensures a `vitest-report.json` exists, running `npx vitest --run --reporter=json` if needed.
2. **Run Mutation Tests (Optional)**: If a Stryker mutation report (`reports/mutation/mutation.json`) is present, it will be used to assess coverage effectiveness.
3. **Scan & Analyze**: The script iterates through all test files, performing two main analyses:
   - **Header Parsing**: It reads metadata from comments at the top of each test file (e.g., `Spec-ID`, `Linked-Req`).
   - **Assertion Scanning**: It statically counts the number of total, snapshot, and semantic assertions.
4. **Score Calculation**: Using the data from steps 1-3, it applies the rubric heuristics to calculate a score for each test file.
5. **Report Generation**: The final output is a JSON file and a human-readable Markdown summary located in `reports/test-value/`.

This process can be run locally or in a CI environment.

---

## 4. How to Use This System

### Local Evaluation

To run the evaluation on your local machine:

1. **Generate Reports**:

   ```bash
   # Run Vitest to generate the test report
   npm run test

   # (Optional but recommended) Run Stryker for mutation analysis
   npm run mutate
   ```

2. **Run the Evaluator**:

   ```bash
   # This will generate the report in reports/test-value/
   npm run test:value
   ```

### CI Enforcement

The `.github/workflows/test-value.yml` workflow runs this evaluation on pull requests. If the `CI_ENFORCE_LOW_VALUE` environment variable is set to `1`, the CI job will fail if any new or modified test scores 4 or below, preventing low-quality tests from being merged.

---

## 5. For AI Agents: Machine-Readable Instructions

This system is designed to be understood and used by AI agents.

```json
{
  "purpose": "This file describes an automated system for scoring unit tests based on a quality rubric.",
  "commands": {
    "run_evaluation": {
      "description": "Run the test value evaluator script.",
      "command": "npm run test:value"
    },
    "run_evaluation_with_ci_enforcement": {
      "description": "Run the evaluator and fail if any test scores too low.",
      "command": "npm run test:value:ci"
    },
    "run_mutation_testing": {
      "description": "Run StrykerJS to generate a mutation report, which improves scoring accuracy.",
      "command": "npm run mutate"
    }
  },
  "outputs": {
    "json_report": "reports/test-value/test-value.json",
    "markdown_report": "reports/test-value/test-value.md"
  },
  "policy": {
    "file": "docs/TestValuePolicy.md",
    "key_rules": [
      "New tests SHOULD include a metadata header.",
      "Snapshot-only tests are discouraged and will receive a low 'assertionQuality' score.",
      "Tests scoring <= 4 in a PR may fail CI."
    ]
  }
}
```

When asked to improve or write tests, you **MUST** consider this scoring system. Aim to write tests that will score in the "KEEP" category (≥8). Before committing new tests, you SHOULD run the `npm run test:value` command to ensure the new tests meet the quality standard.

---

## 6. Source Files

The implementation of this system is distributed across several files:

- **Orchestrator**: `scripts/test-value-evaluator.js`
- **Utilities**:
  - `scripts/utils/assertionScanner.js`
  - `scripts/utils/headerParser.js`
- **Configuration**:
  - `stryker.conf.js`
  - `package.json` (see `scripts` and `devDependencies`)
- **CI Workflow**: `.github/workflows/test-value.yml`
- **Contributor Policy**: `docs/TestValuePolicy.md`
