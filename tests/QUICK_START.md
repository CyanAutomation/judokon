# Quick Test Groups Reference for AI Agents

**Purpose**: Enable targeted test execution instead of running the full suite (403+ tests).

**When to use**: When modifying specific files or features, run only relevant test groups for faster feedback.

---

## 🎯 Running Targeted Tests

### By Feature Domain

Run tests organized by major feature areas:

```bash
npm run test:battles          # Battle system tests (Classic + CLI modes)
npm run test:components       # UI component tests (cards, scoreboard, modal)
npm run test:pages            # Page initialization tests (settings, random, etc.)
npm run test:helpers          # Core utility tests (excludes domain-specific)
npm run test:data             # Data validation & configuration tests
npm run test:integration      # Cross-module integration tests
npm run test:accessibility    # Accessibility & contrast tests
npm run test:utils            # Test utility validation
```

### By Specific Area

Run tests for individual components or features:

```bash
# Battle Tests
npm run test:battles:classic  # Classic Battle mode only (29 tests)
npm run test:battles:cli      # CLI Battle mode only (29 tests)
npm run test:battles:shared   # Shared battle components (scoreboard)

# Component Tests
npm run test:components:cards      # Card rendering & accessibility
npm run test:components:scoreboard # Scoreboard component & helpers
npm run test:components:modal      # Modal component tests

# Page Tests
npm run test:pages:settings   # Settings page + helpers
npm run test:pages:random     # Random judoka page tests

# Helper Tests
npm run test:helpers:timers   # Timer utilities (TimerController, etc.)
```

### By Test Type

```bash
npm run test:integration      # Integration tests only
npm run test:accessibility    # Accessibility tests only
npm run test:utils            # Test utility validation
npm run test:style            # Style-related tests (separate config)
```

---

## 🗺️ Decision Tree for AI Agents

**Use this flowchart to determine which test group to run:**

### 1. Modified a Battle Page?

- **`src/pages/battleClassic.html`** → Run `npm run test:battles:classic`
- **`src/pages/battleCLI.html`** → Run `npm run test:battles:cli`
- **Battle engine changes** → Run `npm run test:battles`

### 2. Modified a UI Component?

- **`src/components/Scoreboard*.js`** → Run `npm run test:components:scoreboard`
- **`src/components/Modal.js`** → Run `npm run test:components:modal`
- **`src/helpers/cardRender.js` or `cardBuilder.js`** → Run `npm run test:components:cards`
- **Any component** → Run `npm run test:components`

### 3. Modified a Page?

- **`src/pages/settings.html`** or `src/helpers/settingsPage.js` → Run `npm run test:pages:settings`
- **`src/helpers/randomJudokaPage*.js`** → Run `npm run test:pages:random`
- **Any page** → Run `npm run test:pages`

### 4. Modified a Helper Utility?

- **`src/helpers/TimerController.js`** or timer-related → Run `npm run test:helpers:timers`
- **Any other helper** → Run `npm run test:helpers`

### 5. Modified Data or Config?

- **`src/data/judoka.json`** or schema files → Run `npm run test:data`
- **`src/config/*.js`** → Run `npm run test:data`

### 6. Modified Test Utilities?

- **`tests/utils/*.js`** or `tests/helpers/integrationHarness.js` → Run `npm run test:utils`

### 7. Cross-Cutting Changes?

- **Multiple domains affected** → Run relevant domain groups (e.g., `npm run test:components && npm run test:pages`)
- **Before PR submission** → Run `npm run test:ci` (full suite)

---

## 📊 File-to-Test-Group Mapping

Quick reference for common file modifications:

| File Changed                     | Test Group             | Command                              |
| -------------------------------- | ---------------------- | ------------------------------------ |
| `src/components/Scoreboard.js`   | Components: Scoreboard | `npm run test:components:scoreboard` |
| `src/helpers/cardRender.js`      | Components: Cards      | `npm run test:components:cards`      |
| `src/pages/settings.html`        | Pages: Settings        | `npm run test:pages:settings`        |
| `src/helpers/TimerController.js` | Helpers: Timers        | `npm run test:helpers:timers`        |
| `src/pages/battleClassic.html`   | Battles: Classic       | `npm run test:battles:classic`       |
| `src/pages/battleCLI.html`       | Battles: CLI           | `npm run test:battles:cli`           |
| `src/helpers/BattleEngine.js`    | Battles: All           | `npm run test:battles`               |
| `src/data/judoka.json`           | Data Validation        | `npm run test:data`                  |
| `src/helpers/settingsStorage.js` | Pages: Settings        | `npm run test:pages:settings`        |
| `tests/utils/console.js`         | Test Utils             | `npm run test:utils`                 |

---

## ⚡ Performance Benefits

**Running targeted test groups vs full suite:**

| Scope                     | Tests | Time  | Use Case                                |
| ------------------------- | ----- | ----- | --------------------------------------- |
| **Full Suite**            | 403+  | ~40s  | Before PR submission, major refactoring |
| **test:battles**          | ~60   | ~8s   | Battle system changes                   |
| **test:battles:classic**  | ~29   | ~4s   | Classic battle changes only             |
| **test:components**       | ~30   | ~3s   | Component modifications                 |
| **test:components:cards** | ~15   | ~1.5s | Card-specific changes                   |
| **test:helpers:timers**   | ~10   | ~1s   | Timer utility changes                   |
| **test:data**             | ~6    | <1s   | Data validation changes                 |

**Speed improvement: 10-40x faster feedback for targeted changes**

---

## 🔄 Common Workflows

### Workflow 1: Fixing a Bug in Classic Battle

```bash
# 1. Run relevant tests to confirm bug
npm run test:battles:classic

# 2. Make fix to src/helpers/classicBattle/statButtons.js

# 3. Run tests again to verify fix
npm run test:battles:classic

# 4. Before committing, run full battle suite
npm run test:battles
```

### Workflow 2: Adding a New Component Feature

```bash
# 1. Run component tests to understand current behavior
npm run test:components:modal

# 2. Add new feature to src/components/Modal.js
# 3. Add new tests to tests/components/Modal.test.js

# 4. Run tests to verify new feature
npm run test:components:modal

# 5. If component affects pages, run page tests
npm run test:pages
```

### Workflow 3: Refactoring Helper Utilities

```bash
# 1. Run helper tests to establish baseline
npm run test:helpers:timers

# 2. Refactor src/helpers/TimerController.js

# 3. Run tests to verify no regression
npm run test:helpers:timers

# 4. Run integration tests to verify system behavior
npm run test:integration
```

### Workflow 4: Updating Data Schemas

```bash
# 1. Modify src/data/judoka.json

# 2. Run data validation tests
npm run test:data

# 3. If cards use the data, run card tests
npm run test:components:cards

# 4. Run full suite to catch downstream effects
npm run test:ci
```

---

## 🎓 Best Practices

### DO ✅

- **Run targeted tests first** for fast feedback
- **Run full suite before PR** to catch cross-cutting issues
- **Use specific test groups** when you know the affected area
- **Run integration tests** after refactoring multiple modules
- **Document test failures** with specific test names and error messages

### DON'T ❌

- **Don't run full suite** for every small change
- **Don't skip tests** assuming "it's a small change"
- **Don't ignore failing tests** in other groups (they may be related)
- **Don't forget validation** - run `npm run check:jsdoc && npx prettier . --check && npx eslint .`

---

## 🔍 Finding Tests for a File

If you're unsure which test group covers a file:

1. **Check the file path pattern:**
   - `src/components/*.js` → likely in `test:components`
   - `src/helpers/*.js` → likely in `test:helpers` or domain-specific
   - `src/pages/*.html` → likely in `test:pages`

2. **Look for test files with similar names:**

   ```bash
   # Example: Find tests for BattleEngine.js
   find tests -name "*BattleEngine*"
   find tests -name "*battle*" -name "*engine*"
   ```

3. **Check imports in the source file:**
   - If it imports battle utilities → `test:battles`
   - If it imports components → `test:components`
   - If it's imported by pages → `test:pages`

4. **When in doubt, run broader groups:**
   ```bash
   # Start broad, then narrow down
   npm run test:helpers        # All helper tests
   npm run test:components     # All component tests
   ```

---

## 📚 Related Documentation

- **[tests/README.md](./README.md)** - Comprehensive testing guide
- **[AGENTS.md](../AGENTS.md)** - Agent-specific testing standards
- **[docs/TESTING_ARCHITECTURE.md](../docs/TESTING_ARCHITECTURE.md)** - Test architecture details
- **[package.json](../package.json)** - Full list of test scripts

---

## 💡 Tips for AI Agents

1. **Start with the most specific test group** that matches your changes
2. **If tests pass locally but fail in CI**, run `npm run test:ci` to replicate CI environment
3. **Use watch mode** during development: `npm run test:battles:watch`
4. **Check test coverage** after adding features: `npm run test:cov`
5. **Validate all linters pass** before committing: `npm run lint && npm run check:jsdoc`

---

**Last Updated**: December 30, 2025  
**Test Suite Size**: 403+ unit/integration tests + 40 E2E tests  
**Maintenance**: Update this guide when adding new test groups or reorganizing tests
