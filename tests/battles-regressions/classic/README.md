# Classic Battle Tests

Tests for `src/pages/battleClassic.html` organized by feature and responsibility.

## Structure

- **battle-logic/** - Core game mechanics, timers, scoring, state management
- **components/** - Classic-specific UI components
- **integration/** - Full game flow and end-to-end test scenarios

## What Gets Tested

### Battle Logic Tests

- Game initialization and bootstrap
- Round selection and validation
- Stat selection mechanics and keyboard shortcuts
- Timer functionality (countdown, auto-advance, cooldown)
- Scoring system and round resolution
- Opponent message handling
- End-of-match modal and win conditions
- Replay functionality
- Feature flag integration

### Component Tests

- Stat buttons and interaction
- Scoreboard rendering and updates
- Modal dialogs and confirmations
- Player info display
- UI state synchronization

### Integration Tests

- Complete game flow from start to finish
- Multiple rounds and match completion
- State persistence and recovery
- Accessibility during gameplay
- Keyboard navigation throughout game

## Running Classic Battle Tests

```bash
# All classic battle tests
npm run test:battles:classic

# Watch mode
npm run test:battles:watch

# Specific test
npx vitest run tests/battles-regressions/classic/battle-logic/bootstrap.test.js

# With coverage
npm run test:battles:cov
```

## Test Requirements

See [AGENTS.md - Battle Pages Regression Testing](../../../AGENTS.md#-battle-pages-regression-testing) for:
- Test quality standards
- Fake timer usage
- Console discipline
- Accessibility testing patterns

## Related Files

- Source: `src/pages/battleClassic.html`
- Main logic: `src/helpers/classicBattle.js`
- E2E tests: `playwright/battle-classic/`
