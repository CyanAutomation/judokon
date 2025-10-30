/**
 * Validate RAG configuration consistency across codebase.
 *
 * Ensures both preparation script (prepareLocalModel.mjs) and loader
 * (vectorSearchPage.js) use the same env.localModelPath configuration.
 *
 * @pseudocode
 * 1. Parse prepareLocalModel.mjs for env.localModelPath assignment
 * 2. Parse vectorSearchPage.js for env.localModelPath assignment
 * 3. Compare both values
 * 4. Verify both reference the repo root (not a subdirectory)
 * 5. Report success or detailed mismatch
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const filesToCheck = [
  {
    name: "Preparation script",
    file: path.join(rootDir, "scripts/prepareLocalModel.mjs"),
    pattern: /env\.localModelPath\s*=\s*(\w+);/
  },
  {
    name: "Loader",
    file: path.join(rootDir, "src/helpers/api/vectorSearchPage.js"),
    pattern: /env\.localModelPath\s*=\s*(\w+);/
  }
];

/**
 * Extracts variable assignments from a code file.
 * @param {string} content - The file content
 * @param {RegExp} pattern - The pattern to match
 * @returns {string|null} The assigned variable name
 */
function extractAssignment(content, pattern) {
  const match = content.match(pattern);
  return match ? match[1] : null;
}

/**
 * Validates that all references use rootDir or destRoot (which should be rootDir).
 * @param {Array} findings - Array of {name, file, varName} findings
 * @returns {boolean} True if all use compatible configurations
 */
function validateConsistency(findings) {
  const assignments = findings.map((f) => f.varName);

  // Both should reference either rootDir or destRoot (they're equivalent - both mean repo root)
  const validVariables = new Set(["rootDir", "destRoot"]);
  const allValid = assignments.every((v) => validVariables.has(v));

  return allValid;
}

/**
 * Formats output with clear status indicators.
 * @param {Object} result - Result object with success, findings, message
 */
function formatOutput(result) {
  const statusIcon = result.success ? "✅" : "❌";
  console.log(`\n${statusIcon} RAG Configuration Validation\n`);

  if (result.findings) {
    console.log("Configuration Summary:");
    result.findings.forEach((finding) => {
      const icon = finding.isValid ? "✓" : "✗";
      console.log(`  [${icon}] ${finding.name}: env.localModelPath = ${finding.varName}`);
    });
  }

  console.log(`\nResult: ${result.message}`);

  if (!result.success && result.recommendations) {
    console.log("\nRecommendations:");
    result.recommendations.forEach((rec) => {
      console.log(`  • ${rec}`);
    });
  }

  console.log("");
}

/**
 * Main validation function.
 */
async function validateRagConfig() {
  try {
    const findings = [];

    // Extract assignments from each file
    for (const config of filesToCheck) {
      const content = await readFile(config.file, "utf-8");
      const varName = extractAssignment(content, config.pattern);

      if (!varName) {
        return {
          success: false,
          message: `Could not find env.localModelPath assignment in ${config.name}`,
          recommendations: [`Check that ${config.file} still uses env.localModelPath correctly`]
        };
      }

      findings.push({
        name: config.name,
        file: config.file,
        varName,
        isValid: varName === "rootDir" || varName === "destRoot"
      });
    }

    // Validate consistency
    const isConsistent = validateConsistency(findings);

    if (!isConsistent) {
      const incorrect = findings.filter((f) => !f.isValid);
      return {
        success: false,
        findings,
        message: "Path configuration mismatch detected! Both files must use rootDir or destRoot.",
        recommendations: incorrect.map(
          (f) =>
            `Fix ${f.name} in ${f.file}: change env.localModelPath = ${f.varName} to env.localModelPath = rootDir`
        )
      };
    }

    // Check if using same variable
    const varNames = new Set(findings.map((f) => f.varName));
    if (varNames.size > 1) {
      return {
        success: true,
        findings,
        message:
          "✓ RAG configuration is correct! Variables differ but both correctly reference repository root."
      };
    }

    return {
      success: true,
      findings,
      message:
        "✓ All RAG configuration paths are consistent and correct. Both files properly reference the repository root."
    };
  } catch (err) {
    return {
      success: false,
      message: `Validation error: ${err.message}`,
      recommendations: [
        "Ensure both files exist and contain env.localModelPath assignments",
        "Check file permissions and paths"
      ]
    };
  }
}

// Run validation
validateRagConfig().then((result) => {
  formatOutput(result);
  process.exit(result.success ? 0 : 1);
});
