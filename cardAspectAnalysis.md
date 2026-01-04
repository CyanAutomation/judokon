# Judoka Card Aspect Ratio: Analysis and Implementation Plan

**Status**: Analysis Complete, Ready for Implementation

## 1. Executive Summary

**Problem**: Judoka cards display with an incorrect **0.44:1 aspect ratio** (e.g., 280px × 631px), appearing vertically stretched. The required aspect ratio, as specified in the project's design documents, is **2:3 (0.67:1)**.

**Root Cause**: The issue stems from three main problems in `src/styles/card.css`:
1.  **Unconstrained Height**: The card's `height: auto` property allows it to grow beyond its calculated height.
2.  **Flexible Grid Rows**: The `grid-template-rows` use `auto` and `1fr`, which permits grid sections to expand based on their content rather than adhering to a strict proportion.
3.  **Oversized Portrait**: The `.card-portrait` has a fixed aspect ratio of `1 / 1.1`, making it taller than specified and disrupting the layout.

**Solution**: The proposed solution is to enforce the correct aspect ratio by applying a 4-phase CSS fix that involves locking the card's height, using a proportional grid layout, and adjusting the portrait's aspect ratio.

**Impact**: This fix will resolve the visual discrepancy, ensure cards adhere to the 2:3 design standard, and improve screen space utilization.

---

## 2. Problem Analysis

### Current State Measurements

Based on a standard 280px wide card, the dimensions are incorrect:

| Metric | Current | Expected | Delta |
| :--- | :--- | :--- | :--- |
| **Total Height** | 631px | 420px | +211px |
| **Aspect Ratio** | 0.44:1 | **0.67:1 (2:3)** | -0.23 |

### Section Breakdown

The extra height is distributed across the card's sections:

| Section | Current Height | Expected Height | Delta |
| :--- | :--- | :--- | :--- |
| Top Bar | 77px | ~56px | -21px |
| Portrait | 286px | ~180px | -106px |
| Stats | 200px | ~140px | -60px |
| Signature | 48px | 44px | -4px |
| **Total** | **611px** | **420px** | **-191px** |

### Identified CSS Root Causes

The investigation of `src/styles/card.css` pinpointed these issues:

1.  **Unconstrained Height (Line 137)**: `height: auto;` allows the card's container to grow vertically to fit its content, ignoring the height calculated by `--card-height`.
2.  **Flexible Grid Layout (Line 145)**: `grid-template-rows: auto 1fr auto auto;` lets the browser determine the height of the rows. The `1fr` unit on the portrait's row is particularly problematic, as it expands to fill available space.
3.  **Fixed Portrait Aspect Ratio (Line 336)**: `aspect-ratio: 1 / 1.1;` forces the portrait to be taller than it should be, which contributes significantly to the overall height issue.

> **Note on Height Calculation**: The variable `--card-height: calc(var(--card-width) * 1.5);` is **correct** for a 2:3 aspect ratio (Height = Width × 1.5). The issue is not the formula itself, but the other CSS rules that prevent it from being enforced.

---

## 3. Implementation Plan

The fix involves a series of targeted changes to `src/styles/card.css`.

### Phase 1: Constrain Card Height

**Goal**: Force the card to respect the calculated `--card-height`.

**Change**: In the `.judoka-card` rule (around line 136):

```css
/* OLD */
min-height: var(--card-height);
height: auto;

/* NEW */
min-height: var(--card-height);
max-height: var(--card-height);
height: var(--card-height);
```

### Phase 2: Implement Proportional Grid Rows

**Goal**: Replace the flexible grid rows with a proportional system that maintains the correct section sizes.

**Change**: In the `.judoka-card` rule (around line 145):

```css
/* OLD */
grid-template-rows:
  auto
  1fr
  auto
  auto;

/* NEW */
grid-template-rows:
  minmax(48px, 13.5%)    /* Top bar: ~56px at 420px height */
  minmax(150px, 43%)     /* Portrait: ~180px at 420px height */
  minmax(120px, 33%)     /* Stats: ~140px at 420px height */
  minmax(44px, 10.5%);   /* Signature: ~44px at 420px height */
```

### Phase 3: Adjust Portrait Aspect Ratio

**Goal**: Allow the grid to control the portrait's height.

**Change**: In the `.card-portrait` rule (around line 336):

```css
/* OLD */
aspect-ratio: 1 / 1.1;

/* NEW */
aspect-ratio: auto;
```

### Phase 4: Handle Stats Section Overflow

**Goal**: Prevent stats from overflowing their container on smaller cards.

**Change**: In the `.card-stats` rule (around line 376), add `overflow-y`.

```css
.card-stats {
  /* ... existing styles ... */
  overflow-y: auto;
  max-height: 100%;
}
```

---

## 4. Opportunities for Improvement

While the above plan will fix the bug, we can further improve the code's maintainability.

### Use CSS Custom Properties for Grid Proportions

Instead of hardcoding percentages in the `grid-template-rows` definition, we can define them as variables. This makes the layout's intent clearer and easier to modify.

**Recommendation**:

```css
.judoka-card {
  /* ... */
  --top-bar-h: 13.5%;
  --portrait-h: 43%;
  --stats-h: 33%;
  --signature-h: 10.5%;

  grid-template-rows:
    minmax(48px, var(--top-bar-h))
    minmax(150px, var(--portrait-h))
    minmax(120px, var(--stats-h))
    minmax(44px, var(--signature-h));
  /* ... */
}
```

This change is optional but recommended for long-term code health.

---

## 5. Testing and Verification

### Automated Testing

A dedicated Playwright test file has been created to verify the fix.

-   **File**: `playwright/card-aspect-ratio.spec.js`
-   **Run Command**: `npx playwright test playwright/card-aspect-ratio.spec.js`

The test will automatically measure the card's aspect ratio across multiple pages and viewports.

### Manual & Visual Regression Testing

Manual verification should be performed on the following pages to check for visual regressions:
1.  `randomJudoka.html`
2.  `browseJudoka.html`
3.  `cardOfTheDay.html`
4.  `battleClassic.html`

**Checklist**:
- [ ] Card appears with a 2:3 ratio.
- [ ] All elements (name, portrait, stats, etc.) are visible and correctly aligned.
- [ ] Text is readable and does not overflow.
- [ ] Touch targets are at least 44x44px.
- [ ] Images are not distorted.

### Success Criteria

- **Primary**: The card's aspect ratio is **0.67 ± 0.05**.
- **Secondary**: All automated tests pass, no visual regressions are found, and accessibility standards (contrast, touch targets) are maintained.

---

## 6. Risk and Rollback

| Risk | Likelihood | Impact | Mitigation |
| :--- | :--- | :--- | :--- |
| Stats overflow becomes unreadable | Medium | Medium | `overflow-y: auto` ensures content is scrollable. |
| Portrait images get distorted | Low | High | `object-fit: cover` is already in use and prevents distortion. |
| Grid breaks on older browsers | Low | Medium | The `minmax()` function is widely supported. Cross-browser testing is still advised. |

**Rollback Plan**: In case of severe issues, the changes can be reverted via `git revert`. For a temporary fix, an emergency CSS override can be applied to restore the original `grid-template-rows` and `height`.

---

## 7. References

-   **PRDs**: `prdJudokaCard.md`, `prdDevelopmentStandards.md`
-   **CSS File**: `src/styles/card.css`
-   **Test File**: `playwright/card-aspect-ratio.spec.js`