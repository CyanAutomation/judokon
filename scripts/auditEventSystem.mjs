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
 * Extract event names from emission patterns
 */
function parseEventEmissions(content) {
  const events = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match emitBattleEvent patterns
    const emitMatch = line.match(/emitBattleEvent\s*\(\s*["']([^"']+)["']/);
    if (emitMatch) {
      events.push({
        name: emitMatch[1],
        type: "battleEvent",
        file: extractFileFromPath(line),
        line: line.trim()
      });
      continue;
    }

    // Match eventBus.emit patterns
    const eventBusMatch = line.match(/eventBus\.emit\s*\(\s*["']([^"']+)["']/);
    if (eventBusMatch) {
      events.push({
        name: eventBusMatch[1],
        type: "eventBus",
        file: extractFileFromPath(line),
        line: line.trim()
      });
      continue;
    }

    // Match generic emit patterns
    const genericEmitMatch = line.match(/\.emit\s*\(\s*["']([^"']+)["']/);
    if (genericEmitMatch) {
      events.push({
        name: genericEmitMatch[1],
        type: "generic",
        file: extractFileFromPath(line),
        line: line.trim()
      });
    }
  }

  return events;
}

/**
 * Extract event listener patterns
 */
function parseEventListeners(content) {
  const listeners = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match addEventListener patterns
    const addEventMatch = line.match(/addEventListener\s*\(\s*["']([^"']+)["']/);
    if (addEventMatch) {
      listeners.push({
        event: addEventMatch[1],
        type: "addEventListener",
        file: extractFileFromPath(line),
        line: line.trim()
      });
      continue;
    }

    // Match .on( patterns
    const onMatch = line.match(/\.on\s*\(\s*["']([^"']+)["']/);
    if (onMatch) {
      listeners.push({
        event: onMatch[1],
        type: "on",
        file: extractFileFromPath(line),
        line: line.trim()
      });
      continue;
    }

    // Match setupPromise patterns
    const promiseMatch = line.match(/setupPromise\s*\(\s*["']([^"']+)["']/);
    if (promiseMatch) {
      listeners.push({
        event: promiseMatch[1],
        type: "promise",
        file: extractFileFromPath(line),
        line: line.trim()
      });
    }
  }

  return listeners;
}

/**
 * Extract test event usage patterns
 */
function parseTestEventUsage(content) {
  const testEvents = [];
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Match get*Promise patterns
    const promiseMatch = line.match(/get(\w+)Promise/);
    if (promiseMatch) {
      testEvents.push({
        promiseName: `get${promiseMatch[1]}Promise`,
        eventType: promiseMatch[1],
        file: extractFileFromPath(line),
        line: line.trim()
      });
      continue;
    }

    // Match waitFor*Event patterns
    const waitMatch = line.match(/waitFor(\w+)Event/);
    if (waitMatch) {
      testEvents.push({
        waitName: `waitFor${waitMatch[1]}Event`,
        eventType: waitMatch[1],
        file: extractFileFromPath(line),
        line: line.trim()
      });
    }
  }

  return testEvents;
}

/**
 * Extract file path from grep output line
 */
function extractFileFromPath(line) {
  const match = line.match(/^([^:]+):/);
  return match ? path.basename(match[1]) : "unknown";
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
function generateNamingConventions(categories) {
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
    // Read audit files
    const emissionsFile = path.join(projectRoot, "design/eventAudit/eventEmissions.txt");
    const listenersFile = path.join(projectRoot, "design/eventAudit/eventListeners.txt");
    const testUsageFile = path.join(projectRoot, "design/eventAudit/testEventUsage.txt");

    const emissionsContent = fs.readFileSync(emissionsFile, "utf8");
    const listenersContent = fs.readFileSync(listenersFile, "utf8");
    const testUsageContent = fs.readFileSync(testUsageFile, "utf8");

    // Parse content
    const events = parseEventEmissions(emissionsContent);
    const listeners = parseEventListeners(listenersContent);
    const testEvents = parseTestEventUsage(testUsageContent);

    console.log("## Summary");
    console.log("");
    console.log(`- **Events emitted**: ${events.length}`);
    console.log(`- **Event listeners**: ${listeners.length}`);
    console.log(`- **Test event patterns**: ${testEvents.length}`);
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
      const uniqueTestEvents = [
        ...new Set(testEvents.map((e) => e.promiseName || e.waitName))
      ].sort();
      uniqueTestEvents.forEach((name) => {
        if (name) console.log(`- \`${name}\``);
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
