# Test Value Policy

**Audience**: Human Developers

This guide provides practical advice for writing high-value unit and end-to-end (E2E) tests that meet the quality standards enforced by our automated evaluation system. Adhering to these principles will help you write tests that are clear, robust, and easy to maintain.

---

## The Test Value Rubric

Every test file is scored from 0–10 based on the following five criteria. Aim for a score of 8 or higher.

1.  **Intent Clarity (0–2 pts)**: The test's purpose should be immediately obvious.
2.  **Behavioral Relevance (0–2 pts)**: The test should verify a meaningful aspect of the application's behavior, ideally one linked to a requirement or bug.
3.  **Assertion Quality (0–2 pts)**: The test should make precise, semantic assertions (and for E2E, use robust locators).
4.  **Isolation & Robustness (0–2 pts)**: The test should be self-contained and deterministic (i.e., not flaky).
5.  **Cost vs. Coverage (0–2 pts)**: The test should be as fast and efficient as possible while being effective at finding bugs.

---

## How to Write High-Value Unit Tests: Examples

### 1. Intent Clarity

**Goal**: Make your test's purpose unambiguous.

**High Score (2/2)**: Descriptive title and metadata header.

```javascript
/**
 * Spec-ID: AUTH-001
 * Linked-Req: PRD-4.2 (User Login)
 * Covers: src/helpers/auth.js
 */
import { authenticate } from "../src/helpers/auth";

describe("authenticate", () => {
  it("should return a user object on successful authentication", () => {
    // ...
  });
});
```

**Low Score (0/2)**: Vague title, no metadata.

```javascript
// No header
import { authenticate } from "../src/helpers/auth";

describe("auth test", () => {
  it("works", () => {
    // ...
  });
});
```

### 2. Assertion Quality (Unit Tests)

**Goal**: Use precise assertions that fail with clear error messages.

**High Score (2/2)**: Uses semantic assertions.

```javascript
it("should return the correct user payload", () => {
  const user = { id: 1, name: "Alice" };
  expect(authenticate("valid", "creds")).toEqual(user);
});
```

**Low Score (0/2)**: Relies only on snapshots.

```javascript
it("should return the correct user payload", () => {
  // This is brittle and the intent is not clear.
  expect(authenticate("valid", "creds")).toMatchSnapshot();
});
```

### 3. Isolation & Robustness (Unit Tests)

**Goal**: Ensure your tests are fast, deterministic, and don't rely on external systems.

**High Score (2/2)**: Uses fake timers.

```javascript
it("should time out after 5000ms", () => {
  vi.useFakeTimers();
  myFunctionThatTimesOut();
  vi.advanceTimersByTime(5000);
  expect(onTimeout).toHaveBeenCalled();
});
```

**Low Score (0/2)**: Uses real timers.

```javascript
it("should time out after 5s", async () => {
  // This test will take 5 seconds to run!
  myFunctionThatTimesOut();
  await new Promise((r) => setTimeout(r, 5000));
  expect(onTimeout).toHaveBeenCalled();
});
```

---

## How to Write High-Value E2E Tests (Playwright): Examples

### 1. Intent Clarity (E2E)

**Goal**: Describe the user flow being tested.

**High Score (2/2)**: The title describes a clear user action and outcome.

```javascript
/**
 * Spec-ID: CART-003
 * Linked-Req: PRD-7.1 (Add to Cart)
 */
test("should allow user to add an item to the cart from the product page", async ({ page }) => {
  // ...
});
```

**Low Score (0/2)**: Vague title.

```javascript
test("cart test", async ({ page }) => {
  // ...
});
```

### 2. Assertion Quality (E2E)

**Goal**: Use robust, user-facing locators and make specific assertions.

**High Score (2/2)**: Prefers `getByRole` and `getByTestId` and makes a semantic assertion.

```javascript
// GOOD: Robust, accessible locator
const submitButton = page.getByRole("button", { name: /Sign In/i });
await submitButton.click();

// GOOD: Specific assertion
await expect(page.getByText("Welcome, Alice!")).toBeVisible();
```

**Low Score (0/2)**: Uses brittle CSS selectors and relies only on visual snapshots.

```javascript
// BAD: Brittle selector
await page.locator("div > div:nth-child(2) > button").click();

// BAD: Relies only on a screenshot, which can be flaky and hides intent.
await expect(page).toHaveScreenshot("login-success.png");
```

### 3. Robustness & Flake-Reduction (E2E)

**Goal**: Eliminate all sources of flakiness by embracing Playwright's auto-waiting mechanisms.

**High Score (2/2)**: Uses web-first assertions and avoids manual waits.

```javascript
// GOOD: Playwright will auto-wait for the element to be visible.
await expect(page.getByRole("heading", { name: "Shopping Cart" })).toBeVisible({ timeout: 5000 });
```

**Low Score (0/2)**: Uses hard-coded waits, which lead to flaky tests that are either too short or too long.

```javascript
// BAD: This is a primary source of flaky tests.
await page.waitForTimeout(2000); // Don't do this!

const header = await page.locator("h1"); // May or may not be ready
```

**CRITICAL**: A test that is flaky (sometimes passes, sometimes fails) has **negative value**. It erodes trust in the test suite. The `npm run e2e:flake-scan` command is designed specifically to detect and prevent this.

---

By following these guidelines, you will contribute to a healthier, more effective, and more maintainable test suite.
