#!/usr/bin/env node

/**
 * Event System Audit - Analyze battle event naming patterns
 *
 * @pseudocode
 * 1. Parse event emission files to extract event names and patterns
 * 2. Parse event listener files to find consumption patterns
 * 3. Parse test files to identify test-specific event usage
 * 4. Categorize events by type and usage
 * 5. Generate recommendations for naming standardization
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

/**
 * Extract a markdown table that follows the given heading text.
 */
function extractAppendixTable(markdown, heading) {
  const lines = markdown.split("\n");
  const startIndex = lines.findIndex((line) => line.trim() === heading.trim());
  if (startIndex === -1) return [];

  const tableLines = [];
  for (let i = startIndex + 1; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith("### ") && i > startIndex + 1) break;
    if (trimmed.startsWith("|")) {
      tableLines.push(trimmed);
    }
  }

  return parseMarkdownTable(tableLines);
}

/**
 * Parse markdown table rows into objects keyed by column header.
 */
function parseMarkdownTable(tableLines) {
  if (tableLines.length < 2) return [];
  const headers = tableLines[0]
    .split("|")
    .slice(1, -1)
    .map((header) => header.trim());

  const rows = [];
  for (let i = 2; i < tableLines.length; i++) {
    const line = tableLines[i];
    if (!line || /^\|\s*-/.test(line)) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length !== headers.length) continue;

    const row = {};
    headers.forEach((header, idx) => {
      row[header] = cells[idx];
    });
    rows.push(row);
  }

  return rows;
}

/**
 * Extract event emissions from Appendix A of the PRD.
 */
function parseEventEmissions(markdown) {
  const rows = extractAppendixTable(markdown, "### Appendix A: Battle Event Emitters Inventory");
  return rows.map((row) => {
    const name = row.Event.replace(/`/g, "");
    const modules = row["Emitter modules"].split("<br>").map((entry) => entry.replace(/`/g, "").trim());
    return {
      name,
      type: "battleEvent",
      modules
    };
  });
}

/**
 * Extract listener data from Appendix B of the PRD.
 */
function parseEventListeners(markdown) {
  const rows = extractAppendixTable(markdown, "### Appendix B: Listener Inventory (DOM & Event Bus)");
  return rows.map((row) => {
    const event = row.Event.replace(/`/g, "");
    const modules = row["Listener modules"].split("<br>").map((entry) => entry.replace(/`/g, "").trim());
    return {
      event,
      modules
    };
  });
}

/**
 * Extract test usage data from Appendix C of the PRD.
 */
function parseTestEventUsage(markdown) {
  const rows = extractAppendixTable(markdown, "### Appendix C: Test Event Utilities and Dispatch Patterns");
  return rows.map((row) => {
    const pattern = row.Pattern.replace(/`/g, "");
    const modules = row["Test modules"].split("<br>").map((entry) => entry.replace(/`/g, "").trim());
    return {
      pattern,
      modules
    };
  });
}

/**
 * Categorize events by naming patterns
 */
function categorizeEvents(events) {
  const categories = {
    timer: [],
    ui: [],
    state: [],
    player: [],
    scoreboard: [],
    debug: [],
    control: [],
    uncategorized: []
  };

  for (const event of events) {
    const name = event.name.toLowerCase();

    if (name.includes("timer") || name.includes("timeout") || name.includes("countdown")) {
      categories.timer.push(event);
    } else if (name.includes("button") || name.includes("card") || name.includes("ui")) {
      categories.ui.push(event);
    } else if (name.includes("state") || name.includes("match") || name.includes("round")) {
      categories.state.push(event);
    } else if (name.includes("player") || name.includes("stat") || name.includes("select")) {
      categories.player.push(event);
    } else if (name.includes("scoreboard") || name.includes("message")) {
      categories.scoreboard.push(event);
    } else if (name.includes("debug") || name.includes("panel")) {
      categories.debug.push(event);
    } else if (name.includes("control") || name.includes("event")) {
      categories.control.push(event);
    } else {
      categories.uncategorized.push(event);
    }
  }

  return categories;
}

/**
 * Generate naming convention recommendations
 */
function generateNamingConventions() {
  return {
    proposed: {
      "timer.*": [
        "timer.roundExpired",
        "timer.countdownStarted",
        "timer.statSelectionExpired",
        "timer.cooldownFinished"
      ],
      "ui.*": [
        "ui.statButtonsEnabled",
        "ui.statButtonsDisabled",
        "ui.cardsRevealed",
        "ui.countdownStarted"
      ],
      "state.*": [
        "state.transitioned",
        "state.matchStarted",
        "state.roundStarted",
        "state.matchOver"
      ],
      "player.*": ["player.statSelected", "player.interrupted", "player.actionTimeout"],
      "scoreboard.*": [
        "scoreboard.messageShown",
        "scoreboard.messageCleared",
        "scoreboard.scoreUpdated"
      ],
      "debug.*": ["debug.panelUpdated", "debug.stateExposed"]
    },
    migration: {
      // Old name -> New name mappings
      roundTimeout: "timer.roundExpired",
      "statButtons:enable": "ui.statButtonsEnabled",
      "statButtons:disable": "ui.statButtonsDisabled",
      scoreboardShowMessage: "scoreboard.messageShown",
      scoreboardClearMessage: "scoreboard.messageCleared",
      debugPanelUpdate: "debug.panelUpdated",
      matchOver: "state.matchOver",
      statSelected: "player.statSelected"
    }
  };
}

/**
 * Main analysis function
 */
async function analyzeEventSystem() {
  console.log("# Event System Audit Report");
  console.log(`Generated: ${new Date().toISOString()}`);
  console.log("");

  try {
    // Read consolidated PRD appendices
    const prdPath = path.join(
      projectRoot,
      "design/productRequirementsDocuments/prdEventContracts.md"
    );
    const prdContent = fs.readFileSync(prdPath, "utf8");

    // Parse content
    const events = parseEventEmissions(prdContent);
    const listeners = parseEventListeners(prdContent);
    const testEvents = parseTestEventUsage(prdContent);

    console.log("## Summary");
    console.log("");
    console.log(`- **Emitter entries**: ${events.length}`);
    console.log(`- **Listener entries**: ${listeners.length}`);
    console.log(`- **Test utility patterns**: ${testEvents.length}`);
    console.log("");

    // Categorize events
    const categories = categorizeEvents(events);

    console.log("## Event Categories");
    console.log("");
    for (const [category, categoryEvents] of Object.entries(categories)) {
      if (categoryEvents.length > 0) {
        console.log(
          `### ${category.charAt(0).toUpperCase() + category.slice(1)} Events (${categoryEvents.length})`
        );
        console.log("");
        const uniqueNames = [...new Set(categoryEvents.map((e) => e.name))];
        for (const name of uniqueNames.sort()) {
          console.log(`- \`${name}\``);
        }
        console.log("");
      }
    }

    console.log("## Current Event Names Analysis");
    console.log("");
    const uniqueEvents = [...new Set(events.map((e) => e.name))].sort();
    console.log("**All unique event names currently in use:**");
    console.log("```");
    uniqueEvents.forEach((name) => console.log(`"${name}"`));
    console.log("```");
    console.log("");

    // Generate naming conventions
    const conventions = generateNamingConventions(categories);

    console.log("## Recommended Naming Convention");
    console.log("");
    console.log("### Proposed Structure");
    console.log("");
    for (const [namespace, examples] of Object.entries(conventions.proposed)) {
      console.log(`**${namespace}**: ${examples.join(", ")}`);
    }
    console.log("");

    console.log("## Migration Mapping");
    console.log("");
    console.log("### High-Priority Migrations");
    console.log("");
    console.log("| Current Name | Proposed Name | Category | Priority |");
    console.log("|--------------|---------------|----------|----------|");

    for (const [oldName, newName] of Object.entries(conventions.migration)) {
      const category =
        Object.keys(categories).find((cat) => categories[cat].some((e) => e.name === oldName)) ||
        "uncategorized";
      const priority = category === "timer" || category === "state" ? "High" : "Medium";
      console.log(`| \`${oldName}\` | \`${newName}\` | ${category} | ${priority} |`);
    }

    console.log("");
    console.log("## Test Integration Points");
    console.log("");
    if (testEvents.length > 0) {
      console.log("**Test helper functions that need updating:**");
      const uniqueTestPatterns = [...new Set(testEvents.map((e) => e.pattern))].sort();
      uniqueTestPatterns.forEach((pattern) => {
        if (pattern) console.log(`- \`${pattern}\``);
      });
    } else {
      console.log("No test-specific event patterns detected.");
    }
    console.log("");

    console.log("## Implementation Recommendations");
    console.log("");
    console.log("1. **Implement backward-compatible alias system** to avoid breaking changes");
    console.log("2. **Update emitters gradually** using feature flags");
    console.log("3. **Create migration timeline** with deprecation warnings");
    console.log("4. **Update test helpers** to use new event names with backward compatibility");
    console.log("5. **Document event contracts** for future consistency");
  } catch (error) {
    console.error("❌ Analysis failed:", error.message);
    process.exit(1);
  }
}

// Run the analysis
analyzeEventSystem().catch(console.error);
