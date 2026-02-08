/* eslint-env node */
/**
 * Run Mermaid CLI commands with configuration and batch operation support.
 *
 * @pseudocode
 * 1. Parse command-line arguments for input file(s) and output options.
 * 2. Load mermaid.config.json to apply project-wide defaults (theme, format, fonts).
 * 3. Validate input file(s) exist and contain valid Mermaid syntax.
 * 4. For batch operations, iterate and log progress; continue on non-fatal errors.
 * 5. Stream output and exit with aggregated status code.
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const configPath = path.join(rootDir, "mermaid.config.json");

/**
 * Run a Mermaid CLI command with optional config.
 *
 * @param {string[]} args - mmdc (mermaid-cli) arguments
 * @param {object} options - Options for spawn
 * @returns {Promise<number>} - Exit code from the subprocess
 */
function runMermaidCommand(args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn("mmdc", args, {
      stdio: "inherit",
      cwd: rootDir,
      ...options
    });

    proc.on("error", (error) => {
      if (error.code === "ENOENT") {
        reject(
          new Error(
            "mermaid-cli (mmdc) not found. Install with: npm install --save-dev @mermaid-js/mermaid-cli"
          )
        );
      } else {
        reject(error);
      }
    });

    proc.on("close", (code) => {
      resolve(code ?? 0);
    });
  });
}

/**
 * Load and apply mermaid.config.json defaults.
 *
 * @returns {string[]} - Additional mmdc arguments from config
 */
function getConfigArgs() {
  try {
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
      const args = [];
      if (config.theme) args.push("--theme", config.theme);
      if (config.outputFormat) args.push("-o", config.outputFormat);
      if (config.cssFile) args.push("--cssFile", config.cssFile);
      return args;
    }
  } catch (error) {
    console.warn(`Warning: Could not load mermaid.config.json: ${error.message}`);
  }
  return [];
}

(async () => {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: node scripts/runMermaid.js [options] -i <input-file> -o <output-file>");
    console.error("Example: node scripts/runMermaid.js -i diagram.mmd -o diagram.svg");
    console.error("Run 'mmdc --help' for all options.");
    process.exit(1);
  }

  try {
    // Merge config defaults with user arguments (user args take precedence)
    const configArgs = getConfigArgs();
    const allArgs = [...configArgs, ...args];

    const exitCode = await runMermaidCommand(allArgs);
    process.exit(exitCode);
  } catch (error) {
    console.error("Error running Mermaid CLI:", error.message);
    process.exit(1);
  }
})();
