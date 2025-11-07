import { vi } from "vitest";

let getBattleEventTarget;

async function setupModules() {
  // Mock the battle events
  await vi.stubGlobal("document", { getElementById: vi.fn(() => null) });

  const battleEventsModule = await import("./src/helpers/classicBattle/battleEvents.js");
  const uiEventHandlersModule = await import("./src/helpers/classicBattle/uiEventHandlers.js");

  getBattleEventTarget = battleEventsModule.getBattleEventTarget;
  const emitBattleEvent = battleEventsModule.emitBattleEvent;
  const bindUIHelperEventHandlersDynamic = uiEventHandlersModule.bindUIHelperEventHandlersDynamic;

  console.log("getBattleEventTarget:", getBattleEventTarget);
  console.log("emitBattleEvent:", emitBattleEvent);
  console.log("bindUIHelperEventHandlersDynamic:", bindUIHelperEventHandlersDynamic);

  return {
    emitBattleEvent,
    bindUIHelperEventHandlersDynamic
  };
}

(async () => {
  try {
    const { emitBattleEvent } = await setupModules();

    console.log("\n--- Testing Event System ---");
    console.log("1. Getting battle event target...");
    const target = getBattleEventTarget();
    console.log("Target:", target);

    console.log("\n2. Adding listener directly to event target...");
    let listenerCalled = false;
    target.addEventListener("statSelected", (e) => {
      console.log("Direct listener called with event:", e);
      listenerCalled = true;
    });

    console.log("\n3. Emitting event...");
    emitBattleEvent("statSelected", { opts: { delayOpponentMessage: true } });
    console.log("Direct listener was called:", listenerCalled);

    console.log("\n--- Complete ---");
  } catch (error) {
    console.error("Error:", error);
  }
})();
