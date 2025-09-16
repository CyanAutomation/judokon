#!/usr/bin/env node

import fs from "fs";
import path from "path";
// Removed unused import

// Removed unused __dirname assignment

/**
 * Playwright Test Value Evaluator
 *
 * Evaluates Playwright E2E tests based on quality rubric:
 * - Intent Clarity (2 pts)
 * - Behavioral Relevance (2 pts)
 * - Assertion Quality (2 pts)
 * - Isolation & Robustness (2 pts)
 * - Cost vs Coverage (2 pts)
 * Total: 10 points
 */

const RUBRIC = {
  intentClarity: {
    weight: 2,
    maxScore: 2,
    heuristics: [
      { pattern: /given|when|then|should|user|sees|navigates/i, points: 0.5 },
      { pattern: /Spec-ID|Linked-Req/i, points: 0.5 },
      { pattern: /describe.*user|test.*user/i, points: 0.5 },
      { pattern: /given.*when.*then/i, points: 0.5 }
    ]
  },
  behavioralRelevance: {
    weight: 2,
    maxScore: 2,
    heuristics: [
      { pattern: /Linked-Req|Spec-ID/i, points: 1 },
      { pattern: /bug|issue|fix/i, points: 0.5 },
      { pattern: /feature|user.*story/i, points: 0.5 }
    ]
  },
  assertionQuality: {
    weight: 2,
    maxScore: 2,
    heuristics: [
      { pattern: /getByRole|getByTestId|getByText|getByLabel/i, points: 0.5 },
      { pattern: /expect.*toBeVisible|toHaveText|toBeEnabled/i, points: 0.5 },
      { pattern: /page\.screenshot|toMatchSnapshot/i, points: -0.5 },
      { pattern: /page\.locator.*\[|page\.locator.*\./i, points: -0.3 },
      { pattern: /waitForSelector|waitForTimeout/i, points: -0.5 }
    ]
  },
  isolationAndRobustness: {
    weight: 2,
    maxScore: 2,
    heuristics: [
      { pattern: /waitForTimeout|setTimeout/i, points: -1 },
      { pattern: /expect.*toBeVisible|toHaveText/i, points: 0.5 },
      { pattern: /page\.waitForLoadState/i, points: 0.3 },
      { pattern: /beforeEach|afterEach/i, points: 0.2 }
    ]
  },
  costVsCoverage: {
    weight: 2,
    maxScore: 2,
    heuristics: [
      { pattern: /expect\(/g, points: 0.1 }, // Multiple expects = better coverage
      { pattern: /describe|test/i, points: 0.2 },
      { pattern: /page\.evaluate|eval/i, points: -0.3 }
    ]
  }
};

class PlaywrightValueEvaluator {
  constructor() {
    this.reportDir = path.join(process.cwd(), "reports", "pw-test-value");
    this.ensureReportDir();
  }

  ensureReportDir() {
    if (!fs.existsSync(this.reportDir)) {
      fs.mkdirSync(this.reportDir, { recursive: true });
    }
  }

  async evaluate() {
    console.log("🔍 Starting Playwright Test Value Evaluation...\n");

    // Find Playwright report
    const reportPath = this.findPlaywrightReport();
    if (!reportPath) {
      console.error("❌ No Playwright JSON report found. Run tests with --reporter=json first.");
      process.exit(1);
    }

    // Load report
    const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
    console.log(`📊 Loaded report from: ${reportPath}`);

    // Find spec files
    const specFiles = this.findSpecFiles();
    console.log(`📁 Found ${specFiles.length} spec files`);

    // Evaluate each spec
    const results = [];
    for (const specFile of specFiles) {
      const result = await this.evaluateSpec(specFile, report);
      results.push(result);
    }

    // Generate reports
    this.generateJsonReport(results);
    this.generateMarkdownReport(results);

    // Summary
    this.printSummary(results);

    console.log("\n✅ Evaluation complete!");
    console.log(`📄 Reports saved to: ${this.reportDir}`);
  }

  findPlaywrightReport() {
    const possiblePaths = [
      "test-results/results.json",
      "playwright-report/results.json",
      "results.json"
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        return p;
      }
    }
    return null;
  }

  findSpecFiles() {
    const specDir = path.join(process.cwd(), "playwright");
    const files = [];

    function scanDir(dir) {
      if (!fs.existsSync(dir)) return;

      const items = fs.readdirSync(dir);
      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
          scanDir(fullPath);
        } else if (item.endsWith(".spec.js") || item.endsWith(".spec.mjs")) {
          files.push(fullPath);
        }
      }
    }

    scanDir(specDir);
    return files;
  }

  async evaluateSpec(specPath, report) {
    const content = fs.readFileSync(specPath, "utf8");
    const relativePath = path.relative(process.cwd(), specPath);

    // Extract test data from report
    const testData = this.extractTestData(relativePath, report);

    // Score each rubric category
    const scores = {};
    let totalScore = 0;

    for (const [category, config] of Object.entries(RUBRIC)) {
      const score = this.scoreCategory(content, config);
      scores[category] = score;
      totalScore += score;
    }

    // Determine classification
    let classification;
    if (totalScore >= 8) classification = "KEEP";
    else if (totalScore >= 5) classification = "REFACTOR";
    else classification = "REMOVE_MERGE";

    return {
      file: relativePath,
      score: Math.round(totalScore * 10) / 10,
      classification,
      scores,
      metrics: {
        duration: testData.duration || 0,
        passed: testData.passed || 0,
        failed: testData.failed || 0,
        flakeRate: testData.flakeRate || 0
      }
    };
  }

  extractTestData(specPath, report) {
    let totalDuration = 0;
    let passed = 0;
    let failed = 0;
    let totalRuns = 0;

    if (report.suites) {
      for (const suite of report.suites) {
        if (suite.file === specPath || suite.title === specPath) {
          this.extractFromSuite(suite, { totalDuration, passed, failed, totalRuns });
        }
      }
    }

    return {
      duration: totalDuration,
      passed,
      failed,
      flakeRate: totalRuns > 0 ? failed / totalRuns : 0
    };
  }

  extractFromSuite(suite, metrics) {
    if (suite.specs) {
      for (const spec of suite.specs) {
        if (spec.tests) {
          for (const test of spec.tests) {
            if (test.results) {
              for (const result of test.results) {
                metrics.totalRuns++;
                metrics.totalDuration += result.duration || 0;
                if (result.status === "passed") metrics.passed++;
                else if (result.status === "failed") metrics.failed++;
              }
            }
          }
        }
      }
    }

    if (suite.suites) {
      for (const childSuite of suite.suites) {
        this.extractFromSuite(childSuite, metrics);
      }
    }
  }

  scoreCategory(content, config) {
    let score = 0;

    for (const heuristic of config.heuristics) {
      const matches = content.match(heuristic.pattern);
      if (matches) {
        if (heuristic.pattern.flags?.includes("g")) {
          // Count multiple matches
          score += Math.min(matches.length * heuristic.points, config.maxScore);
        } else {
          score += heuristic.points;
        }
      }
    }

    // Clamp to max score
    return Math.max(0, Math.min(config.maxScore, score));
  }

  generateJsonReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSpecs: results.length,
        keepCount: results.filter((r) => r.classification === "KEEP").length,
        refactorCount: results.filter((r) => r.classification === "REFACTOR").length,
        removeCount: results.filter((r) => r.classification === "REMOVE_MERGE").length,
        averageScore: results.reduce((sum, r) => sum + r.score, 0) / results.length
      },
      results: results.sort((a, b) => b.score - a.score)
    };

    const jsonPath = path.join(this.reportDir, "pw-test-value.json");
    fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  }

  generateMarkdownReport(results) {
    const lines = [
      "# Playwright Test Value Report",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      "## Summary",
      "",
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Total Specs | ${results.length} |`,
      `| Keep (≥8) | ${results.filter((r) => r.classification === "KEEP").length} |`,
      `| Refactor (5-7) | ${results.filter((r) => r.classification === "REFACTOR").length} |`,
      `| Remove (≤4) | ${results.filter((r) => r.classification === "REMOVE_MERGE").length} |`,
      `| Average Score | ${(results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1)} |`,
      "",
      "## Detailed Results",
      "",
      "| Rank | File | Score | Class | Duration | Status |",
      "|------|------|-------|-------|----------|--------|"
    ];

    results
      .sort((a, b) => b.score - a.score)
      .forEach((result, index) => {
        const duration = result.metrics.duration
          ? `${Math.round(result.metrics.duration)}ms`
          : "N/A";
        const status = result.metrics.failed > 0 ? "❌" : "✅";
        lines.push(
          `| ${index + 1} | ${result.file} | ${result.score} | ${result.classification} | ${duration} | ${status} |`
        );
      });

    lines.push("", "## Recommendations", "");

    const keepSpecs = results.filter((r) => r.classification === "KEEP");
    const refactorSpecs = results.filter((r) => r.classification === "REFACTOR");
    const removeSpecs = results.filter((r) => r.classification === "REMOVE_MERGE");

    if (keepSpecs.length > 0) {
      lines.push("### ✅ Keep These Specs", "");
      keepSpecs.forEach((spec) => {
        lines.push(`- **${spec.file}** (${spec.score}/10) - High quality, maintain as-is`);
      });
      lines.push("");
    }

    if (refactorSpecs.length > 0) {
      lines.push("### 🔧 Refactor These Specs", "");
      refactorSpecs.forEach((spec) => {
        lines.push(`- **${spec.file}** (${spec.score}/10) - Needs improvement in:`);
        Object.entries(spec.scores).forEach(([category, score]) => {
          if (score < RUBRIC[category].maxScore) {
            lines.push(`  - ${category}: ${score}/${RUBRIC[category].maxScore}`);
          }
        });
      });
      lines.push("");
    }

    if (removeSpecs.length > 0) {
      lines.push("### 🗑️ Remove/Merge These Specs", "");
      removeSpecs.forEach((spec) => {
        lines.push(`- **${spec.file}** (${spec.score}/10) - Low value, consider removal`);
      });
      lines.push("");
    }

    const mdPath = path.join(this.reportDir, "pw-test-value.md");
    fs.writeFileSync(mdPath, lines.join("\n"));
  }

  printSummary(results) {
    console.log("\n📈 Evaluation Summary:");
    console.log(`   Total Specs: ${results.length}`);
    console.log(`   Keep (≥8): ${results.filter((r) => r.classification === "KEEP").length}`);
    console.log(
      `   Refactor (5-7): ${results.filter((r) => r.classification === "REFACTOR").length}`
    );
    console.log(
      `   Remove (≤4): ${results.filter((r) => r.classification === "REMOVE_MERGE").length}`
    );
    console.log(
      `   Average Score: ${(results.reduce((sum, r) => sum + r.score, 0) / results.length).toFixed(1)}/10`
    );

    console.log("\n🏆 Top Performers:");
    results
      .filter((r) => r.classification === "KEEP")
      .slice(0, 3)
      .forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.file} (${result.score}/10)`);
      });

    if (results.some((r) => r.classification === "REMOVE_MERGE")) {
      console.log("\n⚠️  Specs Needing Attention:");
      results
        .filter((r) => r.classification === "REMOVE_MERGE")
        .forEach((result) => {
          console.log(`   • ${result.file} (${result.score}/10)`);
        });
    }
  }
}

// Run the evaluator
const evaluator = new PlaywrightValueEvaluator();
evaluator.evaluate().catch(console.error);
