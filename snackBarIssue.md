# Bug Report: Snackbar Behavior Issues

## 1. Executive Summary

The snackbar notification system is exhibiting buggy behavior, primarily failing to handle concurrent messages as intended. The current implementation causes messages to overwrite each other instead of stacking, leading to a loss of information for the user. Additionally, there are conflicting specifications for the timing of certain messages, causing inconsistent behavior and test failures.

**Root Cause:** The `showSnackbar.js` helper uses `container.replaceChildren(bar)` (line 133), which destroys ALL existing snackbars instead of stacking them. The module maintains only single-bar state (`let bar`), making it impossible to track multiple concurrent messages.

This document outlines the desired behavior, analyzes the root cause of the current issues, proposes a clear path for remediation, and tracks implementation progress.

## 2. Observed Behavior vs. Desired Behavior

### Desired Behavior

The core design intention for the snackbar system is to handle multiple concurrent notifications gracefully by stacking them.

| Aspect | Specification |
|--------|--------------|
| **Stacking** | New messages appear at bottom; older messages pushed upward |
| **Visual Hierarchy** | Older (upper) message has reduced opacity (0.6-0.7) to show it's stale |
| **Maximum Concurrent** | 2 snackbars on screen simultaneously |
| **Overflow Handling** | 3rd message dismisses oldest, shifts remaining messages |
| **Positioning** | Bottom message: full opacity, bottom position<br>Top message: reduced opacity, elevated position |
| **Timing** | Independent 3000ms auto-dismiss timers per message |
| **Animation** | Simultaneous slide + opacity transition when messages shift |
| **Accessibility** | Each snackbar has `role="status"` and `aria-atomic="false"`<br>Newest message announced first |

### Current (Observed) Behavior

| Issue | Description | Evidence |
|-------|-------------|----------|
| **Message Overwriting** | Only one snackbar visible; new calls to `showSnackbar` replace existing | `src/helpers/showSnackbar.js:133` uses `replaceChildren()` |
| **No Stacking Logic** | Module-level state tracks only single bar (`let bar`) | Lines 37-40 in `showSnackbar.js` |
| **CSS Classes Missing** | `.snackbar-top`, `.snackbar-bottom`, `.snackbar-stale` mentioned but not implemented | Not in `src/css/main.css` |
| **Inconsistent Timing** | "Opponent is choosing..." message timing conflict | QA spec vs unit tests in `opponent-message-handler.improved.test.js` |
| **Persistent Messages** | "First to X points wins" blocks subsequent messages in some scenarios | Playwright test failures |

## 3. Root Cause Analysis

### Primary Issue: Stateless Single-Message Architecture

```javascript
// src/helpers/showSnackbar.js (Current Implementation)
// Line 37-40: Module-level state - only ONE snackbar tracked
let bar;                    // Single snackbar reference
let animationListener;      // Single animation listener
let animationTarget;        // Single animation target
let animationToken = 0;     // Token for animation cleanup

// Line 133: THE CRITICAL BUG
container.replaceChildren(bar);  // Destroys ALL existing snackbars!
```

**Why This Fails:**
1. `replaceChildren()` removes all children from the container, including any existing snackbars
2. Module state (`let bar`) can only track one snackbar at a time
3. No queue or array to manage multiple concurrent messages
4. No logic to apply positioning CSS classes (`.snackbar-top`, `.snackbar-bottom`, `.snackbar-stale`)

### Secondary Issue: Conflicting Specifications

| Source | Specification | File |
|--------|--------------|------|
| **QA Spec** | Message appears AFTER delay when flag enabled | `docs/qa/opponent-delay-message.md` |
| **Unit Test** | Message appears IMMEDIATELY when flag enabled | `tests/classicBattle/opponent-message-handler.improved.test.js` |
| **PRD** | "Only one snackbar visible at a time" (conflicts with stacking requirement) | `design/productRequirementsDocuments/prdSnackbar.md` |

### Tertiary Issue: CLI Battle Divergence

The CLI battle mode uses a different implementation (`showHint()` in `battleCLI.html`) that actually DOES support stacking by using `appendChild()` instead of `replaceChildren()`. This inconsistency causes confusion and maintenance burden.

## 4. Files Requiring Modification

### Core Implementation (High Priority)
- [x] **`snackBarIssue.md`** - Update with comprehensive analysis and track implementation progress
- [ ] **`src/helpers/showSnackbar.js`** - Refactor to queue-based Snackbar Manager
- [ ] **`src/css/main.css`** - Add stacking CSS classes (`.snackbar-top`, `.snackbar-bottom`, `.snackbar-stale`)

### CLI Battle Migration (High Priority)
- [ ] **`src/pages/battleCLI.html`** - Replace custom `showHint()` with shared `showSnackbar()`
- [ ] **`playwright/battle-cli-*.spec.js`** - Verify CLI snackbar tests still pass

### Test Updates (High Priority)
- [ ] **`tests/helpers/showSnackbar.test.js`** - Add stacking/queueing tests
- [ ] **`tests/classicBattle/opponent-message-handler.improved.test.js`** - Align with QA spec (message after delay)
- [ ] **New file:** `tests/helpers/showSnackbar.queue.test.js` - Comprehensive queue management tests
- [ ] **`playwright/opponent-choosing.smoke.spec.js`** - Verify E2E behavior matches QA spec

### Documentation Updates (Medium Priority)
- [ ] **`design/productRequirementsDocuments/prdSnackbar.md`** - Update P2 requirement to "max 2 stacked" instead of "one at a time"
- [ ] **`docs/qa/opponent-delay-message.md`** - Verify still accurate after changes

### Optional Enhancements (Low Priority)
- [ ] **`src/helpers/updateSnackbar.js`** - May need updates if manager API changes
- [ ] **Accessibility audit** - Verify ARIA announcements with multiple concurrent messages

## 5. Implementation Plan

### Phase 1: Core Snackbar Manager Refactor
**Goal:** Replace single-message state with queue-based architecture

```javascript
// New state structure in showSnackbar.js
const messageQueue = [];  // Array of { id, text, element, timeoutId }
const MAX_VISIBLE = 2;
let nextId = 0;

function showSnackbar(text) {
  const id = nextId++;
  
  // Remove oldest if at capacity
  if (messageQueue.length >= MAX_VISIBLE) {
    const oldest = messageQueue.shift();
    dismissSnackbar(oldest.id);
  }
  
  // Create new snackbar element
  const element = createSnackbarElement(text, id);
  const timeoutId = setTimeout(() => dismissSnackbar(id), 3000);
  
  messageQueue.push({ id, text, element, timeoutId });
  renderQueue();
}

function renderQueue() {
  messageQueue.forEach((msg, index) => {
    // Apply positioning classes
    if (index === 0 && messageQueue.length > 1) {
      msg.element.classList.add('snackbar-top', 'snackbar-stale');
      msg.element.classList.remove('snackbar-bottom');
    } else {
      msg.element.classList.add('snackbar-bottom');
      msg.element.classList.remove('snackbar-top', 'snackbar-stale');
    }
  });
}
```

### Phase 2: CSS Stacking Styles
```css
.snackbar-top {
  opacity: 0.7;
  transform: translateY(-56px);
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.snackbar-bottom {
  opacity: 1;
  transform: translateY(0);
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.snackbar-stale {
  opacity: 0.6;
}
```

### Phase 3: CLI Battle Migration
Replace custom `showHint()` function in `battleCLI.html` with shared `showSnackbar()` helper.

### Phase 4: Test Updates
- Add queue management tests (2 concurrent, 3rd dismisses oldest, etc.)
- Align opponent message handler tests with QA spec
- Run targeted Playwright tests to verify no regressions

### Phase 5: Documentation Updates
Update PRD and verify QA spec accuracy.

## 6. Implementation Progress Tracking

### Task 1: Update snackBarIssue.md with comprehensive analysis ✅
**Status:** COMPLETE  
**Changes:**
- Added root cause analysis with code references
- Created comparison tables for desired vs current behavior
- Listed all files requiring modification
- Added implementation plan with code examples
- Created progress tracking section

### Task 2: Refactor showSnackbar.js to Snackbar Manager
**Status:** NOT STARTED  
**Validation:** Run `npx vitest run tests/helpers/showSnackbar.test.js`

### Task 3: Add CSS stacking styles
**Status:** NOT STARTED  
**Validation:** Visual inspection + Playwright tests

### Task 4: Update showSnackbar.test.js
**Status:** NOT STARTED  
**Validation:** Run `npx vitest run tests/helpers/showSnackbar.test.js`

### Task 5: Align opponent-message-handler tests with QA spec
**Status:** NOT STARTED  
**Validation:** Run `npx vitest run tests/classicBattle/opponent-message-handler.improved.test.js`

### Task 6: Migrate CLI Battle to shared snackbar manager
**Status:** NOT STARTED  
**Validation:** Run `npx playwright test battle-cli-*.spec.js`

### Task 7: Update PRD documentation
**Status:** NOT STARTED  
**Validation:** Manual review

## 7. Investigation Details from Previous Session

### Changes Made

- **`src/helpers/settingsPage.js`**: Fixed a save status indicator. This is unrelated to the snackbar issue but was part of the previous investigation.
- **`src/helpers/classicBattle/uiEventHandlers.js`**: Logic was modified to try and defer the snackbar message, but this was built on the flawed assumption that `showSnackbar` could handle the complexity.

### Current Test Failures

- **Playwright (Delay Enabled):** The snackbar never appears after the delay.
- **Playwright (Delay Disabled):** The "First to 5 points wins" message persists instead of showing the opponent's choice message.

## 8. Previous Session Investigation Details

### Changes Made

- **`src/helpers/settingsPage.js`**: Fixed a save status indicator. This is unrelated to the snackbar issue but was part of the previous investigation.
- **`src/helpers/classicBattle/uiEventHandlers.js`**: Logic was modified to try and defer the snackbar message, but this was built on the flawed assumption that `showSnackbar` could handle the complexity.

### Current Test Failures

- **Playwright (Delay Enabled):** The snackbar never appears after the delay.
- **Playwright (Delay Disabled):** The "First to 5 points wins" message persists instead of showing the opponent's choice message.

## 9. Technical Design Decisions

### Timing Coordination
**Decision:** Independent timers with 3000ms default  
**Rationale:** Each snackbar auto-dismisses naturally without complex coordination logic

### CLI Battle Divergence
**Decision:** Migrate CLI to use shared snackbar manager  
**Rationale:** Single source of truth, consistent behavior, reduced maintenance burden

### Animation Choreography
**Decision:** Simultaneous slide with opacity transition  
**Rationale:** Smooth visual experience; older message slides up as new message appears

### Accessibility Impact
**Decision:** Add `aria-atomic="false"` and unique `role="status"` per snackbar  
**Rationale:** Prevents screen reader conflicts; newest message announced first

## 10. Success Criteria

- [ ] Maximum 2 snackbars visible simultaneously
- [ ] New messages appear at bottom, older messages pushed up
- [ ] Older (top) message has reduced opacity (0.6-0.7)
- [ ] 3rd message dismisses oldest automatically
- [ ] Each snackbar has independent 3000ms auto-dismiss timer
- [ ] Smooth animations when messages stack/shift
- [ ] All unit tests pass (targeted: `showSnackbar.test.js`, `opponent-message-handler.improved.test.js`)
- [ ] All Playwright tests pass (targeted: CLI battle, opponent choosing)
- [ ] CLI Battle uses shared snackbar manager (no custom `showHint()`)
- [ ] Accessibility: proper ARIA attributes, newest announced first
- [ ] PRD documentation updated to reflect stacking behavior
