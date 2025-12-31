# Playwright Test Failures & Resolutions

**Last Updated**: December 31, 2025  
**Project**: JU-DO-KON! (JavaScript/Node.js)  
**Playwright Version**: @playwright/test v1.56.1  
**Test Framework**: @playwright/test (JavaScript)

This document logs significant Playwright test failures, their root causes, and resolutions implemented in the JU-DO-KON! project. It serves as a historical reference for E2E test debugging and maintenance.

---

## ⚠️ DOCUMENT STATUS: CONTENT DEPRECATED

**Critical Issue**: The original content in this file described **Python-based Playwright tests** (with references to `.py` files, `playwright_controller.py`, `WebSurfer`, pytest patterns, Python async/await) which are **NOT applicable** to this JavaScript/Node.js project.

**Actual Project Context:**
- **Language**: JavaScript/Node.js (NOT Python)
- **Test Framework**: @playwright/test v1.56.1 (NOT pytest-playwright)
- **Test Location**: `playwright/` directory (`.spec.js` files, NOT `.py` files)
- **Unit Test Framework**: Vitest v3.2.4
- **Key Test Suites**: 
  - `playwright/battle-classic/` - Classic battle mode E2E tests (30+ test files)
  - `playwright/battle-cli-*.spec.js` - CLI battle mode tests
  - Various feature-specific tests: `homepage.spec.js`, `settings.spec.js`, `tooltip.spec.js`, etc.

**For Current Test Issues**, refer to:
- [TEST_INVESTIGATION_SUMMARY.md](./TEST_INVESTIGATION_SUMMARY.md) - Recent battle-classic test investigation
- GitHub Actions workflows - Live E2E test reports (`.github/workflows/`)
- [playwright/README.md](./playwright/README.md) - Playwright test suite documentation
- Individual test files for specific failure contexts and inline comments

---

## Legacy Content Removed

The original Python-based entries (covering CLI commands, WebSurfer, playwright_controller.py, etc.) have been removed as they reference a completely different technology stack.

If you need to reference the old content, it's available in git history:
```bash
git log --all --full-history -- playwrightTestFailures.md
```

---

## Template for Future JavaScript Test Failures

When documenting new Playwright test failures in this JavaScript project, use this template:

### Failure: [Test Name] - [Brief Description]

**Test File**: `playwright/path/to/test.spec.js`  
**Date Identified**: YYYY-MM-DD  
**Date Resolved**: YYYY-MM-DD (or "Ongoing")  
**Status**: 🔴 Unresolved | 🟡 In Progress | 🟢 Resolved

**Problem:**
Clear description of the test failure, including:
- Error messages and stack traces
- Symptoms observed during test execution
- Frequency (intermittent vs consistent)
- Affected test scenarios

**Root Cause:**
Identified root cause with specific code references:
- File: `src/path/to/file.js` (line numbers)
- Component/function involved
- Why the failure occurs

**Resolution/Workaround:**
Steps taken to resolve:
```javascript
// Example code fix
await page.locator('#element').waitFor({ state: 'visible' });
await page.locator('#element').click();
```

**Relevant Files/PRs:**
- Source file: `src/file.js`
- Test file: `playwright/test.spec.js`
- PR: #123 (if applicable)
- Commit: abc123def

---

## Known Patterns & Best Practices

### Pattern: State Machine Timing Issues
**Applies to**: `playwright/battle-classic/` tests

**Symptoms**:
- Tests timeout waiting for specific battle states
- State transitions happen faster than expected
- `waitForBattleState()` helper times out

**Common Causes**:
- Race conditions in state machine transitions
- Tests expecting intermediate states that complete instantly
- Auto-advance features triggering faster than test expectations

**Best Practice**:
```javascript
// ❌ Bad: Wait for single state that might be skipped
await waitForBattleState('cooldown');

// ✅ Good: Accept multiple valid states
await waitForBattleState(['cooldown', 'roundOver', 'waitingForPlayerAction']);
```

### Pattern: Element Visibility & Interaction
**Applies to**: All Playwright tests

**Symptoms**:
- "Element not found" despite being visible
- Clicks/interactions fail intermittently
- "Element is not clickable" errors

**Best Practice**:
```javascript
// ❌ Bad: No explicit waiting
await page.click('#button');

// ✅ Good: Use locator with built-in waiting
const button = page.locator('#button');
await button.waitFor({ state: 'visible' });
await button.click();

// ✅ Better: Playwright auto-waits with locators
await page.locator('#button').click(); // Auto-waits for actionability
```

### Pattern: Snackbar/Notification Message Verification
**Applies to**: Battle tests with UI feedback

**Best Practice**:
```javascript
// Wait for specific message in snackbar
const snackbar = page.locator('[data-testid="snackbar"]');
await expect(snackbar).toContainText('Expected message', { timeout: 5000 });

// For sequential messages
await expect(snackbar).toContainText('First message');
await page.waitForTimeout(100); // Brief pause for transition
await expect(snackbar).toContainText('Second message');
```

---

## Contributing

When documenting new test failures:

1. **Use the template above** with all sections filled in
2. **Include specific details**: Actual error messages, stack traces, file paths
3. **Add code examples**: Show the fix or workaround with real code
4. **Link to PRs/commits**: Provide git references for traceability
5. **Update status**: Mark as resolved once fixed, keep for reference
6. **Remove when obsolete**: Archive old entries that are no longer relevant

For questions about test failures:
- [AGENTS.md](./AGENTS.md) - Testing standards and patterns (Section: Playwright Test Quality Standards)
- [docs/TESTING_ARCHITECTURE.md](./docs/TESTING_ARCHITECTURE.md) - Test architecture overview
- [tests/battles-regressions/README.md](./tests/battles-regressions/README.md) - Battle test documentation