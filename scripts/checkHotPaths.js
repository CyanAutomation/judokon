/* eslint-env node */
import { execSync } from "node:child_process";

try {
  execSync(
    'grep -RIn "await import(" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle 2>/dev/null',
    { stdio: "pipe" }
  );
  console.error("Found dynamic import in hot path");
  process.exit(1);
} catch {
  // grep returns non-zero when no matches found → treat as pass
  process.exit(0);
}
