/* eslint-env node */
/**
 * Run Pa11y accessibility tests with a temporary server.
 *
 * @pseudocode
 * 1. Spawn the static server on port 5000.
 * 2. Wait until the server logs that it is running.
 * 3. Execute the pa11y CLI with the existing config.
 * 4. Capture the exit code.
 * 5. Shut down the server.
 * 6. Exit the process with the pa11y exit code.
 */
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

function waitForOutput(child, regex, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const onData = (data) => {
      if (regex.test(data.toString())) {
        cleanup();
        resolve();
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("Server start timeout"));
    }, timeout);
    function cleanup() {
      clearTimeout(timer);
      child.stdout.off("data", onData);
      child.stderr.off("data", onData);
    }
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
  });
}

function runCommand(cmd, args, options = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, options);
    proc.on("error", reject);
    proc.on("close", (code) => resolve(code));
  });
}

(async () => {
  const server = spawn("node", [path.join(__dirname, "playwrightServer.js")], {
    env: { ...process.env, PORT: "5000" },
    stdio: ["ignore", "pipe", "pipe"]
  });

  try {
    await waitForOutput(server, /Static server running/);
    const exitCode = await runCommand(
      "pa11y",
      ["--config", path.join(rootDir, "pa11y.config.cjs"), "http://localhost:5000"],
      { stdio: "inherit" }
    );
    process.exitCode = exitCode;
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    server.kill();
  }
})();
