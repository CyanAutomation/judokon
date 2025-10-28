# Shared Component Tests - Regression Testing Guide

This directory contains tests for components shared between classic and CLI battle modes.

## Test Organization

- **scoreboard/** - Scoreboard component tests (accessible from original location)
- **modal/** - Modal dialog component tests (accessible from original location)
- **configuration/** - Default configuration tests (accessible from original location)

## Note on Test Location

Tests remain in their original locations to preserve working imports:
- Scoreboard tests: `tests/helpers/scoreboard.*.test.js`
- Modal tests: `tests/components/Modal.dialog.test.js`
- Configuration tests: `tests/config/battleDefaults.test.js`

This centralized directory documents the shared component test organization.

## Running Tests

```bash
# Run all shared component tests
npm run test:battles:shared

# Watch mode during development
npm run test:battles:watch

# Coverage report
npm run test:battles:cov
```

## Test Coverage

- Scoreboard rendering and behavior
- Modal dialog functionality
- Battle configuration defaults

## See Also

- [Main Battle Tests Guide](../README.md)
- [AGENTS.md - Battle Pages Section](../../AGENTS.md)
- [Phase 3 Validation Notes](../../PHASE3_VALIDATION_NOTES.md)
