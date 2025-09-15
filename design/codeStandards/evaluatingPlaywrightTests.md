# Evaluating Playwright Test Value

**Audience**: Human Developers, AI Agents  
**Version**: 1.0

This document outlines the automated system for evaluating the quality and value of Playwright end-to-end (E2E) tests. It mirrors the unit test evaluation system, with a rubric adapted for the unique challenges of E2E testing, such as flakiness, locator strategy, and cost.

---

## 1. Philosophy & Goal

Our E2E tests should simulate real user flows and fail only when a genuine regression in user-facing behavior occurs. We aim for a test suite that is:

- **User-centric**: Models a realistic user journey.
- **Robust & Reliable**: Produces consistent results, free from flakiness.
- **Efficient**: Runs as quickly and reliably as possible.

This evaluation system helps enforce these principles by flagging tests that are brittle, slow, or poorly constructed.

---

## 2. The E2E Evaluation Rubric

Each Playwright spec file is scored on a 0–10 scale. The score determines its classification: **Keep (≥8)**, **Refactor (5–7)**, or **Remove/Merge (≤4)**.

```json
{
  "rubric": {
    "intentClarity": {
      "weight": 2,
      "description": "How clearly the test's user flow is described. High scores for descriptive titles (e.g., using 'given/when/then', 'user navigates') and links to requirements.",
      "heuristics": [
        "/given|when|then|should|user|sees|navigates/i",
        "meta.specId",
        "meta.linkedReq"
      ]
    },
    "behavioralRelevance": {
      "weight": 2,
      "description": "How well the test maps to a critical user path or bug fix. High scores for tests linked to a PRD, issue, or annotated as covering a specific feature.",
      "heuristics": ["meta.linkedReq", "meta.lastBug", "annotations.type.includes('issue')"]
    },
    "assertionQuality": {
      "weight": 2,
      "description": "The quality of locators and assertions. High scores for using user-facing locators (`getByRole`, `getByTestId`) and semantic assertions. Low scores for screenshot-only tests or heavy reliance on CSS/XPath.",
      "heuristics": [
        "semanticExpects > 0",
        "roleOrTestIdLocatorsRatio >= 0.5",
        "screenshotExpects === 0"
      ]
    },
    "isolationAndRobustness": {
      "weight": 2,
      "description": "How reliable and deterministic the test is. High scores for using Playwright's auto-waiting `expect` and avoiding hard-coded waits. Low scores for `waitForTimeout` or a non-zero flake rate.",
      "heuristics": ["usesExpectPolling", "!usesTimeout", "!badWaits", "flakeRate === 0"]
    },
    "costVsCoverageProxy": {
      "weight": 2,
      "description": "The balance between execution cost (speed) and the density of verifications. High scores for fast tests with multiple semantic assertions.",
      "heuristics": ["durationMs < 5000", "semanticExpects >= 2"]
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

The workflow is orchestrated by the `scripts/pw-value-evaluator.js` script.

**Workflow Steps**:

1. **Run Tests & Detect Flakes**: The script consumes a `pw-report.json` file. To gather robust data, it's recommended to generate this report by running each test multiple times (e.g., `--repeat-each=3`). This helps calculate a `flakeRate`.
2. **Scan & Analyze**: The script iterates through all spec files and performs two analyses:
    - **Header Parsing**: It reads metadata from comments at the top of each test file (e.g., `Spec-ID`, `Linked-Req`).
    - **Playwright Assertion Scanning**: It statically analyzes the source code to identify locator strategies (role vs. CSS), assertion types (semantic vs. screenshot), and the use of problematic waits (`waitForTimeout`).
3. **Score Calculation**: It applies the E2E rubric heuristics to the aggregated data to score each spec file.
4. **Report Generation**: It outputs a `pw-test-value.json` file and a `pw-test-value.md` summary to the `reports/pw-test-value/` directory.

---

## 4. How to Use This System

### Local Evaluation

1. **Run the Flake Scan**:
    This is the recommended way to generate the data needed for a full evaluation. It runs each test 3 times to check for instability.

    ```bash
    npm run e2e:flake-scan
    ```

2. **Run the Evaluator**:
    If you've already generated a report, or want to run against a single run, use this command.

    ```bash
    npm run e2e:value
    ```

### CI Enforcement

The `.github/workflows/pw-test-value.yml` workflow runs this evaluation on pull requests. If a test scores 4 or below, it may fail the build, preventing brittle or low-value E2E tests from being merged.

---

## 5. For AI Agents: Machine-Readable Instructions

```json
{
  "purpose": "This file describes an automated system for scoring Playwright E2E tests based on a quality rubric.",
  "commands": {
    "run_flake_scan_and_evaluate": {
      "description": "Run the full Playwright evaluation, including a 3-run flake scan, and generate the report.",
      "command": "npm run e2e:flake-scan"
    },
    "run_evaluation_only": {
      "description": "Run the evaluator against an existing Playwright JSON report.",
      "command": "npm run e2e:value"
    }
  },
  "outputs": {
    "json_report": "reports/pw-test-value/pw-test-value.json",
    "markdown_report": "reports/pw-test-value/pw-test-value.md"
  },
  "policy": {
    "file": "docs/TestValuePolicy.md",
    "section_header": "E2E (Playwright) Specifics",
    "key_rules": [
      "Prefer user-facing locators: `getByRole`, `getByText`, `getByTestId`.",
      "Avoid `page.waitForTimeout()` and `page.waitForSelector()`. Use auto-retrying `expect()` polls instead.",
      "A non-zero flake rate is a critical issue that must be fixed.",
      "Tests scoring <= 4 in a PR may fail CI."
    ]
  }
}
```

When asked to write E2E tests, you **MUST** aim for a score in the "KEEP" category (≥8). Before committing, you **SHOULD** run the `npm run e2e:flake-scan` command to ensure the new tests are robust and meet the quality standard.

---

## 6. Source Files

- **Orchestrator**: `scripts/pw-value-evaluator.js`
- **Utilities**: `scripts/utils/pwAssertionScanner.js`
- **Configuration**:
  - `package.json` (see `scripts` starting with `e2e:`)
  - `playwright.config.js`
- **CI Workflow**: `.github/workflows/pw-test-value.yml`
- **Contributor Policy**: `docs/TestValuePolicy.md`
