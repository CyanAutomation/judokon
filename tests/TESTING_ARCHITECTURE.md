# Testing Architecture Guidelines

## Overview

This document establishes consistent patterns for testing in the JU-DO-KON! codebase, based on investigation of manual DOM manipulation issues and successful remediation strategies.

## Test Categories

### 1. Unit Tests (Isolated Logic)

**When to use**: Testing pure functions, business logic, utilities
**DOM approach**: Minimal or no DOM manipulation
**Example**: Math calculations, data transformations, validation logic

```javascript
// ✅ Good - Pure function testing
import { calculateScore } from "../src/helpers/scoring.js";

test("calculates score correctly", () => {
  expect(calculateScore(5, 3)).toBe(8);
});
```

### 2. Component Tests (UI Logic)

**When to use**: Testing UI components with minimal DOM requirements
**DOM approach**: Manual DOM creation acceptable for simple cases
**Example**: Button click handlers, form validation

```javascript
// ✅ Acceptable - Simple DOM for component testing
test("button click handler", () => {
  document.body.innerHTML = '<button id="test-btn">Click</button>';
  const btn = document.getElementById("test-btn");
  // Test button behavior
});
```

### 3. Integration Tests (Real HTML Structure)

**When to use**: Testing initialization, complex UI interactions, accessibility
**DOM approach**: Use real HTML files via `createRealHtmlTestEnvironment()`
**Example**: Page initialization, multi-element interactions

```javascript
// ✅ Preferred - Real HTML for integration testing
import { createRealHtmlTestEnvironment } from "../utils/realHtmlTestUtils.js";

test("page initialization", () => {
  const { document, cleanup } = createRealHtmlTestEnvironment();
  // Test with complete HTML structure
  cleanup();
});
```

## Decision Matrix

| Test Scenario   | Manual DOM       | Real HTML    | Rationale                   |
| --------------- | ---------------- | ------------ | --------------------------- |
| Pure functions  | ❌ None          | ❌ None      | No DOM needed               |
| Simple UI logic | ✅ Manual        | ❌ Overkill  | Minimal DOM sufficient      |
| Initialization  | ❌ Inadequate    | ✅ Real HTML | Needs complete structure    |
| Accessibility   | ❌ Missing attrs | ✅ Real HTML | Needs ARIA attributes       |
| Multi-element   | ❌ Incomplete    | ✅ Real HTML | Needs element relationships |

## Anti-Patterns to Avoid

### ❌ Manual DOM for Complex Scenarios

```javascript
// BAD - Manual DOM misses real structure
document.body.innerHTML = '<div id="badge"></div>';
// Missing: attributes, semantic structure, relationships
```

### ❌ Real HTML for Simple Logic

```javascript
// BAD - Overkill for simple function testing
const { document } = createRealHtmlTestEnvironment();
expect(add(2, 3)).toBe(5); // No DOM needed
```

### ❌ Inconsistent Test Setup

```javascript
// BAD - Different setup patterns across similar tests
// Some tests use innerHTML, others use createElement, etc.
```

## Recommended Patterns

### Pattern 1: Utility-Based Real HTML Testing

```javascript
import {
  createRealHtmlTestEnvironment,
  validateRealHtmlStructure
} from "../utils/realHtmlTestUtils.js";

describe("Feature with real HTML", () => {
  let testEnv;

  beforeEach(() => {
    testEnv = createRealHtmlTestEnvironment();
  });

  afterEach(() => {
    testEnv.cleanup();
  });

  test("validates complete structure", () => {
    const validation = validateRealHtmlStructure(testEnv.document);
    expect(validation.hasRequiredElements).toBe(true);
  });
});
```

### Pattern 2: Selective Enhancement

```javascript
// Keep existing manual DOM tests for backward compatibility
// Add enhanced versions using real HTML for better validation

describe("Feature (Manual DOM - Legacy)", () => {
  test("basic functionality", () => {
    document.body.innerHTML = '<div id="element"></div>';
    // Basic test
  });
});

describe("Feature (Real HTML - Enhanced)", () => {
  test("complete validation", () => {
    const { document } = createRealHtmlTestEnvironment();
    // Enhanced test with full structure validation
  });
});
```

### Pattern 3: Test Naming Conventions

```javascript
// Clear naming indicates test approach
describe("Component (Unit)", () => {}); // Pure logic
describe("Component (DOM)", () => {}); // Manual DOM
describe("Component (Integration)", () => {}); // Real HTML
```

## Migration Strategy

### Phase 1: Identify High-Impact Tests

- Tests that validate initialization
- Tests that check accessibility
- Tests that involve multiple DOM elements
- Tests that currently fail due to missing structure

### Phase 2: Create Enhanced Versions

- Use utility functions for easy setup
- Keep original tests for backward compatibility
- Add validation that manual DOM tests miss

### Phase 3: Gradual Adoption

- New tests should follow these patterns
- Existing tests can be enhanced selectively
- Focus on tests that provide most value from real HTML

## Quality Checklist

### For Manual DOM Tests

- [ ] Is the DOM structure minimal and sufficient?
- [ ] Are we testing isolated component logic?
- [ ] Would real HTML add unnecessary complexity?

### For Real HTML Tests

- [ ] Do we need complete page structure?
- [ ] Are we testing initialization or multi-element interactions?
- [ ] Do we need to validate accessibility attributes?
- [ ] Are we testing in the context of the full application?

### For All Tests

- [ ] Is the test approach consistent with similar tests?
- [ ] Does the test validate what it claims to test?
- [ ] Is the setup and teardown appropriate for the test scope?
- [ ] Are we avoiding anti-patterns identified in this guide?

## Tools and Utilities

### Available Utilities

- `createRealHtmlTestEnvironment()` - Set up real HTML testing
- `validateRealHtmlStructure()` - Validate structure completeness
- `compareTestApproaches()` - Compare manual vs real HTML results

### Recommended Libraries

- **JSDOM**: For DOM simulation in Node.js tests
- **Vitest**: Test runner with good DOM support
- **Playwright**: Browser testing for end-to-end validation

## Examples Repository

See the following files for implementation examples:

- `tests/integration/battleClassic.integration.test.js` - Real HTML integration testing
- `tests/integration/manualDomComparison.test.js` - Comparison of approaches
- `tests/classicBattle/opponent-message-handler.simplified.test.js` - Utility usage
- `tests/utils/realHtmlTestUtils.js` - Utility functions

## Conclusion

These patterns provide a framework for making informed decisions about test architecture. The goal is to use the right approach for each scenario while maintaining consistency and avoiding the pitfalls of manual DOM manipulation where it masks real issues.
