# Validation Commands Reference

This document serves as the single source of truth for all validation commands used in the JU-DO-KON! project. Different audiences may use subsets of these commands based on their needs.

## Core Validation Suite

These commands must be run before any commit to ensure code quality and prevent regressions:

### 1. Code Formatting

```bash
npx prettier . --check        # Check formatting compliance
npx prettier . --write        # Auto-fix formatting issues
```

**Purpose:** Ensures consistent code style across the entire codebase.  
**When to use:** Before every commit; auto-fix available.

### 2. Linting

```bash
npx eslint .                  # Check for code quality issues
npx eslint . --fix            # Auto-fix linting issues where possible
```

**Purpose:** Catches potential bugs, enforces coding standards, and improves code quality.  
**When to use:** Before every commit; auto-fix available for many issues.

### 3. Documentation Validation

```bash
npm run check:jsdoc           # Verify JSDoc compliance
npm run check:jsdoc:fix       # Auto-fix JSDoc issues
```

**Purpose:** Ensures all exported functions have proper JSDoc with @pseudocode blocks.  
**When to use:** When adding/modifying public functions; before commit.

### 4. Unit Tests

```bash
npx vitest run                # Run all unit tests
npm run test:style            # Run style-specific tests on demand
```

**Purpose:** Validates core functionality and prevents regressions.  
**When to use:** Before every commit; after any logic changes.

### 5. Integration Tests

```bash
npx playwright test           # Run end-to-end UI tests
```

**Purpose:** Validates user workflows and UI functionality.  
**When to use:** Before every commit; especially after UI changes.

### 6. Accessibility & Contrast

```bash
npm run check:contrast        # Verify color contrast compliance
```

**Purpose:** Ensures accessibility standards are met.  
**When to use:** After UI/styling changes; before commit.

### 7. RAG System Validation

```bash
npm run rag:validate          # RAG preflight + evaluator + JSON + hot-path checks
```

**Purpose:** Validates RAG system integrity and performance.  
**When to use:** After documentation changes; before commit.

## Command Combinations

### Quick Check (One-liner)

```bash
npm run check:jsdoc && npx prettier . --check && npx eslint . && npx vitest run && npx playwright test && npm run check:contrast
```

### Full Validation Suite (Including RAG)

```bash
npm run check:jsdoc && npx prettier . --check && npx eslint . && npx vitest run && npx playwright test && npm run check:contrast && npm run rag:validate
```

## Advanced Quality Verification

### Unit Test Quality Verification

```bash
# Check for anti-patterns in unit tests
echo "Checking unit test patterns..."
grep -r "dispatchEvent\|createEvent" tests/ && echo "❌ Found synthetic events" || echo "✅ No synthetic events"
grep -r "console\.(warn\|error)" tests/ | grep -v "tests/utils/console.js" && echo "❌ Found unsilenced console" || echo "✅ Console discipline maintained"
grep -r "setTimeout\|setInterval" tests/ | grep -v "fake\|mock" && echo "❌ Found real timers" || echo "✅ Timer discipline maintained"
```

### Playwright Test Quality Verification

```bash
# Check for anti-patterns in Playwright tests
echo "Checking Playwright test patterns..."
grep -r "waitForTimeout\|setTimeout" playwright/ && echo "❌ Found hardcoded waits" || echo "✅ No hardcoded timeouts"
grep -r "page\.evaluate.*DOM\|innerHTML\|appendChild" playwright/ && echo "❌ Found DOM manipulation" || echo "✅ No DOM manipulation"
echo "Semantic selectors count:" && grep -r "data-testid\|role=\|getByLabel" playwright/ | wc -l
```

### Hot Path Validation

```bash
# Detect dynamic imports in performance-critical paths
grep -RIn "await import\(" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle 2>/dev/null \
  && echo "❌ Found dynamic import in hot path" && exit 1 || echo "✅ No dynamic imports in hot paths"

# Check for unsilenced console output in tests
grep -RInE "console\.(warn|error)\(" tests | grep -v "tests/utils/console.js" \
  && echo "❌ Unsilenced console found" && exit 1 || echo "✅ Console discipline maintained"
```

## Audience-Specific Command Subsets

### For Human Contributors (README/CONTRIBUTING)

**Minimum required:** formatting, linting, JSDoc, unit tests, Playwright tests, contrast

```bash
npm run check:jsdoc && npx prettier . --check && npx eslint . && npx vitest run && npx playwright test && npm run check:contrast
```

### For AI Agents (AGENTS.md)

**Full suite including:** all core validation + quality verification + hot path checks

```bash
# Core validation
npx prettier . --check && npx eslint . && npm run check:jsdoc && npx vitest run && npx playwright test && npm run check:contrast

# Quality verification
npm run rag:validate

# Hot path validation
grep -RIn "await import\(" src/helpers/classicBattle src/helpers/battleEngineFacade.js src/helpers/battle 2>/dev/null && echo "Found dynamic import in hot path" && exit 1 || true
```

## Troubleshooting

### Common Issues

- **Prettier fails:** Run `npx prettier . --write` to auto-fix
- **ESLint fails:** Run `npx eslint . --fix` for auto-fixable issues
- **Playwright fails:** Ensure test server is running on localhost:5000 (`npm start`)
- **Tests fail with localStorage:** Clear browser localStorage manually
- **RAG validation fails:** Run `npm run rag:prepare:models` to hydrate offline models

### Performance Tips

- Run tests in parallel when possible
- Use `npm run test:style` only when needed (not in main validation flow)
- For CI environments, ensure offline RAG models are pre-hydrated

---

_This document is the canonical reference for validation commands. Update this file when adding new validation requirements, then update references in README.md, CONTRIBUTING.md, and AGENTS.md as needed._
