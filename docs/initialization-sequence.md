# Classic Battle Initialization Sequence

## Overview

The Classic Battle page (`src/pages/battleClassic.html`) follows a **5-phase initialization sequence** designed to prevent event handler timing issues. This document provides a quick reference for developers and AI agents working with the initialization code.

## Critical Bug Context

**Historical Issue**: The quit button event handler was being lost during initialization because:

1. Handler was attached to the button element in Phase 2
2. Button element was **replaced** during Phase 5 (via `resetQuitButton()`)
3. Handler attached to the old element was lost with the old element

**Solution**: Move `wireControlButtons()` to **after** Phase 5, so handlers are attached to the **final** button instances that won't be replaced.

**Reference**: See [quitFlowIssue.md](/workspaces/judokon/quitFlowIssue.md) for detailed bug report and investigation.

## Phase Sequence

```
┌─────────────────────────────────────────────────────────────┐
│ Phase 1: Utilities                                          │
│ - Setup scheduler (for animations, timers)                 │
│ - Expose test APIs (__battleInitComplete, etc.)            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 2: UI Setup                                           │
│ - Initialize battle state badge                            │
│ - Load feature flags                                        │
│ - Setup scoreboard (placeholder timer controls)            │
│ - Setup initial UI (score display cleanup)                 │
│ ⚠️ DOM REPLACEMENT: Score display innerHTML modified       │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 3: Battle Engine                                      │
│ - Create battle store (game state management)              │
│ - Initialize battle engine                                 │
│ - Setup orchestrator                                        │
│ - Expose battleStore globally (window.battleStore)         │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 4: Event Handlers                                     │
│ - Wire global event handlers                               │
│ - Wire card-related events                                 │
│ - Register round UI event handlers (roundStarted,          │
│   round.start) for snackbar dismissal                      │
│ ⚠️ CRITICAL: bindRoundUIEventHandlersDynamic() must be    │
│   called here to prevent snackbars persisting across       │
│   rounds (bootstrap.js line 79)                            │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ ⚡ CRITICAL TIMING: Wire Stat Buttons BEFORE Match Start   │
│ wireExistingStatButtons(store)                             │
│ - Required for gameplay (first round needs handlers)       │
│ - Buttons not replaced during match start                  │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Phase 5: Match Start                                        │
│ - Initialize round selection modal                         │
│ - Dispatch game:reset-ui event                             │
│ ⚠️ DOM REPLACEMENT: Control buttons replaced here!        │
│   - resetQuitButton() replaces quit button                 │
│   - resetNextButton() replaces next button                 │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ ⚡ CRITICAL TIMING: Wire Control Buttons AFTER Match Start │
│ wireControlButtons(store)                                  │
│ - Attaches handlers to FINAL button instances             │
│ - Buttons won't be replaced after this point              │
│ - Prevents handler loss bug                               │
└─────────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────────┐
│ Post-Initialization                                         │
│ - Set __battleInitComplete = true                          │
│ - Ready for user interaction                               │
└─────────────────────────────────────────────────────────────┘
```

## Critical Timing Dependencies

### ✅ Wire BEFORE Match Start

- **Stat buttons** (`wireExistingStatButtons`)
- **Reason**: Required for gameplay - first round needs stat selection handlers
- **Safe because**: Stat buttons are not replaced during `initializeMatchStart()`

### ✅ Wire AFTER Match Start

- **Control buttons** (`wireControlButtons` - Quit, Replay, Next, Home)
- **Reason**: Prevents DOM replacement issues
- **Safe because**: Control buttons ARE replaced during `initializeMatchStart()`
- **Solution**: Wire handlers to final instances after replacement

## Button Replacement Behavior

### Buttons That Get Replaced

| Button       | Replaced By             | When          | Why                                 |
| ------------ | ----------------------- | ------------- | ----------------------------------- |
| Quit         | `resetQuitButton()`     | Phase 5       | Clear event listeners               |
| Next         | `resetNextButton()`     | Phase 5       | Clear event listeners, set disabled |
| Stat buttons | `createStatButtonsUI()` | During rounds | Regenerate for each round           |

### Buttons That Don't Get Replaced

| Button | Behavior                                                   |
| ------ | ---------------------------------------------------------- |
| Replay | Not replaced during init (may be replaced during gameplay) |
| Home   | Not replaced (anchor link, not button)                     |

### Score Display

- **Container**: NOT replaced (same element instance)
- **innerHTML**: IS modified (whitespace cleanup)
- **Impact**: Container element identity preserved, content changed

## Event Delegation Pattern

**Stat Buttons**: Use event delegation to avoid handler loss

- Handler attached to **container** (`#stat-buttons`)
- Individual button clicks bubble to container handler
- Pattern: `registerStatButtonClickHandler(container, store)`
- Marker: `container.__classicBattleStatHandler = true`

**Control Buttons**: Use direct attachment after replacement

- Handlers attached directly to each button
- Timing ensures buttons are final instances
- Markers: `button.__controlBound = true`

## Snackbar Dismissal on Round Events

**Critical Bug Fix**: Snackbars must be dismissed when advancing to the next round to prevent visual clutter and user confusion.

### Problem

Without proper event handler registration, snackbars (countdown timers, "Opponent is choosing...", "You picked: X") would persist across rounds, stacking up and confusing users about the current game state.

### Solution

The `bindRoundUIEventHandlersDynamic()` function (from `src/helpers/classicBattle/roundUI.js`) registers event handlers that automatically dismiss snackbars when the `round.start` event is emitted.

**Registration Location**:

- **Classic Battle**: `src/helpers/classicBattle/bootstrap.js` line 79 (in `startCallback`)
- **CLI Battle**: `src/pages/battleCLI/init.js` line 3308 (in `wireEvents`)

**Event Handlers Registered**:

- `round.start` → Dismisses countdown snackbar + opponent snackbar
- `roundStarted` → Updates UI for new round

**Protected Against Duplicates**: Uses WeakSet guard to prevent duplicate registration if called multiple times.

**Test Coverage**:

- `tests/helpers/classicBattle/bootstrap-event-handlers.test.js` - Verifies handler registration
- `tests/helpers/classicBattle/snackbar-dismissal-events.test.js` - Tests event flow

**Validation**:

```bash
# Verify handler registration is present
grep -n "bindRoundUIEventHandlersDynamic" src/helpers/classicBattle/bootstrap.js src/pages/battleCLI/init.js
```

## Testing

### Regression Tests

**File**: `tests/classicBattle/element-identity.test.js`

Tests verify:

- ✅ Control buttons ARE replaced during initialization
- ✅ Handlers ARE attached to final instances (after replacement)
- ✅ Stat buttons use event delegation pattern
- ✅ Score display container identity is preserved
- ✅ Handler functionality works (not just markers)

**File**: `tests/classicBattle/quit-flow.test.js`

Tests verify:

- ✅ Quit button element identity changes during init
- ✅ Handler is attached to final quit button instance
- ✅ Quit confirmation modal appears correctly
- ✅ Full quit flow works end-to-end

### Running Tests

```bash
# Run element identity tests
npx vitest run tests/classicBattle/element-identity.test.js

# Run quit flow test
npx vitest run tests/classicBattle/quit-flow.test.js

# Run both timing assertion tests
npx vitest run tests/classicBattle/quit-flow.test.js tests/classicBattle/element-identity.test.js
```

## AI Agent Guidelines

### DO ✅

- **Preserve initialization order** - Phases 1-5 must run in sequence
- **Keep wireControlButtons() AFTER initializeMatchStart()** - Critical for fix
- **Keep wireExistingStatButtons() BEFORE initializeMatchStart()** - Required for gameplay
- **Add comments** when modifying initialization sequence
- **Run timing tests** after any initialization changes

### DON'T ❌

- **Move wireControlButtons() before Phase 5** - Will break the fix
- **Move wireExistingStatButtons() after Phase 5** - Will break stat selection
- **Remove timing assertions from tests** - Prevents regression detection
- **Add await import() in hot paths** - See AGENTS.md import policy

### Validation Command

```bash
# Verify initialization order is correct (from AGENTS.md)
grep -A 20 "async function init()" src/pages/battleClassic.init.js | \
  grep -E "wireControlButtons|wireExistingStatButtons|initializeMatchStart"

# Expected output:
# wireExistingStatButtons(store);  ← BEFORE match start
# await initializeMatchStart(store);
# wireControlButtons(store);       ← AFTER match start
```

## Implementation Reference

### Source Files

| File                                     | Description                                                                            |
| ---------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/pages/battleClassic.init.js`        | Main initialization orchestrator (lines 1430-1770)                                     |
| `src/helpers/classicBattle/uiHelpers.js` | Button reset functions: `resetQuitButton()` (line 991), `resetNextButton()` (line 957) |
| `src/helpers/classicBattle/uiHelpers.js` | Event delegation: `registerStatButtonClickHandler()` (line 888)                        |

### Key Functions

```javascript
// Phase orchestration
export async function init() {
  /* ... */
}
async function initializePhase1_Utilities() {
  /* ... */
}
async function initializePhase2_UI() {
  /* ... */
}
async function initializePhase3_BattleEngine(store) {
  /* ... */
}
async function initializePhase4_EventHandlers(store) {
  /* ... */
}
async function initializeMatchStart(store) {
  /* ... */
}

// Button wiring
function wireControlButtons(store) {
  /* ... */
}
function wireExistingStatButtons(store) {
  /* ... */
}

// Button replacement (called via game:reset-ui event during Phase 5)
export function resetQuitButton() {
  /* ... */
}
export function resetNextButton() {
  /* ... */
}
```

## Related Documentation

- [AGENTS.md](/workspaces/judokon/AGENTS.md) - AI agent development guidelines
- [quitFlowIssue.md](/workspaces/judokon/quitFlowIssue.md) - Detailed bug report and investigation
- [PRD: Development Standards](/workspaces/judokon/design/productRequirementsDocuments/prdDevelopmentStandards.md) - Validation commands
- [PRD: Testing Standards](/workspaces/judokon/design/productRequirementsDocuments/prdTestingStandards.md) - Test quality standards

## Changelog

- **January 2026**: Converted game to turn-based flow — removed countdown/auto-select timers from stat selection in both Classic Battle and CLI Battle modes. The `roundSelect` state now waits indefinitely for player input. `initTurnBasedWait()` replaces timer-based cooldown setup in Classic Battle; `startSelectionCountdown(30)` call removed from CLI `updateUiForState("roundSelect")`.
- **January 6, 2026**: Added documentation for snackbar dismissal fix (bindRoundUIEventHandlersDynamic)
- **December 31, 2025**: Initial documentation created
- **January 2025**: Bug fix implemented (moved wireControlButtons to after Phase 5)
- **December 31, 2025**: Timing assertions added to tests

---

**Maintainer Note**: This document should be updated when:

- Initialization sequence changes (add/remove/reorder phases)
- New buttons are added that get replaced
- Event delegation patterns change
- Test suite expands with new timing assertions
