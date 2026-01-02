Investigation Summary

   Root Cause

   The opponent choosing snackbar functionality has conflicting specifications:

     - QA Spec (docs/qa/opponent-delay-message.md): When delay is enabled, NO snackbar should
    appear initially, then show "Opponent is choosing..." after the delay
     - Unit Test (tests/classicBattle/opponent-message-handler.improved.test.js): When delay 
   is enabled, show message immediately but delay the "prompt ready" event

   Changes Made

     - File: src/helpers/settingsPage.js
       - Fixed save status indicator to properly set hidden attribute after animation
       - Status: ✅ Working correctly, all settings tests pass
     - File: src/helpers/classicBattle/uiEventHandlers.js
       - Modified opponent message logic to defer showing the message when delay is enabled 
   (lines 327-356)
       - Added snackbar clearing logic when delay is enabled (lines 314-322)
       - Changed to use showSnackbar instead of updateSnackbar for consistency
       - Status: ❌ Tests still failing

   Current Issue

   The statSelected event handler appears not to be firing or is hitting an error
   before showing the snackbar. Both Playwright tests fail:

     - Test 1 (delay enabled): Snackbar never appears after delay
     - Test 2 (delay disabled): "First to 5 points wins" persists instead of showing opponent
    message

   Recommendation

   This issue requires deeper investigation into:

     - Whether the statSelected event is being emitted correctly
     - Whether the event handler is registered properly in the Playwright test environment
     - The unit test expectations need to be updated to match the QA specification
     - There may be a pre-existing bug that was exposed by these changes

   The settings page fix is complete and working. The opponent choosing feature
   needs more investigation to understand why the event flow isn't working in the
   Playwright tests.