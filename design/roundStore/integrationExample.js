/**
 * Integration example showing RoundStore compatibility with existing modules
 *
 * This example demonstrates how RoundStore can be integrated with existing
 * battle modules while maintaining backward compatibility during migration.
 *
 * @module design/roundStore/integrationExample.js
 */

import { roundStore } from "../../src/helpers/classicBattle/roundStore.js";

/**
 * Example: RoundManager integration with RoundStore
 *
 * Shows how roundManager.js could use RoundStore instead of local state
 */
export function exampleRoundManagerIntegration() {
  console.log("=== RoundManager Integration Example ===\n");

  // Simulate round progression using RoundStore
  console.log("1. Initial state:");
  console.log("   RoundStore:", roundStore.getCurrentRound());

  console.log("\n2. Starting round 1:");
  roundStore.setRoundNumber(1);
  roundStore.setRoundState("cooldown");
  console.log("   RoundStore:", roundStore.getCurrentRound());

  console.log("\n3. Player selects stat:");
  roundStore.setSelectedStat("strength");
  console.log("   RoundStore:", roundStore.getCurrentRound());

  console.log("\n4. Round resolves:");
  roundStore.setRoundOutcome("win");
  roundStore.setRoundState("roundEnd");
  console.log("   RoundStore:", roundStore.getCurrentRound());

  console.log("\n5. Moving to next round:");
  roundStore.setRoundNumber(2);
  roundStore.setRoundState("cooldown");
  console.log("   RoundStore:", roundStore.getCurrentRound());
}

/**
 * Example: BattleDebug integration with RoundStore
 *
 * Shows how battleDebug.js could use RoundStore for state snapshots
 */
export function exampleBattleDebugIntegration() {
  console.log("\n=== BattleDebug Integration Example ===\n");

  // Simulate some state changes
  roundStore.setRoundNumber(3);
  roundStore.setRoundState("roundStart");
  roundStore.setSelectedStat("speed");
  roundStore.setRoundState("roundEnd");
  roundStore.setRoundOutcome("loss");

  console.log("State snapshot from RoundStore:");
  const snapshot = roundStore.getStateSnapshot();
  console.log("Current round:", snapshot.currentRound);
  console.log("Ready dispatched:", snapshot.readyDispatched);
  console.log("Recent transitions:", snapshot.transitionLog.slice(-3));
}

/**
 * Example: ScoreboardAdapter integration with RoundStore
 *
 * Shows how scoreboardAdapter.js could subscribe to RoundStore changes
 */
export function exampleScoreboardAdapterIntegration() {
  console.log("\n=== ScoreboardAdapter Integration Example ===\n");

  // Set up subscription for round number changes (like scoreboardAdapter does)
  roundStore.onRoundNumberChange((newNumber, oldNumber) => {
    console.log(`Round number changed from ${oldNumber} to ${newNumber}`);
    console.log("ScoreboardAdapter would update UI here");
  });

  console.log("Simulating round progression:");
  roundStore.setRoundNumber(1);
  roundStore.setRoundNumber(2);
  roundStore.setRoundNumber(3);
}

/**
 * Example: RoundReadyState integration with RoundStore
 *
 * Shows how roundReadyState.js ready dispatch tracking could use RoundStore
 */
export function exampleRoundReadyStateIntegration() {
  console.log("\n=== RoundReadyState Integration Example ===\n");

  console.log("Initial ready state:", roundStore.isReadyDispatched());

  console.log("Marking ready dispatched:");
  roundStore.markReadyDispatched();
  console.log("Ready state:", roundStore.isReadyDispatched());

  console.log("Resetting for new cooldown:");
  roundStore.resetReadyDispatch();
  console.log("Ready state:", roundStore.isReadyDispatched());
}

/**
 * Example: Backward compatibility during migration
 *
 * Shows how existing event listeners continue to work during migration
 */
export function exampleBackwardCompatibility() {
  console.log("\n=== Backward Compatibility Example ===\n");

  // Set up legacy event listeners (existing code)
  const legacyListeners = [];

  function addLegacyListener(event, handler) {
    legacyListeners.push({ event, handler });
    // In real implementation, this would register with battleEvents
  }

  addLegacyListener("roundStateChanged", (data) => {
    console.log(`Legacy listener: Round state changed from ${data.from} to ${data.to}`);
  });

  addLegacyListener("display.round.start", (data) => {
    console.log(`Legacy listener: Round ${data.roundNumber} started`);
  });

  addLegacyListener("statSelected", (data) => {
    console.log(`Legacy listener: Stat selected: ${data.stat}`);
  });

  console.log("Simulating round progression (legacy events still fire):");
  roundStore.setRoundNumber(1);
  roundStore.setRoundState("cooldown");
  roundStore.setSelectedStat("agility");
}

/**
 * Example: Reactive UI updates with RoundStore
 *
 * Shows how UI components could react to RoundStore changes
 */
export function exampleReactiveUI() {
  console.log("\n=== Reactive UI Example ===\n");

  // Simulate UI components subscribing to store changes
  roundStore.onRoundStateChange((newState, oldState) => {
    console.log(`UI: Round state changed from ${oldState} to ${newState}`);
    // In real implementation: update DOM, trigger animations, etc.
  });

  roundStore.onRoundNumberChange((newNumber) => {
    console.log(`UI: Round number updated to ${newNumber}`);
    // In real implementation: update round display, progress indicators, etc.
  });

  roundStore.onStatSelected((stat) => {
    console.log(`UI: Player selected stat: ${stat}`);
    // In real implementation: highlight selected stat, show selection feedback, etc.
  });

  console.log("Simulating user interactions:");
  roundStore.setRoundNumber(1);
  roundStore.setRoundState("statSelection");
  roundStore.setSelectedStat("technique");
  roundStore.setRoundState("roundStart");
}

// Run all examples
export function runAllIntegrationExamples() {
  exampleRoundManagerIntegration();
  exampleBattleDebugIntegration();
  exampleScoreboardAdapterIntegration();
  exampleRoundReadyStateIntegration();
  exampleBackwardCompatibility();
  exampleReactiveUI();

  console.log("\n=== Integration Examples Complete ===");
  console.log("RoundStore provides centralized state management while maintaining");
  console.log("backward compatibility with existing event-driven architecture.");
}
