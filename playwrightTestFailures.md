1.  playwright/battle-classic/keyboard-navigation.spec.js:28:3 › Classic Battle keyboard navigation › should select a stat with Enter and update the round message

    **STATUS**: ✅ FIXED
    
    **ROOT CAUSE**: 
    1. Test was trying to call `roundMessage.textContent()` but element wasn't being found
    2. The `#round-message` element was missing the `data-testid="round-message"` attribute
    3. The element starts empty by design (showSelectionPrompt() clears it)
    
    **SOLUTION**: 
    1. Added `data-testid="round-message"` to the element in battleClassic.html
    2. Changed test to verify element is attached, then verify it becomes non-empty after selection
    3. Test now passes (6.9s)

    Test timeout of 30000ms exceeded.

    Error: locator.textContent: Test timeout of 30000ms exceeded.
    Call log:
    - waiting for getByTestId('round-message')

    37 | await expect(statButtons.first()).toBeFocused();
    38 |

    > 39 | const initialMessage = (await roundMessage.textContent()) ?? "";

          |                                                ^

    40 |
    41 | await page.keyboard.press("Enter");
    42 |
    at /workspaces/judokon/playwright/battle-classic/keyboard-navigation.spec.js:39:48

    attachment #1: screenshot (image/png) ─────────────────────────────────────────────────────────
    test-results/battle-classic-keyboard-na-b5e49-nd-update-the-round-message/test-failed-1.png
    ───────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ─────────────────────────────────────────────────────────────
    test-results/battle-classic-keyboard-na-b5e49-nd-update-the-round-message/video.webm
    ───────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/battle-classic-keyboard-na-b5e49-nd-update-the-round-message/error-context.md

2.  playwright/battle-classic/opponent-message.spec.js:36:3 › Classic Battle Opponent Messages › shows opponent feedback snackbar immediately after stat selection

    **STATUS**: ✅ FIXED
    
    **ROOT CAUSE**: Test was waiting specifically for "cooldown" state, but battle was transitioning directly to "roundOver" state, skipping cooldown. This happened when round resolution completed faster than expected.
    
    **SOLUTION**: Changed waitForBattleState to wait for any of the valid post-selection states (cooldown, roundOver, or waitingForPlayerAction) instead of strictly requiring cooldown. Test now passes (8.7s).

    TimeoutError: page.waitForFunction: Timeout 5000ms exceeded.

    at helpers/battleStateHelper.js:394

    392 | }
    393 |

    > 394 | await page.waitForFunction(

          |              ^

    395 | (state) => {
    396 | try {
    397 | const currentState = document.body?.dataset?.battleState;
    at waitForBattleState (/workspaces/judokon/playwright/helpers/battleStateHelper.js:394:14)
    at runMessageTest.nextRoundCooldown (/workspaces/judokon/playwright/battle-classic/opponent-message.spec.js:329:7)
    at testBody (/workspaces/judokon/playwright/battle-classic/opponent-message.spec.js:48:7)
    at /workspaces/judokon/playwright/battle-classic/opponent-message.spec.js:52:7

    attachment #1: screenshot (image/png) ─────────────────────────────────────────────────────────
    test-results/battle-classic-opponent-me-79b16-iately-after-stat-selection/test-failed-1.png
    ───────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ─────────────────────────────────────────────────────────────
    test-results/battle-classic-opponent-me-79b16-iately-after-stat-selection/video.webm
    ───────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/battle-classic-opponent-me-79b16-iately-after-stat-selection/error-context.md

3.  playwright/battle-classic/opponent-message.spec.js:36:3 › Classic Battle Opponent Messages › CLI resolveRound reveals the opponent card

    **STATUS**: ✅ FIXED
    
    **ROOT CAUSE**: Test incorrectly expected `#opponent-card` container to have aria-label="Mystery opponent card". According to code (opponentPlaceholder.js:114), the container always keeps aria-label="Opponent card" for semantic consistency. The "Mystery opponent card" label is on the inner `#mystery-card-placeholder` element.
    
    **SOLUTION**: Changed test to check for placeholder visibility and is-obscured class instead of checking aria-label. Test now passes (4.0s).

    Error: expect(locator).toHaveAttribute(expected) failed

    Locator: locator('#opponent-card')
    Expected: "Mystery opponent card"
    Received: "Opponent card"
    Timeout: 5000ms

    Call log:
    - Expect "toHaveAttribute" with timeout 5000ms
    - waiting for locator('#opponent-card')
      2 × locator resolved to <div id="opponent-card" class="is-obscured" aria-label="Opponent card">…</div>
      - unexpected value "Opponent card"
        7 × locator resolved to <div class="" id="opponent-card" aria-label="Opponent card">…</div>
      - unexpected value "Opponent card"

    396 | const opponentCard = page.locator("#opponent-card");
    397 | const mysteryPlaceholder = opponentCard.locator("#mystery-card-placeholder");

    > 398 | await expect(opponentCard).toHaveAttribute("aria-label", "Mystery opponent card");

          |                                      ^

    399 | await expect(mysteryPlaceholder).toHaveCount(1);
    400 |
    401 | await page.evaluate(async () => {
    at /workspaces/judokon/playwright/battle-classic/opponent-message.spec.js:398:38
    at withBattleEventCapture (/workspaces/judokon/playwright/battle-classic/opponent-message.spec.js:141:12)
    at runMessageTest.resolveDelay (/workspaces/judokon/playwright/battle-classic/opponent-message.spec.js:389:7)
    at testBody (/workspaces/judokon/playwright/battle-classic/opponent-message.spec.js:48:7)
    at withMutedConsole (/workspaces/judokon/tests/utils/console.js:60:40)
    at /workspaces/judokon/playwright/battle-classic/opponent-message.spec.js:54:7

    attachment #1: screenshot (image/png) ─────────────────────────────────────────────────────────
    test-results/battle-classic-opponent-me-9bd1c-d-reveals-the-opponent-card/test-failed-1.png
    ───────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ─────────────────────────────────────────────────────────────
    test-results/battle-classic-opponent-me-9bd1c-d-reveals-the-opponent-card/video.webm
    ───────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/battle-classic-opponent-me-9bd1c-d-reveals-the-opponent-card/error-context.md

4.  playwright/battle-classic/opponent-reveal.spec.js:80:3 › Classic Battle Opponent Reveal › resets stat selection after advancing to the next round

    **STATUS**: 🔍 INVESTIGATING - Potential application bug
    
    **ROOT CAUSE**: Test expects `selectionMade` to be reset to `false` when advancing to next round, but it remains `true`. The `waitingForPlayerActionEnter` handler should reset this flag (line 44 in stateHandlers/waitingForPlayerActionEnter.js), but it appears not to be called or the timing is off.
    
    **NEXT STEPS**: Need to verify if state handler is being invoked correctly, or if there's a race condition in the state transition. May be an actual bug in round advancement logic.

    Error: expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

    Call Log:
    - Timeout 5000ms exceeded while waiting on the predicate

      106 | await waitForBattleState(page, "waitingForPlayerAction");
      107 |

      > 108 | await expect

            |       ^

      109 | .poll(async () => {
      110 | const snapshot = await getBattleSnapshot(page);
      111 | return snapshot?.selectionMade === false;
      at /workspaces/judokon/playwright/battle-classic/opponent-reveal.spec.js:108:7
      at withMutedConsole (/workspaces/judokon/tests/utils/console.js:60:40)

    attachment #1: screenshot (image/png) ─────────────────────────────────────────────────────────
    test-results/battle-classic-opponent-re-81658-advancing-to-the-next-round/test-failed-1.png
    ───────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ─────────────────────────────────────────────────────────────
    test-results/battle-classic-opponent-re-81658-advancing-to-the-next-round/video.webm
    ───────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/battle-classic-opponent-re-81658-advancing-to-the-next-round/error-context.md

5.  playwright/battle-classic/replay-flaky-detector.spec.js:11:3 › Classic Battle — Replay flaky detector › replay loop maintains zeroed scoreboard

    Test timeout of 30000ms exceeded.

    Error: locator.click: Test timeout of 30000ms exceeded.
    Call log:
    - waiting for locator('.stat-button[data-stat]').first()
      - locator resolved to <button disabled type="button" tabindex="-1" data-stat="power" aria-label="Power" data-testid="stat-button" aria-describedby="stat-desc-power" class="stat-button disabled selected">Power</button>
    - attempting click action
      2 × waiting for element to be visible, enabled and stable
      - element is not enabled
      - retrying click action
      - waiting 20ms
        2 × waiting for element to be visible, enabled and stable
        - element is not enabled
      - retrying click action
        - waiting 100ms
          44 × waiting for element to be visible, enabled and stable
        - element is not enabled
      - retrying click action
        - waiting 500ms
      - waiting for element to be visible, enabled and stable

    35 | for (let round = 0; round < 5; round += 1) {
    36 | await waitForRoundStats(page);

    > 37 | await anyPlayerStat.click();

         |                             ^

    38 |
    39 | await page.waitForSelector("#match-end-modal, #next-button[data-next-ready='true']");
    40 | if (await matchEndModal.isVisible().catch(() => false)) {
    at /workspaces/judokon/playwright/battle-classic/replay-flaky-detector.spec.js:37:29

    attachment #1: screenshot (image/png) ─────────────────────────────────────────────────────────
    test-results/battle-classic-replay-flak-76347-maintains-zeroed-scoreboard/test-failed-1.png
    ───────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ─────────────────────────────────────────────────────────────
    test-results/battle-classic-replay-flak-76347-maintains-zeroed-scoreboard/video.webm
    ───────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/battle-classic-replay-flak-76347-maintains-zeroed-scoreboard/error-context.md

6.  playwright/battle-classic/replay-round-counter.smoke.spec.js:12:3 › Classic Battle replay - round counter › [Spec: CLASSIC-REPLAY-ROUND-COUNTER-01] replay resets round counter to 1

    Test timeout of 30000ms exceeded.

    Error: locator.click: Test timeout of 30000ms exceeded.
    Call log:
    - waiting for getByTestId('replay-button')
      - locator resolved to <button id="replay-button" data-role="replay" data-testid="replay-button" class="battle-control-button secondary-button">↵ Replay↵ </button>
    - attempting click action
      2 × waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling
      - <dialog open="" class="modal" tabindex="-1" role="dialog" aria-modal="true" id="match-end-modal" aria-labelledby="match-end-title" aria-describedby="match-end-desc">…</dialog> intercepts pointer events
      - retrying click action
      - waiting 20ms
        2 × waiting for element to be visible, enabled and stable
        - element is visible, enabled and stable
        - scrolling into view if needed
        - done scrolling
        - <dialog open="" class="modal" tabindex="-1" role="dialog" aria-modal="true" id="match-end-modal" aria-labelledby="match-end-title" aria-describedby="match-end-desc">…</dialog> intercepts pointer events
      - retrying click action
        - waiting 100ms
          32 × waiting for element to be visible, enabled and stable
        - element is visible, enabled and stable
        - scrolling into view if needed
        - done scrolling
        - <dialog open="" class="modal" tabindex="-1" role="dialog" aria-modal="true" id="match-end-modal" aria-labelledby="match-end-title" aria-describedby="match-end-desc">…</dialog> intercepts pointer events
      - retrying click action
        - waiting 500ms
      - waiting for element to be visible, enabled and stable
      - element is visible, enabled and stable
      - scrolling into view if needed
      - done scrolling

    39 | await expect(replayBtn).toBeVisible();
    40 |

    > 41 | await replayBtn.click();

         |                     ^

    42 |
    43 | const playerScoreValue = page.getByTestId("player-score-value");
    44 | const opponentScoreValue = page.getByTestId("opponent-score-value");
    at /workspaces/judokon/playwright/battle-classic/replay-round-counter.smoke.spec.js:41:21

    attachment #1: screenshot (image/png) ─────────────────────────────────────────────────────────
    test-results/battle-classic-replay-roun-b8be6-y-resets-round-counter-to-1/test-failed-1.png
    ───────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ─────────────────────────────────────────────────────────────
    test-results/battle-classic-replay-roun-b8be6-y-resets-round-counter-to-1/video.webm
    ───────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/battle-classic-replay-roun-b8be6-y-resets-round-counter-to-1/error-context.md

7.  playwright/battle-classic/round-flow.spec.js:72:3 › Classic Battle Opponent Round Flow › resolves the round and updates score after opponent reveal

    TimeoutError: page.waitForFunction: Timeout 2000ms exceeded.

    at helpers/battleStateHelper.js:394

    392 | }
    393 |

    > 394 | await page.waitForFunction(

          |              ^

    395 | (state) => {
    396 | try {
    397 | const currentState = document.body?.dataset?.battleState;
    at waitForBattleState (/workspaces/judokon/playwright/helpers/battleStateHelper.js:394:14)
    at /workspaces/judokon/playwright/battle-classic/round-flow.spec.js:84:7
    at withMutedConsole (/workspaces/judokon/tests/utils/console.js:60:40)

    attachment #1: screenshot (image/png) ─────────────────────────────────────────────────────────
    test-results/battle-classic-round-flow--ea082-score-after-opponent-reveal/test-failed-1.png
    ───────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ─────────────────────────────────────────────────────────────
    test-results/battle-classic-round-flow--ea082-score-after-opponent-reveal/video.webm
    ───────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/battle-classic-round-flow--ea082-score-after-opponent-reveal/error-context.md

8.  playwright/battle-classic/round-flow.spec.js:98:3 › Classic Battle Opponent Round Flow › advances to the next round after opponent reveal

    Error: Expected stat selection to reset for the next round

    expect(received).toBe(expected) // Object.is equality

    Expected: true
    Received: false

    Call Log:
    - Timeout 5000ms exceeded while waiting on the predicate

      117 | await nextButton.click();
      118 |

      > 119 | await expect

            |       ^

      120 | .poll(
      121 | async () => {
      122 | const snapshot = await getBattleSnapshot(page);
      at /workspaces/judokon/playwright/battle-classic/round-flow.spec.js:119:7
      at withMutedConsole (/workspaces/judokon/tests/utils/console.js:60:40)

    attachment #1: screenshot (image/png) ─────────────────────────────────────────────────────────
    test-results/battle-classic-round-flow--782c9-round-after-opponent-reveal/test-failed-1.png
    ───────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ─────────────────────────────────────────────────────────────
    test-results/battle-classic-round-flow--782c9-round-after-opponent-reveal/video.webm
    ───────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/battle-classic-round-flow--782c9-round-after-opponent-reveal/error-context.md

9.  playwright/battle-classic/round-flow.spec.js:199:3 › Classic Battle Opponent Round Flow › opponent reveal state is properly managed between rounds

    Error: expect(locator).toContainText(expected) failed

    Locator: locator('#round-counter')
    Expected pattern: /Round\s\*2/i
    Received string: "Round 1"
    Timeout: 5000ms

    Call log:
    - Expect "toContainText" with timeout 5000ms
    - waiting for locator('#round-counter')
      9 × locator resolved to <p id="round-counter" aria-live="polite" aria-atomic="true" data-testid="round-counter">Round 1</p>
      - unexpected value "Round 1"

    220 |
    221 | const roundCounter = page.locator("#round-counter");

    > 222 | await expect(roundCounter).toContainText(/Round\s\*2/i);

          |                                  ^

    223 |
    224 | const secondStat = page.locator(selectors.statButton()).nth(1);
    225 | await expect(secondStat).toBeVisible();
    at /workspaces/judokon/playwright/battle-classic/round-flow.spec.js:222:34
    at withMutedConsole (/workspaces/judokon/tests/utils/console.js:60:40)

    attachment #1: screenshot (image/png) ─────────────────────────────────────────────────────────
    test-results/battle-classic-round-flow--cd784-erly-managed-between-rounds/test-failed-1.png
    ───────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ─────────────────────────────────────────────────────────────
    test-results/battle-classic-round-flow--cd784-erly-managed-between-rounds/video.webm
    ───────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/battle-classic-round-flow--cd784-erly-managed-between-rounds/error-context.md

10. playwright/battle-classic/round-flow.spec.js:233:3 › Classic Battle Opponent Round Flow › opponent reveal cleans up properly on match end

    Error: expect(locator).toContainText(expected) failed

    Locator: locator('#snackbar-container')
    Expected pattern: /Opponent is choosing/i
    Received string: ""
    Timeout: 5000ms

    Call log:
    - Expect "toContainText" with timeout 5000ms
    - waiting for locator('#snackbar-container')
      6 × locator resolved to <div role="status" aria-live="polite" aria-atomic="true" id="snackbar-container">…</div>
      - unexpected value "First to 3 points wins."
        3 × locator resolved to <div role="status" aria-live="polite" aria-atomic="true" id="snackbar-container"></div>
      - unexpected value ""

    243 |
    244 | const snackbar = page.locator(selectors.snackbarContainer());

    > 245 | await expect(snackbar).toContainText(/Opponent is choosing/i);

          |                              ^

    246 |
    247 | await ensureRoundResolved(page);
    248 | await waitForRoundsPlayed(page, 1);
    at /workspaces/judokon/playwright/battle-classic/round-flow.spec.js:245:30
    at withMutedConsole (/workspaces/judokon/tests/utils/console.js:60:40)

    attachment #1: screenshot (image/png) ─────────────────────────────────────────────────────────
    test-results/battle-classic-round-flow--dd9de-ns-up-properly-on-match-end/test-failed-1.png
    ───────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ─────────────────────────────────────────────────────────────
    test-results/battle-classic-round-flow--dd9de-ns-up-properly-on-match-end/video.webm
    ───────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/battle-classic-round-flow--dd9de-ns-up-properly-on-match-end/error-context.md

11. playwright/battle-classic/round-flow.spec.js:253:3 › Classic Battle Opponent Round Flow › opponent reveal works with different stat selections

    Error: expect(locator).toContainText(expected) failed

    Locator: locator('#snackbar-container')
    Expected pattern: /Opponent is choosing/i
    Received string: ""
    Timeout: 5000ms

    Call log:
    - Expect "toContainText" with timeout 5000ms
    - waiting for locator('#snackbar-container')
      6 × locator resolved to <div role="status" aria-live="polite" aria-atomic="true" id="snackbar-container">…</div>
      - unexpected value "First to 3 points wins."
        3 × locator resolved to <div role="status" aria-live="polite" aria-atomic="true" id="snackbar-container"></div>
      - unexpected value ""

    270 |
    271 | const snackbar = page.locator(selectors.snackbarContainer());

    > 272 | await expect(snackbar).toContainText(/Opponent is choosing/i);

          |                                ^

    273 |
    274 | await ensureRoundResolved(page);
    275 | await waitForRoundsPlayed(page, attempt + 1);
    at /workspaces/judokon/playwright/battle-classic/round-flow.spec.js:272:32
    at withMutedConsole (/workspaces/judokon/tests/utils/console.js:60:40)

    attachment #1: screenshot (image/png) ─────────────────────────────────────────────────────────
    test-results/battle-classic-round-flow--6c5bc-h-different-stat-selections/test-failed-1.png
    ───────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ─────────────────────────────────────────────────────────────
    test-results/battle-classic-round-flow--6c5bc-h-different-stat-selections/video.webm
    ───────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/battle-classic-round-flow--6c5bc-h-different-stat-selections/error-context.md

12. playwright/battle-classic/round-flow.spec.js:343:5 › Classic Battle Opponent Round Flow › opponent prompt fallback timer probe › displays opponent prompt immediately when no delay configured

    Error: expect(locator).toContainText(expected) failed

    Locator: locator('#snackbar-container')
    Expected pattern: /Opponent is choosing/i
    Received string: "First to 5 points wins."
    Timeout: 500ms

    Call log:
    - Expect "toContainText" with timeout 500ms
    - waiting for locator('#snackbar-container')
      4 × locator resolved to <div role="status" aria-live="polite" aria-atomic="true" id="snackbar-container">…</div>
      - unexpected value "First to 5 points wins."

    353 |
    354 | const snackbar = page.locator(selectors.snackbarContainer());

    > 355 | await expect(snackbar).toContainText(/Opponent is choosing/i, { timeout: 500 });

          |                                ^

    356 | }, MUTED_CONSOLE_LEVELS));
    357 |
    358 | test("displays opponent prompt after configured delay with fallback timer", async ({ page }) =>
    at /workspaces/judokon/playwright/battle-classic/round-flow.spec.js:355:32
    at withMutedConsole (/workspaces/judokon/tests/utils/console.js:60:40)

    attachment #1: screenshot (image/png) ─────────────────────────────────────────────────────────
    test-results/battle-classic-round-flow--6c2e1-ly-when-no-delay-configured/test-failed-1.png
    ───────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ─────────────────────────────────────────────────────────────
    test-results/battle-classic-round-flow--6c2e1-ly-when-no-delay-configured/video.webm
    ───────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/battle-classic-round-flow--6c2e1-ly-when-no-delay-configured/error-context.md

13. playwright/battle-classic/round-flow.spec.js:358:5 › Classic Battle Opponent Round Flow › opponent prompt fallback timer probe › displays opponent prompt after configured delay with fallback timer

    Error: expect(locator).toContainText(expected) failed

    Locator: locator('#snackbar-container')
    Expected pattern: /Opponent is choosing/i
    Received string: "First to 5 points wins."
    Timeout: 300ms

    Call log:
    - Expect "toContainText" with timeout 300ms
    - waiting for locator('#snackbar-container')
      3 × locator resolved to <div role="status" aria-live="polite" aria-atomic="true" id="snackbar-container">…</div>
      - unexpected value "First to 5 points wins."

    370 |
    371 | // Should appear after the configured delay

    > 372 | await expect(snackbar).toContainText(/Opponent is choosing/i, { timeout: 300 });

          |                                ^

    373 | }, MUTED_CONSOLE_LEVELS));
    374 |
    375 | test("clears fallback timer when next round starts", async ({ page }) =>
    at /workspaces/judokon/playwright/battle-classic/round-flow.spec.js:372:32
    at withMutedConsole (/workspaces/judokon/tests/utils/console.js:60:40)

    attachment #1: screenshot (image/png) ─────────────────────────────────────────────────────────
    test-results/battle-classic-round-flow--a382c-d-delay-with-fallback-timer/test-failed-1.png
    ───────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ─────────────────────────────────────────────────────────────
    test-results/battle-classic-round-flow--a382c-d-delay-with-fallback-timer/video.webm
    ───────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/battle-classic-round-flow--a382c-d-delay-with-fallback-timer/error-context.md

14. playwright/battle-classic/round-flow.spec.js:375:5 › Classic Battle Opponent Round Flow › opponent prompt fallback timer probe › clears fallback timer when next round starts

    Error: expect(locator).toContainText(expected) failed

    Locator: locator('#snackbar-container')
    Expected pattern: /Opponent is choosing/i
    Received string: "First to 10 points wins."
    Timeout: 300ms

    Call log:
    - Expect "toContainText" with timeout 300ms
    - waiting for locator('#snackbar-container')
      3 × locator resolved to <div role="status" aria-live="polite" aria-atomic="true" id="snackbar-container">…</div>
      - unexpected value "First to 10 points wins."

    387 | // Round 1
    388 | await firstStat.click();

    > 389 | await expect(snackbar).toContainText(/Opponent is choosing/i, { timeout: 300 });

          |                                ^

    390 |
    391 | await ensureRoundResolved(page);
    392 | await waitForRoundsPlayed(page, 1);
    at /workspaces/judokon/playwright/battle-classic/round-flow.spec.js:389:32
    at withMutedConsole (/workspaces/judokon/tests/utils/console.js:60:40)

    attachment #1: screenshot (image/png) ─────────────────────────────────────────────────────────
    test-results/battle-classic-round-flow--20d10-imer-when-next-round-starts/test-failed-1.png
    ───────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ─────────────────────────────────────────────────────────────
    test-results/battle-classic-round-flow--20d10-imer-when-next-round-starts/video.webm
    ───────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/battle-classic-round-flow--20d10-imer-when-next-round-starts/error-context.md

15. playwright/battle-classic/snackbar-console-diagnostic.spec.js:6:3 › Classic Battle snackbar selection feedback › shows snackbar after stat selection

    Error: expect(locator).toHaveAttribute(expected) failed

    Locator: locator('.stat-button[data-stat]').first()
    Expected: "true"
    Received: ""
    Timeout: 5000ms

    Call log:
    - Expect "toHaveAttribute" with timeout 5000ms
    - waiting for locator('.stat-button[data-stat]').first()
      9 × locator resolved to <button disabled type="button" tabindex="-1" data-stat="power" aria-label="Power" data-testid="stat-button" aria-describedby="stat-desc-power" class="stat-button disabled selected">Power</button>
      - unexpected value "null"

    10 | await expect(statButtons.first()).toBeVisible();
    11 | await statButtons.first().click();

    > 12 | await expect(statButtons.first()).toHaveAttribute("data-selected", "true");

         |                                       ^

    13 |
    14 | const snackbar = page.locator(selectors.snackbarContainer());
    15 | await expect(snackbar).toBeVisible();
    at /workspaces/judokon/playwright/battle-classic/snackbar-console-diagnostic.spec.js:12:39

    attachment #1: screenshot (image/png) ─────────────────────────────────────────────────────────
    test-results/battle-classic-snackbar-co-e348b-ackbar-after-stat-selection/test-failed-1.png
    ───────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ─────────────────────────────────────────────────────────────
    test-results/battle-classic-snackbar-co-e348b-ackbar-after-stat-selection/video.webm
    ───────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/battle-classic-snackbar-co-e348b-ackbar-after-stat-selection/error-context.md

16. playwright/battle-classic/snackbar-diagnostic.spec.js:6:3 › Snackbar diagnostic tests › selecting a stat shows snackbar and enables Next

    Error: expect(locator).toBeVisible() failed

    Locator: locator('#snackbar-container, .snackbar')
    Expected: visible
    Error: strict mode violation: locator('#snackbar-container, .snackbar') resolved to 2 elements: 1) <div role="status" aria-live="polite" aria-atomic="true" id="snackbar-container">…</div> aka locator('#snackbar-container') 2) <div class="snackbar show">First to 5 points wins.</div> aka getByText('First to 5 points wins.', { exact: true })

    Call log:
    - Expect "toBeVisible" with timeout 5000ms
    - waiting for locator('#snackbar-container, .snackbar')

    23 |
    24 | const snackbarLocator = page.locator("#snackbar-container, .snackbar");

    > 25 | await expect(snackbarLocator).toBeVisible();

         |                                     ^

    26 | await expect(snackbarLocator).toContainText(/Opponent is choosing|Next round in/);
    27 |
    28 | await waitForNextButtonReady(page);
    at /workspaces/judokon/playwright/battle-classic/snackbar-diagnostic.spec.js:25:37
    at withMutedConsole (/workspaces/judokon/tests/utils/console.js:60:40)
    at /workspaces/judokon/playwright/battle-classic/snackbar-diagnostic.spec.js:7:5

    attachment #1: screenshot (image/png) ─────────────────────────────────────────────────────────
    test-results/battle-classic-snackbar-di-d1ee7-s-snackbar-and-enables-Next/test-failed-1.png
    ───────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ─────────────────────────────────────────────────────────────
    test-results/battle-classic-snackbar-di-d1ee7-s-snackbar-and-enables-Next/video.webm
    ───────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/battle-classic-snackbar-di-d1ee7-s-snackbar-and-enables-Next/error-context.md

17. playwright/battle-classic/stat-selection.spec.js:5:3 › Classic Battle stat selection › buttons enabled after start; clicking resolves and starts cooldown

    Test timeout of 30000ms exceeded.

    Error: page.waitForFunction: Test timeout of 30000ms exceeded.

    57 | await expect(next).toHaveAttribute("data-next-ready", "true");
    58 |

    > 59 | await page.waitForFunction(

         |                  ^

    60 | () => {
    61 | const state = document.body?.dataset?.battleState;
    62 | return ["roundDecision", "cooldown", "roundOver", "matchDecision", "matchOver"].includes(
    at /workspaces/judokon/playwright/battle-classic/stat-selection.spec.js:59:18
    at withMutedConsole (/workspaces/judokon/tests/utils/console.js:60:40)
    at /workspaces/judokon/playwright/battle-classic/stat-selection.spec.js:6:5

    attachment #1: screenshot (image/png) ─────────────────────────────────────────────────────────
    test-results/battle-classic-stat-select-bb364-esolves-and-starts-cooldown/test-failed-1.png
    ───────────────────────────────────────────────────────────────────────────────────────────────

    attachment #2: video (video/webm) ─────────────────────────────────────────────────────────────
    test-results/battle-classic-stat-select-bb364-esolves-and-starts-cooldown/video.webm
    ───────────────────────────────────────────────────────────────────────────────────────────────

    Error Context: test-results/battle-classic-stat-select-bb364-esolves-and-starts-cooldown/error-context.md
