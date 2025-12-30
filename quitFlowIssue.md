The quit-flow.test.js failure about quitConfirmButtonPromise being null appears
   to be related to a separate readFileSync externalization issue that affects
   multiple test files (quit-flow.test.js, bootstrap.test.js, end-modal.test.js,
   etc.). This is a known issue that was previously investigated and documented but
   appears to have regressed. This is outside the scope of the original failure
   report which was specifically about clearRoundCounter missing from the mock.