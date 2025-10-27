# Battle Pages Regression Test Suite

Central location for regression tests ensuring stability of JU-DO-KON!'s two critical battle pages:

- `src/pages/battleClassic.html`
- `src/pages/battleCLI.html`

## Quick Start

Run all battle regression tests:

```bash
npm run test:battles
```

Run specific suite:

```bash
npm run test:battles:classic    # Classic Battle tests only
npm run test:battles:cli        # CLI Battle tests only
npm run test:battles:shared     # Shared component tests only
npm run test:battles:watch      # Watch mode during development
npm run test:battles:cov        # With coverage report
```

## Organization

### classic/ - Classic Battle Mode Tests

Tests for `src/pages/battleClassic.html` organized by feature:

- **battle-logic/** - Core game mechanics, timers, state management, scoring
- **components/** - Classic-specific UI components (stat buttons, scoreboard, modals)
- **integration/** - Full game flow and end-to-end scenarios

### cli/ - CLI Battle Mode Tests

Tests for `src/pages/battleCLI.html` organized by feature:

- **keybindings/** - Keyboard shortcuts, hotkeys, input handling
- **display/** - Terminal rendering, verbose mode, scoreboard formatting
- **compatibility/** - Seeds, points-to-win configuration, feature compatibility
- **accessibility/** - Focus management, live regions, contrast compliance

### shared/ - Shared Components

Tests for components used by both battle modes:

- **scoreboard/** - Scoreboard component (used by both modes)
- **modal/** - Modal dialog component
- **configuration/** - Battle configuration and defaults

## Test Coverage Goals

- **Classic Battle:** Core game logic, UI, timer mechanics, accessibility
- **CLI Battle:** Terminal-specific features, formatting, shortcuts, accessibility
- **Shared:** Components used by both modes

## Adding New Tests

When adding tests for battle pages:

1. Determine if it's for Classic, CLI, or Shared
2. Place in appropriate subdirectory
3. Follow naming convention: `<feature>.test.js`
4. Ensure test is included in appropriate regression run

Example:
```bash
# New test for classic battle stat selection
tests/battles-regressions/classic/battle-logic/stat-selection.test.js

# New test for CLI shortcuts
tests/battles-regressions/cli/keybindings/shortcuts.test.js

# New test for scoreboard shared component
tests/battles-regressions/shared/scoreboard/scoreboard-rendering.test.js
```

## Running Specific Test Files

```bash
# Run a specific test file
npx vitest run tests/battles-regressions/classic/battle-logic/bootstrap.test.js

# Run with coverage for specific directory
npx vitest run tests/battles-regressions/cli --coverage

# Watch specific subdirectory
npx vitest tests/battles-regressions/shared --watch
```

## Continuous Integration

These tests run automatically:

- On every PR targeting the battle pages
- Before production deployment
- On schedule (nightly) to catch flaky tests

See AGENTS.md for complete testing guidelines and task contracts.

## Related Documentation

- [AGENTS.md - Battle Pages Regression Testing](../../AGENTS.md#-battle-pages-regression-testing)
- [Unit Test Quality Standards](../../design/productRequirementsDocuments/prdTestingStandards.md)
- [Playwright Test Guide](../../playwright/README.md)
- [Testing Architecture](../TESTING_ARCHITECTURE.md)
