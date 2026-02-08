/* eslint-env node */
/**
 * Run Playwright CLI commands with configuration and logging support.
 *
 * @pseudocode
 * 1. Parse command-line arguments to extract Playwright subcommand (codegen, show, trace, etc).
 * 2. Set environment defaults for URL, browser, and output paths.
 * 3. Construct the Playwright CLI invocation with merged config.
 * 4. Stream output to console for interactive feedback (codegen, show).
 * 5. Exit with the subprocess exit code.
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

/**
 * Run a Playwright CLI command with optional config and environment setup.
 *
 * @param {string[]} args - Playwright CLI arguments (e.g., ["codegen", "--url", "http://localhost:5000"])
 * @param {object} options - Options for spawn (env, stdio, cwd, etc)
 * @returns {Promise<number>} - Exit code from the subprocess
 */
function runPlaywrightCommand(args, options = {}) {
  return new Promise((resolve, reject) => {
    const defaultEnv = {
      ...process.env,
      PLAYWRIGHT_HEADLESS: process.env.PLAYWRIGHT_HEADLESS ?? "false"
    };

    const proc = spawn("npx", ["playwright", ...args], {
      stdio: "inherit", // Share stdin/stdout/stderr for interactive commands
      cwd: rootDir,
      env: { ...defaultEnv, ...options.env },
      ...options
    });

    proc.on("error", reject);
    proc.on("close", (code) => {
      if (code !== 0 && code !== null) {
        resolve(code); // Non-zero exit, but don't reject (consistent with CLI behavior)
      } else {
        resolve(code ?? 0);
      }
    });
  });
}

(async () => {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.error("Usage: node scripts/runPlaywright.js <command> [options]");
    console.error("Available commands: codegen, show, trace, install");
    process.exit(1);
  }

  const command = args[0];

  // Set up defaults based on command
  let env = {};
  if (command === "codegen" && !args.includes("--url")) {
    // Default to localhost for interactive codegen
    args.push("--url", "http://localhost:5000");
  }

  try {
    const exitCode = await runPlaywrightCommand(args, { env });
    process.exit(exitCode);
  } catch (error) {
    console.error("Error running Playwright CLI:", error.message);
    process.exit(1);
  }
})();
