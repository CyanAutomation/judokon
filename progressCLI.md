Root Cause

   The test failure is caused by test state pollution between test runs.
   Specifically:

     - Module-level state pollution: The currentNextRound and activeCooldownControls 
   variables in roundManager.js were not being reset between tests, causing state from 
   previous tests to leak into subsequent tests.
     - Button DOM state pollution: The Next button's DOM state (data-next-ready attribute 
   and disabled property) was not being reset between tests.
     - Premature ready dispatch: When cooldown starts, the setupOrchestratedReady 
   function's checkImmediate() was immediately calling finalize() because it detected the 
   button as "ready" from a previous test run.

   Fixes Applied

     - Reset module-level cooldown state in _resetForTest():  currentNextRound = null;
       activeCooldownControls = null;
     - Reset Next button DOM state in _resetForTest():  const nextBtn = 
   document.getElementById("next-button");
       if (nextBtn) {
         nextBtn.disabled = true;
         delete nextBtn.dataset.nextReady;
       }
     - Fixed snackbar token assignment (from first investigation):  
   target.dataset.snackbarToken = token;

   Related Fixes

     - All other tests in scheduleNextRound.test.js now pass (6/7 passing)
     - The drift handling tests continue to pass (3/3 passing)

   Remaining Issue

   This specific test still fails because checkImmediate() is calling finalize()
   immediately when the cooldown starts. The exact condition causing this requires
   further investigation with better debugging tools, as console logging is
   suppressed in vitest.