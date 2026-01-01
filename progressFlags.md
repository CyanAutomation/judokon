# Verification Update: opponentDelay.test.js Report

**Date**: 2025-12-26
**Verifier**: Codex (GPT-5)

This file replaces the earlier analysis with a verified, code-based review. It distinguishes what is confirmed in the repo from what is speculative or incorrect.

---

## ✅ Verified Facts (from repo state)

- **Test status**: `tests/helpers/classicBattle/opponentDelay.test.js` is currently **not skipped** and uses `it(...)` (confirmed in the file).
- **Commit history (confirmed)**:
  - `1df559e2b` — unskipped the test and removed the CooldownRenderer + feature flag mocks.
  - `dc3d9b9f6` — introduced the skip with a FIXME comment.
  - `d4d17977a` — added CooldownRenderer mocks to the test.
  - `634259ee2` — added snackbar suppression behavior (per commit message and file changes).
  - `73f4e8a82` — CooldownRenderer prompt-wait queue changes.
- **Opponent prompt behavior in current code**:
  - `src/helpers/classicBattle/uiEventHandlers.js` shows the opponent prompt **immediately** on `statSelected` (it does not wait for the delay to show the message; it only delays the prompt-ready notification).
  - `src/helpers/classicBattle/opponentPromptTracker.js` tracks prompt timestamps and defines a default minimum prompt duration (`DEFAULT_MIN_PROMPT_DURATION_MS = 600`).
  - `src/helpers/CooldownRenderer.js` suppresses countdown snackbar rendering when the opponent prompt window is active or when the battle state is in selection/decision phases.
- **Opponent delay default**: `src/helpers/classicBattle/snackbar.js` defaults `opponentDelayMs` to **500ms** and exposes `getOpponentDelay()` / `setOpponentDelay()`.

---

## ❌ Incorrect or Unsupported Claims in the Earlier Report

- **"Cooldown immediately overrides the opponent prompt"** is **not supported** by current code. The opponent prompt is shown immediately on `statSelected`, and cooldown snackbar rendering is suppressed during the opponent prompt window.
- **"Commit 634259ee2 added i18n for ui.nextRoundIn"** is **incorrect**. The commit added snackbar suppression and test updates; there is no evidence it introduced the translation.
- **"The fix only changed the test to avoid the race"** is **not supported**. The test unskip removed mocks and relied on current runtime logic, but the underlying code already includes prompt tracking and cooldown suppression that mitigate the described race.

---

## Current Code-Based Behavior (Expected)

Based on the current implementation:

1. `handleStatSelection(...)` emits `statSelected`.
2. `uiEventHandlers` immediately displays the opponent prompt (via `updateSnackbar` when available).
3. Prompt timestamp is recorded immediately (notification may be delayed).
4. Cooldown countdown rendering is **suppressed** while the prompt window is active.

This sequence means the cooldown snackbar should not "win" over the opponent prompt in the typical flow.

---

## Gaps / Unverified Areas

- **Runtime confirmation**: This review is code-based; a runtime reproduction was not executed.
- **Test assertions**: The test asserts calls to `showSnackbar`, but the UI handler **prefers `updateSnackbar`** if available. With the current mocks, this mismatch can produce false negatives or false positives depending on mock wiring.

---

## Opportunities for Improvement

1.  **Align the test with the real UI path**
    - Update `tests/helpers/classicBattle/opponentDelay.test.js` to assert `updateSnackbar` (or mock `updateSnackbar` to call `showSnackbar`).

2.  **Make opponent delay observable in tests**
    - Do not mock `getOpponentDelay()` to `0` unless the test explicitly targets the "no-delay" branch.

3.  **Add a targeted integration test**
    - Verify the sequence: opponent prompt shows → cooldown countdown suppressed for `DEFAULT_MIN_PROMPT_DURATION_MS` → countdown starts.

4.  **Document the prompt window contract**
    - Add short notes in `CooldownRenderer.js` or the test explaining how prompt timestamps suppress the cooldown snackbar.

---

## Current Status (2025-12-30)

The "Opportunities for Improvement" listed above are currently outstanding actions. The identified gaps and potential test misalignments should be addressed to fully validate the opponent delay behavior.

---

## Conclusion

The earlier report overstated the likelihood of a persistent race condition. Current code already provides prompt tracking and cooldown suppression that directly address the claimed issue. The primary risk now is **test misalignment** (asserting `showSnackbar` when the UI handler uses `updateSnackbar`). A small test adjustment and a focused integration test would provide the strongest validation.
