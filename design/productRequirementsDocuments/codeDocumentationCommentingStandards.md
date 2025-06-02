# Code Documentation and Commenting Standards

## Problem Statement

Clear and consistent code documentation is essential for maintaining code quality, facilitating collaboration, and enabling fast onboarding of new developers. Without structured documentation and purposeful commentary, codebases become difficult to understand, maintain, and extend over time. Poor documentation leads to reduced development velocity, increased technical debt, and greater risk of introducing defects.

---

## Goals

* **Readability**: Ensure that code is easy to understand through clear documentation and meaningful comments.
* **Maintainability**: Keep documentation accurate and up-to-date alongside code changes.
* **Consistency**: Apply a uniform style and structure for all comments and documentation.
* **Knowledge Transfer**: Enable new developers to comprehend codebase logic and intent quickly.

---

## Standards

### 1. JSDoc Commenting Standards

* Use block comments `/** ... */` for all public functions, classes, and modules.
* Start with a brief, single-sentence summary describing the function’s purpose.
* Document each parameter with `@param`, specifying:

  * Parameter type using `{Type}` syntax.
  * Parameter name.
  * Brief description.
* Document the return value with `@returns`, specifying:

  * Return type.
  * Brief description.
* Indicate optional parameters with square brackets, e.g., `@param {string} [optionalParam]`.
* Mention default values in the parameter description if applicable.
* Always match documentation with the actual function signature.

**Example:**

```javascript
/**
 * Build the card carousel HTML elements.
 * @param {Array<Object>} cards - Array of card data to be displayed.
 * @param {HTMLElement} container - The DOM element where carousel will be injected.
 * @returns {void}
 */
function buildCarousel(cards, container) { ... }
```

### 2. Pseudocode Standards

* Provide high-level pseudocode comments above logical blocks.
* Explain *why* the code is doing something, especially when the reason is not obvious.
* Keep comments clear, concise, and grammatically correct.
* Use an imperative style ("Initialize", "Render", "Handle", etc.).
* Avoid restating what the code already expresses.
* Remove any commented-out code before committing.

**Examples:**

```javascript
// Initialize carousel with card data

// Handle swipe gestures for mobile devices

// Render a placeholder if card data is missing
```

### 3. Language and Style

* Comments must be written in clear, plain English.
* Use proper grammar, spelling, and punctuation.
* Maintain a neutral, light-hearted tone.

---

## Acceptance Criteria

* 100% of exported classes, functions, and modules have structured JSDoc blocks.
* Functions longer than 20 lines include a summary comment unless self-explanatory.
* All public APIs document parameters and return values accurately.
* No commented-out code or obsolete TODOs in the committed code.
* Pull requests must update documentation when function signatures or logic change.

---

## Edge Cases and Failure States

* **Missing Documentation**: Code missing required documentation cannot be merged.
* **Outdated Comments**: PR reviewers must verify that comments and documentation match the current code.
* **Complex Workarounds**: Any workaround or technical debt must include a comment and reference to a tracking issue.

---

## Additional Notes

* Prefer clarity over brevity; a longer, clearer comment is better than a short, confusing one.
* Use standard formats like JSDoc for compatibility with documentation generation tools.
* Self-documenting code is the ideal; comments should supplement, not replace, clear code.

---

*These standards form the baseline for all code written within the Ju-Do-Kon! project to ensure long-term code quality and developer productivity.*
