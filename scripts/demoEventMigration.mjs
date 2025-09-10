/**
 * Event Migration Demonstration
 *
 * This script demonstrates how to gradually migrate from old event names
 * to new standardized names using the event alias system.
 */

import {
  emitBattleEventWithAliases,
  onBattleEvent,
  __resetBattleEventTarget
} from "../src/helpers/classicBattle/battleEvents.js";

import { getMigrationInfo } from "../src/helpers/classicBattle/eventAliases.js";

console.log("🔄 Event Migration Demonstration\n");

// Reset event target for clean demonstration
__resetBattleEventTarget();

// Phase 1: Show current state (old events still work)
console.log("Phase 1: Backward Compatibility");
console.log("==============================");

// Set up listeners for both old and new event names
onBattleEvent("roundTimeout", (e) => {
  console.log("✅ Old listener (roundTimeout) received:", e.detail);
});

onBattleEvent("timer.roundExpired", (e) => {
  console.log("✅ New listener (timer.roundExpired) received:", e.detail);
});

// Emit using OLD event name - should trigger both listeners with warning
console.log("\n📤 Emitting old event name 'roundTimeout':");
emitBattleEventWithAliases("roundTimeout", { round: 1, timeExpired: true });

console.log("\n📤 Emitting new event name 'timer.roundExpired':");
emitBattleEventWithAliases("timer.roundExpired", { round: 2, timeExpired: true });

// Phase 2: Show migration guidance
console.log("\n\nPhase 2: Migration Guidance");
console.log("============================");

const oldEvents = [
  "roundTimeout",
  "statButtons:enable",
  "matchOver",
  "scoreboardShowMessage",
  "nextRoundCountdownStarted"
];

oldEvents.forEach((eventName) => {
  const migrationInfo = getMigrationInfo(eventName);
  if (migrationInfo.isDeprecated) {
    console.log(`🔄 ${eventName} → ${migrationInfo.recommendedName}`);
  } else {
    console.log(`✅ ${eventName} (already standardized)`);
  }
});

// Phase 3: Show test helper migration
console.log("\n\nPhase 3: Test Helper Migration Example");
console.log("======================================");

/**
 * Example: Migrating a test helper from old to new event name
 *
 * BEFORE (using deprecated event name):
 * ```javascript
 * export function getRoundTimeoutPromise() {
 *   return new Promise(resolve => {
 *     onBattleEvent("roundTimeout", resolve);
 *   });
 * }
 * ```
 *
 * AFTER (using standardized event name):
 * ```javascript
 * export function getRoundTimeoutPromise() {
 *   return new Promise(resolve => {
 *     onBattleEvent("timer.roundExpired", resolve);
 *   });
 * }
 * ```
 */

// Test helper using new standardized name
export function getTimerRoundExpiredPromise() {
  return new Promise((resolve) => {
    onBattleEvent("timer.roundExpired", resolve);
  });
}

// Test helper using old name (with deprecation warning)
export function getRoundTimeoutPromise() {
  console.warn("⚠️ getRoundTimeoutPromise() is deprecated. Use getTimerRoundExpiredPromise()");
  return new Promise((resolve) => {
    onBattleEvent("roundTimeout", resolve);
  });
}

console.log("📝 Example test helpers created with migration path shown above");

// Phase 4: Show gradual phase-out
console.log("\n\nPhase 4: Gradual Phase-out Strategy");
console.log("===================================");

console.log("🔄 Current alias mappings active for backward compatibility");
console.log("📅 Plan: Gradually disable aliases in future releases");
console.log("🚨 Deprecation warnings help developers update their code");
console.log("✨ Once all code is migrated, aliases can be safely removed");

console.log("\n🎯 Phase 2.2 Event Alias System Implementation Complete!");
