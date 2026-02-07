/**
 * RAG system health check utility.
 *
 * Provides comprehensive diagnostics for the RAG system including:
 * - Local model availability and size
 * - Configuration validation
 * - Model source detection (local vs CDN)
 * - Network connectivity
 * - Offline mode readiness
 *
 * @pseudocode
 * 1. Check if local model files exist and validate sizes
 * 2. Run configuration validation
 * 3. Test RAG query with diagnostics
 * 4. Report model source (local or CDN)
 * 5. Provide actionable recommendations
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stat } from "node:fs/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const HEALTH_CONFIG = {
  minilmDir: path.join(rootDir, "models/minilm"),
  files: [
    { name: "config.json", minBytes: 400 },
    { name: "tokenizer.json", minBytes: 1000 },
    { name: "tokenizer_config.json", minBytes: 300 },
    { name: "onnx/model_quantized.onnx", minBytes: 300 * 1024 }
  ]
};

/**
 * Checks if local MiniLM model is available and valid.
 * @returns {Promise<{available: boolean, files: Array, totalSize: number}>}
 */
async function checkLocalModel() {
  const files = [];
  let totalSize = 0;

  for (const file of HEALTH_CONFIG.files) {
    const filePath = path.join(HEALTH_CONFIG.minilmDir, file.name);
    try {
      const stats = await stat(filePath);
      const isValid = stats.size >= file.minBytes;
      files.push({
        name: file.name,
        path: filePath,
        size: stats.size,
        minBytes: file.minBytes,
        valid: isValid
      });
      if (isValid) totalSize += stats.size;
    } catch (err) {
      files.push({
        name: file.name,
        path: filePath,
        size: 0,
        minBytes: file.minBytes,
        valid: false,
        error: err.message
      });
    }
  }

  const available = files.every((f) => f.valid);
  return { available, files, totalSize };
}

/**
 * Runs config validation using the validation script.
 * @returns {Promise<{valid: boolean, message: string}>}
 */
async function checkConfiguration() {
  try {
    const { spawn } = await import("child_process");
    return new Promise((resolve) => {
      const proc = spawn("node", ["scripts/validateRagConfig.mjs"], { cwd: rootDir });
      let stdout = "";
      let stderr = "";

      proc.stdout.on("data", (data) => {
        stdout += data.toString();
      });
      proc.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      proc.on("close", (code) => {
        resolve({
          valid: code === 0,
          message: stdout || stderr,
          exitCode: code
        });
      });
    });
  } catch (err) {
    return { valid: false, message: err.message, exitCode: 1 };
  }
}

/**
 * Tests a simple RAG query with diagnostics.
 * @returns {Promise<{working: boolean, modelSource: string, timing: number}>}
 */
async function testRagQuery() {
  return {
    working: false,
    results: 0,
    modelSource: "removed",
    timing: 0,
    error: "RAG query runtime removed"
  };
}

/**
 * Formats the health check report for display.
 * @param {Object} report - The complete health check report
 */
function formatReport(report) {
  const { localModel, config, query } = report;

  console.log("\n═══════════════════════════════════════════════════════════════");
  console.log("                    RAG SYSTEM HEALTH CHECK");
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Local Model Status
  console.log("📦 LOCAL MODEL STATUS:");
  if (localModel.available) {
    const sizeMb = (localModel.totalSize / 1024 / 1024).toFixed(1);
    console.log(`  ✅ Local MiniLM model found (${sizeMb} MB)`);
    localModel.files.forEach((f) => {
      const status = f.valid ? "✓" : "✗";
      console.log(`    [${status}] ${f.name}: ${f.size} bytes`);
    });
  } else {
    console.log("  ❌ Local MiniLM model NOT available");
    localModel.files
      .filter((f) => !f.valid)
      .forEach((f) => {
        console.log(`    - Missing or too small: ${f.name}`);
      });
  }

  // Configuration Status
  console.log("\n⚙️  CONFIGURATION:");
  if (config.valid) {
    console.log("  ✅ Configuration is valid");
  } else {
    console.log("  ❌ Configuration issues detected");
    if (config.message) {
      config.message
        .split("\n")
        .filter((line) => line.trim())
        .forEach((line) => {
          console.log(`    ${line}`);
        });
    }
  }

  // RAG Query Test
  console.log("\n🔍 RAG FUNCTIONALITY:");
  if (query.working) {
    console.log(`  ✅ RAG query test successful (${query.results} results in ${query.timing}ms)`);
  } else {
    console.log("  ❌ RAG query test failed");
    if (query.error) {
      console.log(`    Error: ${query.error}`);
    }
  }

  // Offline Mode Status
  console.log("\n🔌 OFFLINE MODE:");
  console.log("  ℹ️  RAG env flag checks removed");

  // Overall Status
  console.log("\n═══════════════════════════════════════════════════════════════");
  const allGood = localModel.available && config.valid && query.working;
  if (allGood) {
    console.log("🟢 RAG SYSTEM STATUS: HEALTHY");
  } else {
    console.log("🔴 RAG SYSTEM STATUS: ISSUES DETECTED");
  }
  console.log("═══════════════════════════════════════════════════════════════\n");

  // Recommendations
  if (!allGood) {
    console.log("💡 RECOMMENDATIONS:");
    if (!localModel.available) {
      console.log("  1. Prepare local model: npm run rag:prepare:models");
      console.log("  2. Or use --from-dir flag: npm run rag:prepare:models -- --from-dir /path");
    }
    if (!config.valid) {
      console.log("  1. Check configuration: npm run validate:rag:config");
      console.log(
        "  2. Review scripts/prepareLocalModel.mjs and src/helpers/api/vectorSearchPage.js"
      );
    }
    if (!query.working) {
      console.log("  1. Check network connectivity");
      console.log("  2. Verify model files exist: npm run check:rag");
      console.log("  3. Review console logs for detailed errors");
    }
    console.log("");
  }
}

/**
 * Main health check function.
 */
async function runHealthCheck() {
  try {
    const [localModel, config, query] = await Promise.all([
      checkLocalModel(),
      checkConfiguration(),
      testRagQuery()
    ]);

    const report = {
      localModel,
      config,
      query,
      offlineMode: { enabled: false }
    };

    formatReport(report);

    // Exit with success only if all systems are go
    const allGood = localModel.available && config.valid && query.working;
    process.exit(allGood ? 0 : 1);
  } catch (err) {
    console.error("Health check error:", err);
    process.exit(1);
  }
}

// Run health check
runHealthCheck();
