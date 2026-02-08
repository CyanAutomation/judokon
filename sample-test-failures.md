⎯⎯⎯⎯⎯⎯ Failed Suites 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/unit/roundStore-integration.test.js [ tests/unit/roundStore-integration.test.js ]
Error: Failed to resolve import "../../src/helpers/classicBattle/roundStore.js" from "tests/unit/roundStore-integration.test.js". Does the file exist?
  Plugin: vite:import-analysis
  File: /home/runner/work/judokon/judokon/tests/unit/roundStore-integration.test.js:8:0
  10 |    updateScore: vi.fn()
  11 |  }));
  12 |  const __vi_import_0__ = await import("../../src/helpers/classicBattle/roundStore.js");
     |                                       ^
  13 |  const __vi_import_1__ = await import("../../src/helpers/classicBattle/scoreboardAdapter.js");
  14 |  /**
 ❯ TransformPluginContext._formatLog node_modules/vite/dist/node/chunks/config.js:31120:43
 ❯ TransformPluginContext.error node_modules/vite/dist/node/chunks/config.js:31117:14
 ❯ normalizeUrl node_modules/vite/dist/node/chunks/config.js:29604:18
 ❯ node_modules/vite/dist/node/chunks/config.js:29662:32
 ❯ TransformPluginContext.transform node_modules/vite/dist/node/chunks/config.js:29630:4
 ❯ EnvironmentPluginContainer.transform node_modules/vite/dist/node/chunks/config.js:30919:14
 ❯ loadAndTransform node_modules/vite/dist/node/chunks/config.js:26057:26

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/73]⎯

 FAIL  tests/helpers/classicBattle/controller.startRound.test.js [ tests/helpers/classicBattle/controller.startRound.test.js ]
Error: Failed to resolve import "../../../src/helpers/classicBattle/scoreboardAdapter.js" from "tests/helpers/classicBattle/controller.startRound.test.js". Does the file exist?
  Plugin: vite:import-analysis
  File: /home/runner/work/judokon/judokon/tests/helpers/classicBattle/controller.startRound.test.js:202:6
  204 |      scoreboardModule.setupScoreboard({ pauseTimer: vi.fn(), resumeTimer: vi.fn() });
  205 |      const scoreboardAdapter = await import(
  206 |        "../../../src/helpers/classicBattle/scoreboardAdapter.js"
      |        ^
  207 |      );
  208 |      disposeScoreboard = scoreboardAdapter.initScoreboardAdapter();
 ❯ TransformPluginContext._formatLog node_modules/vite/dist/node/chunks/config.js:31120:43
 ❯ TransformPluginContext.error node_modules/vite/dist/node/chunks/config.js:31117:14
 ❯ normalizeUrl node_modules/vite/dist/node/chunks/config.js:29604:18
 ❯ node_modules/vite/dist/node/chunks/config.js:29662:32
 ❯ TransformPluginContext.transform node_modules/vite/dist/node/chunks/config.js:29630:4
 ❯ EnvironmentPluginContainer.transform node_modules/vite/dist/node/chunks/config.js:30919:14
 ❯ loadAndTransform node_modules/vite/dist/node/chunks/config.js:26057:26

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/73]⎯


⎯⎯⎯⎯⎯⎯ Failed Tests 51 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  tests/classicBattle/cooldown-suppression.test.js > Cooldown suppression during opponent prompt > shows cooldown snackbar during opponent prompt minimum duration window
AssertionError: expected [ undefined ] to deep equally contain StringMatching /Next round in/

- Expected: 
StringMatching /Next round in/

+ Received: 
[
  undefined,
]

 ❯ tests/classicBattle/cooldown-suppression.test.js:75:30
     73|     const showMessageCalls = showSnackbarSpy.mock.calls.map((call) => …
     74|     const updateMessageCalls = updateSnackbarSpy.mock.calls.map((call)…
     75|     expect(showMessageCalls).toContainEqual(expect.stringMatching(/Nex…
       |                              ^
     76|     expect(updateMessageCalls).not.toContainEqual(expect.stringMatchin…
     77| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/73]⎯

 FAIL  tests/classicBattle/cooldown-suppression.test.js > Cooldown suppression during opponent prompt > shows cooldown immediately if opponent prompt window already expired
AssertionError: expected false to be true // Object.is equality

- Expected
+ Received

- true
+ false

 ❯ tests/classicBattle/cooldown-suppression.test.js:151:32
    149|       call[0]?.message?.includes("Next round in")
    150|     );
    151|     expect(hasCooldownMessage).toBe(true);
       |                                ^
    152|   });
    153| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[10/73]⎯

 FAIL  tests/classicBattle/cooldown-suppression.test.js > Cooldown suppression during opponent prompt > shows cooldown during selection phase (roundSelect)
AssertionError: expected [ undefined ] to deep equally contain StringMatching /Next round in/

- Expected: 
StringMatching /Next round in/

+ Received: 
[
  undefined,
]

 ❯ tests/classicBattle/cooldown-suppression.test.js:186:30
    184|     const showMessageCalls = showSnackbarSpy.mock.calls.map((call) => …
    185|     const updateMessageCalls = updateSnackbarSpy.mock.calls.map((call)…
    186|     expect(showMessageCalls).toContainEqual(expect.stringMatching(/Nex…
       |                              ^
    187|     expect(updateMessageCalls).not.toContainEqual(expect.stringMatchin…
    188| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[11/73]⎯

 FAIL  tests/classicBattle/cooldown-suppression.test.js > Cooldown suppression during opponent prompt > shows cooldown during decision phase (roundResolve)
AssertionError: expected [ undefined ] to deep equally contain StringMatching /Next round in/

- Expected: 
StringMatching /Next round in/

+ Received: 
[
  undefined,
]

 ❯ tests/classicBattle/cooldown-suppression.test.js:237:30
    235|     const showMessageCalls = showSnackbarSpy.mock.calls.map((call) => …
    236|     const updateMessageCalls = updateSnackbarSpy.mock.calls.map((call)…
    237|     expect(showMessageCalls).toContainEqual(expect.stringMatching(/Nex…
       |                              ^
    238|     expect(updateMessageCalls).not.toContainEqual(expect.stringMatchin…
    239| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[12/73]⎯

 FAIL  tests/classicBattle/cooldown.test.js > Classic Battle inter-round cooldown + Next > enables Next during cooldown and advances on click
Error: Test timed out in 10000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/classicBattle/cooldown.test.js:97:3
     95|   });
     96| 
     97|   test("enables Next during cooldown and advances on click", async () …
       |   ^
     98|     // Deterministic: no real waits, no full-page DOM. Use fake timers…
     99|     // wire minimal DOM nodes that the cooldown logic expects.

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[13/73]⎯

 FAIL  tests/classicBattle/cooldown.test.js > Classic Battle inter-round cooldown + Next > settles ready promise when ready dispatch returns false
TypeError: advanceWhenReady is not a function
 ❯ tests/classicBattle/cooldown.test.js:157:11
    155|     });
    156| 
    157|     await advanceWhenReady(btn, resolveReady);
       |           ^
    158|     await expect(readyPromise).resolves.toBeUndefined();
    159|     expect(mockDispatchBattleEvent).toHaveBeenCalledWith("ready");

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[14/73]⎯

 FAIL  tests/classicBattle/cooldown.test.js > Classic Battle inter-round cooldown + Next > settles ready promise when ready dispatch throws
TypeError: advanceWhenReady is not a function
 ❯ tests/classicBattle/cooldown.test.js:194:18
    192|     });
    193| 
    194|     await expect(advanceWhenReady(btn, resolveReady)).rejects.toThrow(…
       |                  ^
    195|     await expect(readyPromise).resolves.toBeUndefined();
    196|     expect(mockDispatchBattleEvent).toHaveBeenCalledWith("ready");

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[15/73]⎯

 FAIL  tests/classicBattle/quit-flow.test.js > Classic Battle quit flow > clicking Quit opens confirmation modal
Error: Test timed out in 10000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/classicBattle/quit-flow.test.js:19:3
     17|   });
     18| 
     19|   test("clicking Quit opens confirmation modal", async () => {
       |   ^
     20|     document.documentElement.innerHTML = getHtmlContent();
     21| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[16/73]⎯

 FAIL  tests/classicBattle/resolution.test.js > match end forwards outcome to end modal
AssertionError: expected "spy" to be called with arguments: [ Anything, ObjectContaining{…} ]

Number of calls: 0

 ❯ tests/classicBattle/resolution.test.js:439:24
    437|   });
    438| 
    439|   expect(showEndModal).toHaveBeenCalledWith(
       |                        ^
    440|     expect.anything(),
    441|     expect.objectContaining({

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[17/73]⎯

 FAIL  tests/classicBattle/timer.test.js > Classic Battle round timer > starts timer and clears on expire deterministically
AssertionError: expected "updateTimer" to be called with arguments: [ 2 ]

Number of calls: 0

 ❯ tests/classicBattle/timer.test.js:108:25
    106| 
    107|       // Immediately shows starting value
    108|       expect(updateSpy).toHaveBeenCalledWith(2);
       |                         ^
    109|       expect(timerEl?.textContent).toBe("Time Left: 2s");
    110| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[18/73]⎯

 FAIL  tests/classicBattle/timer.test.js > Classic Battle round timer > retries ready dispatch when initial attempt is refused
TypeError: advanceWhenReady is not a function
 ❯ tests/classicBattle/timer.test.js:364:13
    362| 
    363|     try {
    364|       await advanceWhenReady(button, resolveReady);
       |             ^
    365| 
    366|       expect(dispatchBattleEventMock).toHaveBeenCalledTimes(1);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[19/73]⎯

 FAIL  tests/classicBattle/timer.test.js > Classic Battle round timer > keeps next button interactive across consecutive ready dispatch refusals
TypeError: advanceWhenReady is not a function
 ❯ tests/classicBattle/timer.test.js:407:13
    405| 
    406|     try {
    407|       await advanceWhenReady(button, resolveReady);
       |             ^
    408| 
    409|       expect(dispatchBattleEventMock).toHaveBeenCalledTimes(1);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[20/73]⎯

 FAIL  tests/components/Scoreboard.idempotency.test.js > Scoreboard idempotent init and destroy cleanup > destroy unsubscribes adapter listeners (no further updates)
AssertionError: expected 'Round 2' to be 'Round 1' // Object.is equality

Expected: "Round 1"
Received: "Round 2"

 ❯ tests/components/Scoreboard.idempotency.test.js:54:66
     52|     emitBattleEvent("round.started", { roundIndex: 2 });
     53|     // Should not update after destroy
     54|     expect(document.getElementById("round-counter").textContent).toBe(…
       |                                                                  ^
     55|   });
     56| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[21/73]⎯

 FAIL  tests/components/Scoreboard.test.js > Scoreboard composition > render delegates to model and view
AssertionError: expected '' to be 'Hi' // Object.is equality

- Expected
+ Received

- Hi

 ❯ tests/components/Scoreboard.test.js:27:35
     25|       roundNumber: 3
     26|     });
     27|     expect(messageEl.textContent).toBe("Hi");
       |                                   ^
     28|     expect(timerEl.textContent).toBe("Time Left: 5s");
     29|     expect(scoreEl.textContent).toContain("You: 1");

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[22/73]⎯

 FAIL  tests/components/Scoreboard.test.js > Scoreboard composition > ignores partial score patches
AssertionError: expected '' to contain 'You: 0'

- Expected
+ Received

- You: 0

 ❯ tests/components/Scoreboard.test.js:42:33
     40|     sb.render({ score: { player: 0, opponent: 0 } });
     41|     sb.render({ score: { player: 2 } });
     42|     expect(scoreEl.textContent).toContain("You: 0");
       |                                 ^
     43|     expect(scoreEl.textContent).toContain("Opponent: 0");
     44|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[23/73]⎯

 FAIL  tests/components/Scoreboard.test.js > Scoreboard composition > locks outcome messages
AssertionError: expected '' to be 'Win' // Object.is equality

- Expected
+ Received

- Win

 ❯ tests/components/Scoreboard.test.js:54:35
     52|     sb.showMessage("Win", { outcome: true });
     53|     sb.showMessage("Waiting...");
     54|     expect(messageEl.textContent).toBe("Win");
       |                                   ^
     55|     vi.advanceTimersByTime(1000);
     56|     sb.showMessage("Next");

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[24/73]⎯

 FAIL  tests/integration/battleClassic.integration.test.js > Battle Classic Page Integration > verifies validateSelectionState validation executes during selection
Error: Test timed out in 10000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/integration/battleClassic.integration.test.js:265:5
    263|   });
    264| 
    265|   it("verifies validateSelectionState validation executes during selec…
       |     ^
    266|     await init();
    267| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[25/73]⎯

 FAIL  tests/integration/battleClassic.integration.test.js > Battle Classic Page Integration > keeps roundsPlayed in sync between engine and store in non-orchestrated flow
AssertionError: expected 0 to be greater than 0
 ❯ tests/integration/battleClassic.integration.test.js:542:32
    540|     const result = await performStatSelectionFlow(testApi);
    541|     expect(result.store).toBeTruthy();
    542|     expect(result.roundsAfter).toBeGreaterThan(result.roundsBefore);
       |                                ^
    543|     expect(result.engineRounds).toBe(result.roundsAfter);
    544|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[26/73]⎯

 FAIL  tests/integration/battleClassic.integration.test.js > Battle Classic Page Integration > keeps roundsPlayed in sync between engine and store in orchestrated flow
AssertionError: expected 0 to be greater than 0
 ❯ tests/integration/battleClassic.integration.test.js:554:32
    552|     const result = await performStatSelectionFlow(testApi);
    553|     expect(result.store).toBeTruthy();
    554|     expect(result.roundsAfter).toBeGreaterThan(result.roundsBefore);
       |                                ^
    555|     expect(result.engineRounds).toBe(result.roundsAfter);
    556|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[27/73]⎯

 FAIL  tests/integration/battleClassic.integration.test.js > Battle Classic Page Integration > exposes the battle store through the public accessor during a full selection flow
AssertionError: expected 'power' to be null

- Expected: 
null

+ Received: 
"power"

 ❯ tests/integration/battleClassic.integration.test.js:611:45
    609|     // After roundDisplay, playerChoice is cleared (it's only cleared …
    610|     // Verify the round actually completed by checking rounds played i…
    611|     expect(postRoundOverStore.playerChoice).toBeNull();
       |                                             ^
    612| 
    613|     const debugAfter = testApi.inspect.getDebugInfo();

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[28/73]⎯

 FAIL  tests/integration/battleClassic.integration.test.js > Battle Classic Page Integration > upgrades the placeholder card during opponent reveal
AssertionError: expected true to be false // Object.is equality

- Expected
+ Received

- false
+ true

 ❯ tests/integration/battleClassic.integration.test.js:709:63
    707|       });
    708| 
    709|       expect(opponentCard?.classList.contains("is-obscured")).toBe(fal…
       |                                                               ^
    710|       expect(opponentCard.querySelector("#mystery-card-placeholder")).…
    711|       const revealedContainer = opponentCard.querySelector(".card-cont…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[29/73]⎯

 FAIL  tests/helpers/battleStateIndicator.test.js > createBattleStateIndicator > should fetch the catalog and render the state list
AssertionError: expected 'undefined' to be '2' // Object.is equality

Expected: "2"
Received: "undefined"

 ❯ tests/helpers/battleStateIndicator.test.js:110:42
    108| 
    109|     expect(listItems[1].dataset.stateRaw).toBe("roundWait");
    110|     expect(listItems[1].dataset.stateId).toBe("2");
       |                                          ^
    111|     expect(listItems[1].dataset.stateLabel).toBe("Cooldown");
    112|     expect(listItems[1].textContent).toBe("Cooldown");

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[30/73]⎯

 FAIL  tests/helpers/layoutDebugPanel.test.js > toggleLayoutDebugPanel > adds outlines when enabled and cleans up when disabled
Error: Test timed out in 10000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/helpers/layoutDebugPanel.test.js:48:5
     46| 
     47| describe("toggleLayoutDebugPanel", () => {
     48|   it("adds outlines when enabled and cleans up when disabled", async (…
       |     ^
     49|     const { toggleLayoutDebugPanel, flushLayoutDebugPanelWork } = awai…
     50|       "../../src/helpers/layoutDebugPanel.js"

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[31/73]⎯

 FAIL  tests/helpers/layoutDebugPanel.test.js > toggleLayoutDebugPanel > adds outlines to visible elements with default selector
Error: Test timed out in 10000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/helpers/layoutDebugPanel.test.js:62:5
     60|   });
     61| 
     62|   it("adds outlines to visible elements with default selector", async …
       |     ^
     63|     const { toggleLayoutDebugPanel, flushLayoutDebugPanelWork } = awai…
     64|       "../../src/helpers/layoutDebugPanel.js"

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[32/73]⎯

 FAIL  tests/helpers/orchestratorHandlers.computeOutcome.test.js > computeAndDispatchOutcome > dispatches interrupt when no outcome is produced
AssertionError: expected "spy" to be called with arguments: [ 'interrupt', …(1) ]

Received: 

  1st spy call:

  [
-   "interrupt",
+   "outcome=draw",
    {
      "reason": "guardNoOutcome",
    },
  ]


Number of calls: 1

 ❯ tests/helpers/orchestratorHandlers.computeOutcome.test.js:125:30
    123|     await mod.computeAndDispatchOutcome(store, machine);
    124| 
    125|     expect(machine.dispatch).toHaveBeenCalledWith("interrupt", { reaso…
       |                              ^
    126|   });
    127| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[34/73]⎯

 FAIL  tests/helpers/orchestratorHandlers.helpers.test.js > schedulePostResolveWatchdog > interrupts if state remains roundResolve
AssertionError: expected "spy" to be called with arguments: [ 'interrupt', …(1) ]

Received: 

  1st spy call:

  [
-   "interrupt",
+   "outcome=draw",
    {
      "reason": "postResolveWatchdog",
    },
  ]


Number of calls: 1

 ❯ tests/helpers/orchestratorHandlers.helpers.test.js:95:30
     93|     mod.schedulePostResolveWatchdog(machine);
     94|     await vi.runAllTimersAsync();
     95|     expect(machine.dispatch).toHaveBeenCalledWith("interrupt", {
       |                              ^
     96|       reason: "postResolveWatchdog"
     97|     });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[35/73]⎯

 FAIL  tests/helpers/orchestratorHandlers.map.test.js > stateHandlers map > handles round decision timeout by interrupting the match
AssertionError: expected "spy" to be called with arguments: [ Array(1) ]

Received: 

  1st spy call:

  [
-   "No selection detected. Interrupting round.",
+   "No selection detected. Resolving as draw.",
  ]


Number of calls: 1

 ❯ tests/helpers/orchestratorHandlers.map.test.js:152:50
    150|       expect(helpers.resolveSelectionIfPresent).toHaveBeenCalledWith(s…
    151|       expect(helpers.awaitPlayerChoice).toHaveBeenCalledWith(store);
    152|       expect(spies.get("scoreboardShowMessage")).toHaveBeenCalledWith(
       |                                                  ^
    153|         "No selection detected. Interrupting round."
    154|       );

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[36/73]⎯

 FAIL  tests/helpers/orchestratorHandlers.roundDecisionEnter.test.js > roundResolveEnter > interrupts when no player choice is made
AssertionError: expected "spy" to be called with arguments: [ 'scoreboardShowMessage', …(1) ]

Received: 

  1st spy call:

  [
-   "scoreboardShowMessage",
-   "No selection detected. Interrupting round.",
+   "debugPanelUpdate",
  ]

  2nd spy call:

  [
-   "scoreboardShowMessage",
-   "No selection detected. Interrupting round.",
+   "roundResolve",
+   {
+     "playerChoice": undefined,
+     "timestamp": 1770584293444,
+   },
  ]

  3rd spy call:

  [
    "scoreboardShowMessage",
-   "No selection detected. Interrupting round.",
+   "No selection detected. Resolving as draw.",
  ]

  4th spy call:

  [
-   "scoreboardShowMessage",
-   "No selection detected. Interrupting round.",
+   "debugPanelUpdate",
  ]


Number of calls: 4

 ❯ tests/helpers/orchestratorHandlers.roundDecisionEnter.test.js:68:29
     66|     await p;
     67| 
     68|     expect(emitBattleEvent).toHaveBeenCalledWith(
       |                             ^
     69|       "scoreboardShowMessage",
     70|       "No selection detected. Interrupting round."

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[37/73]⎯

 FAIL  tests/helpers/orchestratorHandlers.roundDecisionEnter.test.js > roundResolveEnter > handles errors during immediate resolution
AssertionError: expected "spy" to be called with arguments: [ 'interrupt', { …(2) } ]

Received: 

  1st spy call:

  [
-   "interrupt",
+   "outcome=draw",
    {
      "error": "boom",
      "reason": "roundResolutionError",
    },
  ]


Number of calls: 1

 ❯ tests/helpers/orchestratorHandlers.roundDecisionEnter.test.js:137:30
    135|       "Round error. Recovering…"
    136|     );
    137|     expect(machine.dispatch).toHaveBeenCalledWith("interrupt", {
       |                              ^
    138|       reason: "roundResolutionError",
    139|       error: "boom"

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[38/73]⎯

 FAIL  tests/helpers/randomJudokaPage.drawButton.test.js > randomJudokaPage draw button > shows fallback and transitions to IDLE when card markup is missing
AssertionError: expected true to be false // Object.is equality

- Expected
+ Received

- false
+ true

 ❯ tests/helpers/randomJudokaPage.drawButton.test.js:191:31
    189|       // Missing card markup is now treated as an error, so fallback i…
    190|       // and button transitions to IDLE after error handling
    191|       expect(button.disabled).toBe(false);
       |                               ^
    192|       expect(button).not.toHaveAttribute("aria-disabled");
    193|       expect(button.classList.contains("is-loading")).toBe(false);
 ❯ Module.withMutedConsole tests/utils/console.js:60:40
 ❯ tests/helpers/randomJudokaPage.drawButton.test.js:158:5

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[39/73]⎯

 FAIL  tests/helpers/roundResolver.resolveRound.test.js > resolveRound > dispatches evaluate before revealing opponent
AssertionError: expected 'emit:round.evaluated' to match /^dispatch:outcome=/

- Expected: 
/^dispatch:outcome=/

+ Received: 
"emit:round.evaluated"

 ❯ tests/helpers/roundResolver.resolveRound.test.js:121:26
    119|     expect(callOrder[0]).toBe("dispatch:evaluate");
    120|     expect(callOrder[1]).toBe("emit:opponentReveal");
    121|     expect(callOrder[2]).toMatch(/^dispatch:outcome=/);
       |                          ^
    122|   });
    123| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[40/73]⎯

 FAIL  tests/helpers/scoreboard.integration.test.js > Scoreboard integration without setupScoreboard > renders messages, score, round counter, and round timer without setup
AssertionError: expected 'Time Left: 0s' to be 'Time Left: 3s' // Object.is equality

Expected: "Time Left: 3s"
Received: "Time Left: 0s"

 ❯ tests/helpers/scoreboard.integration.test.js:190:28
    188|     const timerEl = document.getElementById("next-round-timer");
    189|     const getTimerText = () => timerEl.textContent.replace(/\s+/g, " "…
    190|     expect(getTimerText()).toBe("Time Left: 3s");
       |                            ^
    191|     // After 1s shows 2
    192|     await vi.advanceTimersByTimeAsync(1000);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[41/73]⎯

 FAIL  tests/helpers/timerService.test.js > timerService > updates scoreboard timer and clears on expiration
AssertionError: expected "spy" to be called with arguments: [ 2 ]

Number of calls: 0

 ❯ tests/helpers/timerService.test.js:109:36
    107|     await startTimer(async () => {}, { selectionMade: false });
    108| 
    109|     expect(scoreboard.updateTimer).toHaveBeenCalledWith(2);
       |                                    ^
    110|     scheduler.tick(1000);
    111|     expect(scoreboard.updateTimer).toHaveBeenCalledWith(1);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[42/73]⎯

 FAIL  tests/helpers/uiHelpers.resetBattleUI.test.js > resetBattleUI helpers > clearScoreboardAndMessages resets scoreboard and round result
AssertionError: expected "spy" to be called 1 times, but got 0 times
 ❯ tests/helpers/uiHelpers.resetBattleUI.test.js:79:37
     77|     const scoreDisplay = await import("../../src/helpers/classicBattle…
     78| 
     79|     expect(scoreboard.clearMessage).toHaveBeenCalledTimes(1);
       |                                     ^
     80|     expect(scoreboard.clearTimer).toHaveBeenCalledTimes(1);
     81|     expect(document.getElementById("round-result").textContent).toBe("…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[43/73]⎯

 FAIL  tests/helpers/uiHelpers.showRoundOutcome.test.js > showRoundOutcome > shows outcome message without stat comparison when no stat data provided
AssertionError: expected "spy" to be called with arguments: [ 'You win the round!', …(1) ]

Number of calls: 0

 ❯ tests/helpers/uiHelpers.showRoundOutcome.test.js:26:25
     24| 
     25|     expect(showResult).toHaveBeenCalledWith("You win the round!");
     26|     expect(showMessage).toHaveBeenCalledWith("You win the round!", { o…
       |                         ^
     27|   });
     28| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[44/73]⎯

 FAIL  tests/helpers/uiHelpers.showRoundOutcome.test.js > showRoundOutcome > shows consolidated message with stat comparison when stat data provided
AssertionError: expected "spy" to be called with arguments: [ …(2) ]

Number of calls: 0

 ❯ tests/helpers/uiHelpers.showRoundOutcome.test.js:35:25
     33|       "You picked: Power (8) — Opponent picked: Power (6) — You win th…
     34|     expect(showResult).toHaveBeenCalledWith(expectedMessage);
     35|     expect(showMessage).toHaveBeenCalledWith(expectedMessage, { outcom…
       |                         ^
     36|   });
     37| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[45/73]⎯

 FAIL  tests/pages/battleCLI.onKeyDown.test.js > battleCLI onKeyDown > closes shortcuts with Escape and restores focus
Error: Test timed out in 10000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/pages/battleCLI.onKeyDown.test.js:97:5
     95|   });
     96| 
     97|   it("closes shortcuts with Escape and restores focus", async () => {
       |     ^
     98|     const focusBtn = document.createElement("button");
     99|     document.getElementById("cli-main").appendChild(focusBtn);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[46/73]⎯

 FAIL  tests/pages/battleCLI.onKeyDown.test.js > battleCLI onKeyDown > resumes timers and closes modal when quit is canceled via escape
Error: Test timed out in 10000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/pages/battleCLI.onKeyDown.test.js:257:25
    255| 
    256|   const cancelActions = ["cancel", "escape", "cancelEvent"];
    257|   it.each(cancelActions)(
       |                         ^
    258|     "resumes timers and closes modal when quit is canceled via %s",
    259|     async (action) => {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[47/73]⎯

 FAIL  tests/pages/battleCLI.scoreboard.test.js > battleCLI scoreboard > updates after player win
TypeError: handlers.handleRoundResolved is not a function
 ❯ tests/pages/battleCLI.scoreboard.test.js:95:14
     93|     const { handlers } = await loadHandlers({ playerScore: 1, opponent…
     94|     handlers.ensureCliDomForTest({ reset: true });
     95|     handlers.handleRoundResolved({ detail: { result: { message: "Win" …
       |              ^
     96|     const el = document.getElementById("score-display");
     97|     expect(el.dataset.scorePlayer).toBe("1");

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[48/73]⎯

 FAIL  tests/pages/battleCLI.scoreboard.test.js > battleCLI scoreboard > updates after player loss
TypeError: handlers.handleRoundResolved is not a function
 ❯ tests/pages/battleCLI.scoreboard.test.js:109:14
    107|     getScoresMock.mockReturnValueOnce({ playerScore: 2, opponentScore:…
    108|     getScoresMock.mockReturnValue({ playerScore: 0, opponentScore: 1 }…
    109|     handlers.handleRoundResolved({ detail: { result: { message: "Loss"…
       |              ^
    110|     handlers.handleRoundResolved({ detail: { result: { message: "Loss"…
    111|     const el = document.getElementById("score-display");

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[49/73]⎯

 FAIL  tests/pages/battleCLI.scoreboard.test.js > battleCLI scoreboard > updates after draw
TypeError: handlers.handleRoundResolved is not a function
 ❯ tests/pages/battleCLI.scoreboard.test.js:124:14
    122|     getScoresMock.mockReturnValueOnce({ playerScore: 5, opponentScore:…
    123|     getScoresMock.mockReturnValue({ playerScore: 0, opponentScore: 0 }…
    124|     handlers.handleRoundResolved({ detail: { result: { message: "Draw"…
       |              ^
    125|     handlers.handleRoundResolved({ detail: { result: { message: "Draw"…
    126|     const el = document.getElementById("score-display");

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[50/73]⎯

 FAIL  tests/pages/battleCLI.timerConsolidation.test.js > battleCLI timer consolidation > shared scoreboard timer updates work in non-CLI mode
AssertionError: expected "updateTimer" to be called with arguments: [ 3 ]

Number of calls: 0

 ❯ tests/pages/battleCLI.timerConsolidation.test.js:81:28
     79|     await timing.runAll();
     80| 
     81|     expect(updateTimerSpy).toHaveBeenCalledWith(3);
       |                            ^
     82|     expect(sharedTimer?.textContent?.trim()).toBe("Time Left: 3s");
     83| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[51/73]⎯

 FAIL  tests/unit/roundUI.autoAdvance.spec.js > roundUI auto-advance chain > starts the round cooldown pipeline when a round resolves
AssertionError: expected "spy" to be called 1 times, but got 0 times
 ❯ tests/unit/roundUI.autoAdvance.spec.js:54:33
     52|     const createdTimer = createRoundTimer.mock.results[0]?.value;
     53|     expect(createdTimer).toBe(timerInstance);
     54|     expect(timerInstance.start).toHaveBeenCalledTimes(1);
       |                                 ^
     55|     expect(timerInstance.start).toHaveBeenCalledWith(5);
     56| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[52/73]⎯

 FAIL  tests/helpers/classicBattle/countdownReset.test.js > countdown resets after stat selection > starts a visible countdown after stat selection
Error: Test timed out in 10000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/helpers/classicBattle/countdownReset.test.js:128:5
    126|   });
    127| 
    128|   it("starts a visible countdown after stat selection", async () => {
       |     ^
    129|     populateCards();
    130|     const flushPendingTimers = async (rounds = 3) => {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[53/73]⎯

 FAIL  tests/helpers/classicBattle/nextButton.cooldown.fallback.test.js > Next button cooldown fallback > restores readiness and exits cooldown when timer controls are missing
AssertionError: expected 'false' to be 'true' // Object.is equality

Expected: "true"
Received: "false"

 ❯ tests/helpers/classicBattle/nextButton.cooldown.fallback.test.js:90:57
     88|     const nextButton = document.getElementById("next-button");
     89|     expect(nextButton?.disabled).toBe(false);
     90|     expect(nextButton?.getAttribute("data-next-ready")).toBe("true");
       |                                                         ^
     91|     expect(resolveReady).toHaveBeenCalledTimes(1);
     92|     expect(dispatchSpy).toHaveBeenCalledWith("ready");

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[55/73]⎯

 FAIL  tests/helpers/classicBattle/nextButton.manualClick.test.js > Next button manual interactions > resolves cooldown controls after a user clicks the ready Next button
Error: Test timed out in 10000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/helpers/classicBattle/nextButton.manualClick.test.js:48:5
     46|   });
     47| 
     48|   it("resolves cooldown controls after a user clicks the ready Next bu…
       |     ^
     49|     const { initClassicBattleTest } = await import("./initClassicBattl…
     50|     await initClassicBattleTest({ afterMock: true });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[56/73]⎯

 FAIL  tests/helpers/classicBattle/roundStartError.test.js > round start error recovery > dispatches interrupt when drawCards rejects
AssertionError: expected "dispatch" to be called with arguments: [ 'interrupt', { …(2) } ]

Number of calls: 0

 ❯ tests/helpers/classicBattle/roundStartError.test.js:48:17
     46| 
     47|     expect(machine.getState()).toBe("interruptRound");
     48|     expect(spy).toHaveBeenCalledWith("interrupt", {
       |                 ^
     49|       reason: "roundStartError",
     50|       error: "no cards"

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[57/73]⎯

 FAIL  tests/helpers/classicBattle/roundStartError.test.js > round start error recovery > dispatches interrupt when startRoundWrapper throws
AssertionError: expected "dispatch" to be called with arguments: [ 'interrupt', { …(2) } ]

Number of calls: 0

 ❯ tests/helpers/classicBattle/roundStartError.test.js:85:17
     83| 
     84|     expect(machine.getState()).toBe("interruptRound");
     85|     expect(spy).toHaveBeenCalledWith("interrupt", {
       |                 ^
     86|       reason: "roundStartError",
     87|       error: "sync fail"

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[58/73]⎯

 FAIL  tests/helpers/classicBattle/roundUI.handlers.test.js > startRoundCooldown > waits for delayed opponent prompt when timestamp is missing
TypeError: timer.on is not a function
 ❯ attachCountdownCoordinator src/helpers/classicBattle/countdownCoordinator.js:91:9
     89|   }
     90| 
     91|   timer.on("tick", emitTick);
       |         ^
     92|   timer.on("expired", handleExpired);
     93| 
 ❯ startRoundCooldown src/helpers/classicBattle/roundUI.js:180:29
 ❯ tests/helpers/classicBattle/roundUI.handlers.test.js:111:11

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[59/73]⎯

 FAIL  tests/helpers/classicBattle/roundUI.handlers.test.js > startRoundCooldown > skips waiting when opponent prompt timestamp is already recorded
TypeError: timer.on is not a function
 ❯ attachCountdownCoordinator src/helpers/classicBattle/countdownCoordinator.js:91:9
     89|   }
     90| 
     91|   timer.on("tick", emitTick);
       |         ^
     92|   timer.on("expired", handleExpired);
     93| 
 ❯ startRoundCooldown src/helpers/classicBattle/roundUI.js:180:29
 ❯ tests/helpers/classicBattle/roundUI.handlers.test.js:143:11

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[60/73]⎯

 FAIL  tests/helpers/classicBattle/roundUI.handlers.test.js > startRoundCooldown > waits for opponent prompt when timestamp retrieval throws
TypeError: timer.on is not a function
 ❯ attachCountdownCoordinator src/helpers/classicBattle/countdownCoordinator.js:91:9
     89|   }
     90| 
     91|   timer.on("tick", emitTick);
       |         ^
     92|   timer.on("expired", handleExpired);
     93| 
 ❯ startRoundCooldown src/helpers/classicBattle/roundUI.js:180:29
 ❯ tests/helpers/classicBattle/roundUI.handlers.test.js:169:11

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[61/73]⎯

 FAIL  tests/helpers/classicBattle/roundUI.handlers.test.js > startRoundCooldown > retries waiting once when the wait helper rejects
TypeError: timer.on is not a function
 ❯ attachCountdownCoordinator src/helpers/classicBattle/countdownCoordinator.js:91:9
     89|   }
     90| 
     91|   timer.on("tick", emitTick);
       |         ^
     92|   timer.on("expired", handleExpired);
     93| 
 ❯ startRoundCooldown src/helpers/classicBattle/roundUI.js:180:29
 ❯ tests/helpers/classicBattle/roundUI.handlers.test.js:195:11

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[62/73]⎯

 FAIL  tests/helpers/classicBattle/roundUI.handlers.test.js > round UI handlers > calls applyRoundUI on roundStarted
AssertionError: expected undefined to be truthy

- Expected: 
true

+ Received: 
undefined

 ❯ tests/helpers/classicBattle/roundUI.handlers.test.js:224:32
    222|     const store = {};
    223|     emitBattleEvent("roundStarted", { store, roundNumber: 2 });
    224|     expect(store.playerCardEl).toBeTruthy();
       |                                ^
    225|     expect(store.statButtonEls?.power).toBeTruthy();
    226|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[63/73]⎯

 FAIL  tests/helpers/classicBattle/roundUI.handlers.test.js > round UI handlers > shows outcome on round.evaluated
AssertionError: expected "spy" to be called with arguments: [ 'Win', { outcome: true } ]

Number of calls: 0

 ❯ tests/helpers/classicBattle/roundUI.handlers.test.js:259:36
    257|     });
    258|     const scoreboard = await import("../../../src/helpers/setupScorebo…
    259|     expect(scoreboard.showMessage).toHaveBeenCalledWith("Win", { outco…
       |                                    ^
    260|   });
    261| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[64/73]⎯

 FAIL  tests/helpers/classicBattle/scheduleNextRound.fallback.timer.test.js > startCooldown fallback timer > resolves ready after fallback timer and enables button
Error: Test timed out in 10000ms.
If this is a long-running test, pass a timeout value as the last argument or configure it globally with "testTimeout".
 ❯ tests/helpers/classicBattle/scheduleNextRound.fallback.timer.test.js:91:5
     89|   });
     90| 
     91|   it("resolves ready after fallback timer and enables button", async (…
       |     ^
     92|     const { startCooldown } = await harness.importModule(
     93|       "/src/helpers/classicBattle/roundManager.js"

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[65/73]⎯

 FAIL  tests/helpers/classicBattle/statSelection.test.js > classicBattle stat selection > stat selection disables buttons and updates round message
AssertionError: expected '' to match /win the round/i

- Expected: 
/win the round/i

+ Received: 
""

 ❯ tests/helpers/classicBattle/statSelection.test.js:212:73
    210|     });
    211|     await timers.runAllTimersAsync();
    212|     expect(document.querySelector("header #round-message").textContent…
       |                                                                         ^
    213| 
    214|     controls?.disable?.();

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[66/73]⎯

 FAIL  tests/helpers/classicBattle/statSelectionTiming.test.js > classicBattle stat selection timing > shows selection prompt until a stat is chosen
AssertionError: expected 'Select your move' to be 'Stat selection stalled. Pick a stat o…' // Object.is equality

Expected: "Stat selection stalled. Pick a stat or wait for auto-pick."
Received: "Select your move"

 ❯ tests/helpers/classicBattle/statSelectionTiming.test.js:86:61
     84|     expect(document.querySelector(".snackbar").textContent).toBe("Sele…
     85|     timerSpy.advanceTimersByTime(5000);
     86|     expect(document.querySelector(".snackbar").textContent).toBe(
       |                                                             ^
     87|       "Stat selection stalled. Pick a stat or wait for auto-pick."
     88|     );

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[67/73]⎯

 FAIL  tests/helpers/classicBattle/stateManager.integrity.test.js > state manager integrity > should validate each state handler or confirm transition markers
AssertionError: expected [] to include 'roundResolve'
 ❯ tests/helpers/classicBattle/stateManager.integrity.test.js:82:35
     80| 
     81|     expect(statesWithoutHandlers.length).toBeGreaterThanOrEqual(0);
     82|     expect(statesWithoutHandlers).toContain("roundResolve");
       |                                   ^
     83| 
     84|     const machine = await withMutedConsole(() =>

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[68/73]⎯

 FAIL  tests/helpers/classicBattle/timerService.nextRound.test.js > timerService next round handling > chooses advance strategy when ready
AssertionError: expected "spy" to be called with arguments: [ 'ready' ]

Number of calls: 0

 ❯ tests/helpers/classicBattle/timerService.nextRound.test.js:86:44
     84|     const dispatcher = await import("../../../src/helpers/classicBattl…
     85|     expect(stop).not.toHaveBeenCalled();
     86|     expect(dispatcher.dispatchBattleEvent).toHaveBeenCalledWith("ready…
       |                                            ^
     87|   });
     88| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[69/73]⎯

 FAIL  tests/helpers/classicBattle/timerService.nextRound.test.js > timerService next round handling > chooses cancel strategy when not ready
AssertionError: expected "spy" to be called at least once
 ❯ tests/helpers/classicBattle/timerService.nextRound.test.js:100:18
     98|     });
     99|     const dispatcher = await import("../../../src/helpers/classicBattl…
    100|     expect(stop).toHaveBeenCalled();
       |                  ^
    101|     expect(dispatcher.dispatchBattleEvent).toHaveBeenCalledWith("ready…
    102|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[70/73]⎯

 FAIL  tests/helpers/classicBattle/timerService.nextRound.test.js > timerService next round handling > stopping timer dispatches ready immediately
TypeError: cancelTimerOrAdvance is not a function
 ❯ tests/helpers/classicBattle/timerService.nextRound.test.js:162:11
    160|     const timer = { stop: vi.fn() };
    161|     const resolveReady = vi.fn();
    162|     await cancelTimerOrAdvance(null, timer, resolveReady);
       |           ^
    163|     expect(timer.stop).toHaveBeenCalledTimes(1);
    164|     expect(dispatchBattleEvent).toHaveBeenCalledWith("ready");

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[71/73]⎯

 FAIL  tests/helpers/classicBattle/timerService.nextRound.test.js > timerService next round handling > CooldownRenderer shows static message
AssertionError: expected "spy" to be called with arguments: [ { …(4) } ]

Received: 

  1st spy call:

  [
    {
-     "autoDismiss": 0,
-     "message": "Next round in: 3s",
      "minDuration": 0,
      "priority": "HIGH",
+     "text": "Next round in: 3s",
+     "ttl": 0,
    },
  ]


Number of calls: 1

 ❯ tests/helpers/classicBattle/timerService.nextRound.test.js:254:34
    252|     timer.start(3);
    253| 
    254|     expect(snackbarManager.show).toHaveBeenCalledWith({
       |                                  ^
    255|       message: "Next round in: 3s",
    256|       priority: "HIGH",

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[72/73]⎯

 FAIL  tests/helpers/classicBattle/timerService.nextRound.test.js > timerService next round handling > resolves ready when orchestrator is already past cooldown after module reset
AssertionError: expected "spy" to not be called at all, but actually been called 1 times

Received: 

  1st spy call:

    Array [
      "ready",
    ]


Number of calls: 1

 ❯ tests/helpers/classicBattle/timerService.nextRound.test.js:309:36
    307|       expect(dispatchBattleEvent).toHaveBeenCalledTimes(1);
    308|       // When shared dispatcher succeeds, machine dispatch should NOT …
    309|       expect(machine.dispatch).not.toHaveBeenCalled();
       |                                    ^
    310|       expect(getStateSnapshot).toHaveBeenCalled();
    311|     } finally {

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[73/73]⎯


 Test Files  44 failed | 334 passed (378)
      Tests  65 failed | 2276 passed | 3 skipped (2344)
   Start at  20:56:30
   Duration  224.44s (transform 4.54s, setup 8.64s, collect 17.64s, tests 370.06s, environment 168.47s, prepare 37.28s)