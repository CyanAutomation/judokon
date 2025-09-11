# Testing Guide

This document provides comprehensive testing strategies, utilities, and best practices for JU-DO-KON!

## Test Suites

### Unit Tests
Run with Vitest:
```bash
npx vitest run
```

### Integration Tests  
Run with Playwright:
```bash
npx playwright test
```

### Style Tests
Run on demand:
```bash
npm run test:style
```

## Playwright Testing

### Stable Readiness Patterns

**Preferred readiness waits:**
- `await page.evaluate(() => window.battleReadyPromise)`: Detect Classic Battle page full initialization
- `await waitForBattleReady(page)`: Helper shortcut for battle readiness
- `await waitForSettingsReady(page)`: Helper shortcut for settings readiness
- `await waitForBattleState(page, "waitingForPlayerAction", 10000)`: Wait for specific machine state

**Avoid brittle patterns:**
- Waiting for header timer element (`#next-round-timer`) visibility at page load
- Targeting initial pre-match countdown (rendered via snackbar, not header timer)

**Recommended state targeting:**
- Wait for selection prompt snackbar (e.g., "Select your move")
- Target `#stat-buttons[data-buttons-ready="true"]` for round start readiness

### Test Helpers
Available in `playwright/fixtures/waits.js`:
- `waitForBattleReady(page)` and `waitForSettingsReady(page)`
- `waitForBattleState(page, state, timeout)`: Rejects if state isn't reached within timeout

### Screenshot Testing

**Storage location:** `playwright/*-snapshots/`

**Skip screenshots locally:**
```bash
SKIP_SCREENSHOTS=true npx playwright test
```

**Update snapshots after UI changes:**
```bash
npx playwright test --update-snapshots
```

## Specialized Testing

### CSS Tooling
Color contrast tests parse custom properties with PostCSS directly, relying on standard CSS tooling instead of bespoke parsers.

### DOM Regression Testing
The test suite includes a DOM regression test (`tests/pages/battleJudoka.dom.test.js`) that:
- Loads `battleJudoka.html`
- Fails if required IDs are missing: `next-button`, `stat-help`, `quit-match-button`, `stat-buttons`

### Timer Testing
Classic Battle timer logic testing covers:
- State snapshots and readiness helpers (`timerUtils.js`)
- Stat-selection fallbacks when timers drift or stall (`autoSelectHandlers.js`)
- Pause/resume flow for modals and tab switches

### Battle Engine Testing
The engine exposes events for testing:
- `roundStarted` → `{ round }`
- `roundEnded` → `{ delta, outcome, matchEnded, playerScore, opponentScore }`
- `timerTick` → `{ remaining, phase: 'round' | 'cooldown' }`
- `matchEnded` → same payload as `roundEnded`
- `error` → `{ message }`

## Skip Button Testing
The game includes a **Skip** button that bypasses current round and cooldown timers. Use it to fast-forward through matches when debugging or running rapid gameplay tests.

## Country Panel Testing
On the Browse Judoka page:
- Country filter panel starts with `hidden` attribute
- When revealed, must include `aria-label="Country filter panel"` for accessibility and Playwright tests
- Country slider loads asynchronously after panel opens

## CLI Testing
CLI-specific tests live in `playwright/battle-cli.spec.js` and verify:
- State badge functionality
- Verbose log behavior
- Keyboard selection flow

## Quality Standards

For comprehensive testing quality standards, including anti-patterns and preferred patterns for both unit and Playwright tests, see:
- [Validation Commands](./validation-commands.md#advanced-quality-verification)
- [AGENTS.md](../AGENTS.md#unit-test-quality-standards) - Unit test standards
- [AGENTS.md](../AGENTS.md#playwright-test-quality-standards) - Playwright test standards

## Related Documentation
- [Testing Modes](./testing-modes.md) - Headless, test mode, and debug configurations
- [Battle CLI Guide](./battle-cli.md) - CLI-specific testing
- [Components](./components.md) - Component testing strategies
- [Validation Commands](./validation-commands.md) - Complete command reference
