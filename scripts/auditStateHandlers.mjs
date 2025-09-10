#!/usr/bin/env node

/**
 * State Handler Contract Compliance Audit
 *
 * Analyzes state handlers against their documented contracts in stateTable.js
 *
 * @pseudocode
 * 1. Parse stateTable.js to extract state definitions and onEnter contracts
 * 2. Scan stateHandlers directory for implemented handlers
 * 3. Map contracts to actual implementations
 * 4. Generate compliance matrix with gap analysis
 * 5. Categorize gaps by priority (blocking, important, nice-to-have)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Project root directory
const projectRoot = path.resolve(__dirname, "..");

/**
 * Parse state table to extract contracts
 */
async function parseStateContracts() {
  const stateTablePath = path.join(projectRoot, "src/helpers/classicBattle/stateTable.js");
  const stateTableContent = fs.readFileSync(stateTablePath, "utf8");

  // Extract the CLASSIC_BATTLE_STATES array
  const stateDefRegex = /export const CLASSIC_BATTLE_STATES = (\[[\s\S]*?\]);/;
  const match = stateTableContent.match(stateDefRegex);

  if (!match) {
    throw new Error("Could not parse CLASSIC_BATTLE_STATES from stateTable.js");
  }

  try {
    // Use eval to parse the array (safe since we control the source)
    const statesArray = eval(match[1]);
    const contracts = {};

    for (const state of statesArray) {
      contracts[state.name] = {
        id: state.id,
        description: state.description,
        onEnter: state.onEnter || [],
        type: state.type || "normal"
      };
    }

    return contracts;
  } catch (error) {
    console.error("Error parsing state definitions:", error);
    throw error;
  }
}

/**
 * Scan state handler directory for implementations
 */
async function scanStateHandlers() {
  const handlersDir = path.join(projectRoot, "src/helpers/classicBattle/stateHandlers");
  const handlers = {};

  try {
    const files = fs.readdirSync(handlersDir);

    for (const file of files) {
      if (file.endsWith(".js")) {
        const filePath = path.join(handlersDir, file);
        const content = fs.readFileSync(filePath, "utf8");

        // Extract state name from filename (e.g., waitingForPlayerActionEnter.js -> waitingForPlayerAction)
        const match = file.match(/^(.+?)(Enter|Exit)\.js$/);
        if (match) {
          const stateName = match[1];
          const handlerType = match[2].toLowerCase(); // 'enter' or 'exit'

          if (!handlers[stateName]) {
            handlers[stateName] = {};
          }

          handlers[stateName][handlerType] = {
            file: file,
            path: filePath,
            exists: true,
            content: content
          };
        }
      }
    }
  } catch (error) {
    console.error("Error scanning state handlers:", error);
    throw error;
  }

  return handlers;
}

/**
 * Analyze handler implementation for contract compliance
 */
function analyzeHandlerImplementation(handler, contractActions) {
  if (!handler || !handler.content) {
    return {
      implemented: [],
      missing: contractActions,
      analysis: "Handler file not found"
    };
  }

  const content = handler.content;
  const implemented = [];
  const missing = [];

  for (const action of contractActions) {
    const [category, operation] = action.split(":");
    let isImplemented = false;

    // Check for different implementation patterns
    switch (category) {
      case "timer":
        isImplemented =
          content.includes("startTimer") ||
          content.includes("timerService") ||
          content.includes("timer") ||
          content.includes("clearTimer");
        break;

      case "render":
      case "announce":
      case "prompt":
        isImplemented =
          content.includes("emitBattleEvent") ||
          content.includes("battleEvent") ||
          content.includes("render") ||
          content.includes("announce") ||
          content.includes("prompt");
        break;

      case "init":
      case "store":
      case "reset":
      case "set":
        isImplemented =
          content.includes("store") ||
          content.includes("context") ||
          content.includes("machine") ||
          content.includes("reset") ||
          content.includes("init");
        break;

      case "draw":
      case "reveal":
        isImplemented =
          content.includes("draw") ||
          content.includes("reveal") ||
          content.includes("cards") ||
          content.includes("judoka");
        break;

      case "compare":
      case "compute":
        isImplemented =
          content.includes("compare") ||
          content.includes("compute") ||
          content.includes("outcome") ||
          content.includes("result");
        break;

      case "update":
        isImplemented =
          content.includes("update") || content.includes("score") || content.includes("UI");
        break;

      case "show":
        isImplemented =
          content.includes("show") || content.includes("display") || content.includes("screen");
        break;

      case "open":
        isImplemented =
          content.includes("open") || content.includes("panel") || content.includes("modal");
        break;

      case "rollback":
      case "teardown":
        isImplemented =
          content.includes("rollback") ||
          content.includes("teardown") ||
          content.includes("cleanup") ||
          content.includes("reset");
        break;

      case "log":
        isImplemented =
          content.includes("log") || content.includes("analytics") || content.includes("console");
        break;

      case "a11y":
        isImplemented =
          content.includes("a11y") ||
          content.includes("accessibility") ||
          content.includes("aria") ||
          content.includes("timer"); // Timer status is handled by timerService
        break;

      default:
        // Generic check for the action term
        isImplemented = content.toLowerCase().includes(operation.toLowerCase());
    }

    if (isImplemented) {
      implemented.push(action);
    } else {
      missing.push(action);
    }
  }

  return {
    implemented,
    missing,
    analysis:
      missing.length === 0
        ? "Fully compliant"
        : missing.length === contractActions.length
          ? "No implementation found"
          : "Partially implemented"
  };
}

/**
 * Categorize gaps by priority
 */
function categorizeGaps(missing, stateName) {
  const priority1 = []; // Blocking: Timer logic, state transitions
  const priority2 = []; // Important: UI updates, announcements
  const priority3 = []; // Nice-to-have: Logging, optional features

  for (const action of missing) {
    const [category, operation] = action.split(":");

    if (
      category === "timer" ||
      (category === "init" && stateName === "matchStart") ||
      (category === "compare" && stateName === "roundDecision")
    ) {
      priority1.push(action);
    } else if (
      category === "render" ||
      category === "announce" ||
      category === "prompt" ||
      category === "update" ||
      category === "show"
    ) {
      priority2.push(action);
    } else {
      priority3.push(action);
    }
  }

  return { priority1, priority2, priority3 };
}

/**
 * Generate compliance report
 */
async function generateReport() {
  console.log("# State Handler Contract Compliance Audit");
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log("");

  try {
    const contracts = await parseStateContracts();
    const handlers = await scanStateHandlers();

    console.log("## Summary");
    console.log("");
    console.log(`- **States in contract**: ${Object.keys(contracts).length}`);
    console.log(`- **Handler files found**: ${Object.keys(handlers).length}`);
    console.log("");

    // Overall compliance stats
    let totalActions = 0;
    let totalImplemented = 0;
    let totalMissing = 0;
    let criticalGaps = 0;

    console.log("## Detailed Analysis");
    console.log("");

    for (const [stateName, contract] of Object.entries(contracts)) {
      console.log(`### ${stateName}`);
      console.log(`**ID**: ${contract.id} | **Type**: ${contract.type}`);
      console.log(`**Description**: ${contract.description}`);
      console.log("");

      if (contract.onEnter.length === 0) {
        console.log("✅ **No onEnter actions required**");
        console.log("");
        continue;
      }

      console.log(`**Required onEnter actions**: ${contract.onEnter.length}`);
      console.log("```");
      contract.onEnter.forEach((action) => console.log(`- ${action}`));
      console.log("```");
      console.log("");

      // Check handler implementation
      const handler = handlers[stateName]?.enter;
      const analysis = analyzeHandlerImplementation(handler, contract.onEnter);

      totalActions += contract.onEnter.length;
      totalImplemented += analysis.implemented.length;
      totalMissing += analysis.missing.length;

      console.log(`**Implementation Status**: ${analysis.analysis}`);

      if (analysis.implemented.length > 0) {
        console.log(
          `**✅ Implemented (${analysis.implemented.length})**: ${analysis.implemented.join(", ")}`
        );
      }

      if (analysis.missing.length > 0) {
        console.log(`**❌ Missing (${analysis.missing.length})**: ${analysis.missing.join(", ")}`);

        // Categorize gaps
        const gaps = categorizeGaps(analysis.missing, stateName);
        if (gaps.priority1.length > 0) {
          console.log(`**🚨 Priority 1 (Critical)**: ${gaps.priority1.join(", ")}`);
          criticalGaps += gaps.priority1.length;
        }
        if (gaps.priority2.length > 0) {
          console.log(`**⚠️ Priority 2 (Important)**: ${gaps.priority2.join(", ")}`);
        }
        if (gaps.priority3.length > 0) {
          console.log(`**ℹ️ Priority 3 (Nice-to-have)**: ${gaps.priority3.join(", ")}`);
        }
      }

      if (handler) {
        console.log(`**Handler file**: \`${handler.file}\``);
      } else {
        console.log("**❌ Handler file**: Not found");
      }

      console.log("");
      console.log("---");
      console.log("");
    }

    // Final summary
    console.log("## Compliance Summary");
    console.log("");
    console.log(`- **Total contract actions**: ${totalActions}`);
    console.log(
      `- **Implemented**: ${totalImplemented} (${Math.round((totalImplemented / totalActions) * 100)}%)`
    );
    console.log(
      `- **Missing**: ${totalMissing} (${Math.round((totalMissing / totalActions) * 100)}%)`
    );
    console.log(`- **Critical gaps**: ${criticalGaps}`);
    console.log("");

    if (criticalGaps > 0) {
      console.log(
        "🚨 **Critical gaps found!** These should be addressed first as they may break battle flow."
      );
    } else if (totalMissing > 0) {
      console.log("⚠️ **Non-critical gaps found.** Consider implementing for completeness.");
    } else {
      console.log("✅ **All state handlers are fully compliant with their contracts.**");
    }

    console.log("");
    console.log("## Recommendations");
    console.log("");
    console.log("1. **Address Priority 1 gaps first** - these can break core battle functionality");
    console.log(
      "2. **Verify implementation patterns** - some actions may be implemented but not detected by this audit"
    );
    console.log("3. **Add unit tests** for any modified handlers");
    console.log("4. **Run integration tests** after fixes to ensure no regressions");
  } catch (error) {
    console.error("❌ Audit failed:", error.message);
    process.exit(1);
  }
}

// Run the audit
generateReport().catch(console.error);
