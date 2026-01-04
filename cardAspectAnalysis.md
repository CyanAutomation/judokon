# Card Aspect Ratio Analysis

## Problem Summary
Cards currently have **0.44 ratio** (too narrow/tall) instead of the required **0.67 ratio** (2:3 aspect).

## Current Measurements (280px wide card)
- **Actual height**: 631px (280/631 = 0.44 ratio)
- **Expected height**: 420px (280/420 = 0.67 ratio)
- **Difference**: 211px too tall

## Section Breakdown
| Section    | Current | Ideal for 2:3 | Notes                    |
|------------|---------|---------------|--------------------------|
| Top Bar    | 77px    | ~56px         | Name + flag              |
| Portrait   | 286px   | ~180px        | 1:1.1 aspect currently   |
| Stats      | 200px   | ~140px        | 5 stat rows              |
| Signature  | 48px    | 44px          | Touch target compliant   |
| **Total**  | 611px   | 420px         | -191px needed            |

## Root Causes

### 1. Card Height Calculation (card.css:132)
```css
--card-height: calc(var(--card-width) * 1.5);  /* 1.5 = 3/2 inverted! */
```
**Problem**: Uses 1.5 multiplier (3/2 ratio) instead of 1.5 for height!
This gives 3:2 ratio (landscape) when we need 2:3 (portrait).

**Fix**: Should be `calc(var(--card-width) * 1.5)` for 2:3 ratio
- 280px × 1.5 = 420px height ✓

### 2. Portrait Aspect Ratio (card.css:336)
```css
.card-portrait {
  aspect-ratio: 1 / 1.1;  /* Too tall */
}
```
**Problem**: Portrait takes ~45% of card height instead of ~42% per PRD

### 3. Grid Template Auto-sizing (card.css:145)
```css
grid-template-rows: auto 1fr auto auto;
```
**Problem**: `1fr` allows portrait to expand, `auto` rows add extra space

## Solutions

### Option A: Fix Formula + Constrain Sections (Recommended)
1. Verify height formula is correct (it actually is!)
2. Add max-height constraints to sections
3. Adjust portrait aspect-ratio to fit properly
4. Use fixed grid rows instead of `1fr`

### Option B: Proportional Grid System
Replace `auto` and `1fr` with fixed percentages:
- Top bar: 13% (56px / 420px)
- Portrait: 43% (180px / 420px)  
- Stats: 33% (140px / 420px)
- Signature: 11% (44px / 420px)

### Option C: Flexbox with Flex-basis
Convert from grid to flexbox with fixed flex-basis values

## Recommended Approach

**Phase 1: Fix Grid Template**
```css
grid-template-rows: 
  minmax(48px, 56px)      /* top bar */
  minmax(150px, 43%)      /* portrait */
  minmax(120px, 33%)      /* stats */
  minmax(44px, 48px);     /* signature */
```

**Phase 2: Adjust Portrait**
```css
.card-portrait {
  aspect-ratio: 1 / 1;  /* Square, let grid control height */
  max-height: 180px;    /* For 280px card */
}
```

**Phase 3: Constrain Stats**
```css
.card-stats {
  max-height: 33%;  /* Of parent card */
  overflow-y: auto; /* If needed */
}
```

## Testing Strategy
1. Run Playwright tests on Random Judoka page
2. Test across viewports (375px, 768px, 1920px)
3. Verify all card elements still visible
4. Check Browse Judoka carousel
5. Validate Card of the Day

## Success Criteria
- Card ratio: 0.65-0.68 (within 5% tolerance)
- All elements visible and readable
- Text doesn't overflow
- Touch targets ≥ 44px
- Works across all viewport sizes


# Card Aspect Ratio Implementation Plan

## Executive Summary

**Problem**: Judoka cards currently display with a 0.44:1 aspect ratio (280px × 631px) instead of the required 2:3 (0.67:1) aspect ratio specified in prdDevelopmentStandards.md and prdJudokaCard.md.

**Root Cause**: The CSS grid template uses `auto` and `1fr` rows that allow sections to expand beyond intended proportions, plus the portrait section has an overly tall aspect-ratio (1:1.1).

**Impact**: Cards appear stretched vertically, wasting screen space and deviating from design specifications.

**Solution**: Implement proportional grid-based layout with explicit height constraints per section.

---

## Current State Analysis

### Measurements (280px wide card)

| Metric | Current | Expected | Delta |
|--------|---------|----------|-------|
| **Total Height** | 631px | 420px | +211px |
| **Aspect Ratio** | 0.44:1 | 0.67:1 (2:3) | -0.23 |

### Section Breakdown

| Section | Current Height | % of Total | Expected Height | Expected % | Delta |
|---------|---------------|------------|-----------------|------------|-------|
| Top Bar | 77px | 12% | 56px | 13% | -21px |
| Portrait | 286px | 45% | 180px | 43% | -106px |
| Stats | 200px | 32% | 140px | 33% | -60px |
| Signature | 48px | 8% | 44px | 11% | -4px |
| **Border** | 20px | 3% | 20px | N/A | 0px |
| **Total** | 631px | 100% | 420px | 100% | -211px |

### CSS Issues Identified

**File**: `src/styles/card.css`

#### Issue #1: Grid Template (Line 145)
```css
grid-template-rows: auto 1fr auto auto;
```
**Problem**: `1fr` allows portrait to expand indefinitely; `auto` rows add extra space based on content.

#### Issue #2: Portrait Aspect Ratio (Line 336)
```css
.card-portrait {
  aspect-ratio: 1 / 1.1;  /* Too tall */
}
```
**Problem**: Creates 1:1.1 ratio portrait (286px tall), consuming 45% of card instead of target 43%.

#### Issue #3: Missing Height Constraint (Line 122)
```css
.judoka-card {
  min-height: var(--card-height);
  height: auto;  /* Allows growth */
}
```
**Problem**: `height: auto` allows card to exceed calculated `--card-height` (420px).

---

## Implementation Plan

### Phase 1: Fix Grid Template Rows

**Goal**: Replace flexible `auto` and `1fr` with proportional constraints.

**Changes to `src/styles/card.css` (Line 145)**:

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

**Rationale**:
- **minmax()** ensures touch targets (≥44px) while respecting proportions
- **Percentages** maintain 2:3 ratio across viewport sizes
- **Minimums** prevent sections from becoming unusable on small screens

---

### Phase 2: Constrain Card Height

**Goal**: Prevent card from exceeding calculated `--card-height`.

**Changes to `src/styles/card.css` (Line 136)**:

```css
/* OLD */
min-height: var(--card-height);
height: auto;

/* NEW */
min-height: var(--card-height);
max-height: var(--card-height);
height: var(--card-height);
```

**Rationale**:
- Locks card to exact 2:3 ratio calculated height
- Prevents content overflow from expanding card

---

### Phase 3: Adjust Portrait Aspect Ratio

**Goal**: Let grid control portrait height instead of aspect-ratio property.

**Changes to `src/styles/card.css` (Line 336)**:

```css
/* OLD */
aspect-ratio: 1 / 1.1;

/* NEW */
aspect-ratio: auto;  /* Let grid control height */
```

**Rationale**:
- Grid row now controls portrait height (~43% of card)
- Portrait width fills available space (100%)
- Maintains `object-fit: cover` for image scaling

---

### Phase 4: Add Stats Section Overflow Handling

**Goal**: Ensure stats remain readable if content exceeds allocated space.

**Changes to `src/styles/card.css` (Line 376)**:

```css
.card-stats {
  background-color: var(--card-stats-bg, var(--color-secondary));
  color: var(--color-text-inverted);
  padding: var(--space-sm);
  margin: 0;
  display: flex;
  justify-content: space-between;
  width: 100%;
  align-items: stretch;
  font-size: var(--font-medium);
  flex-direction: column;
  /* NEW */
  overflow-y: auto;
  max-height: 100%;  /* Respect grid row height */
}
```

**Rationale**:
- Prevents stats from pushing other sections
- Maintains readability with scrollable overflow
- Respects 33% grid allocation

---

## Responsive Behavior

### Viewport Scaling

| Viewport | Card Width | Card Height | Ratio | Notes |
|----------|-----------|-------------|-------|-------|
| **375px** (iPhone SE) | 256px | 384px | 0.67 | Clamp minimum (220px) |
| **768px** (iPad) | 280px | 420px | 0.67 | Typical size |
| **1920px** (Desktop) | 280px | 420px | 0.67 | Clamp maximum (280px) |

Card width is clamped via:
```css
--card-width: clamp(220px, 65vw, 280px);
```

This ensures:
- **Minimum**: 220px × 330px on small screens
- **Maximum**: 280px × 420px on large screens
- **Ratio**: Always 2:3 (0.67:1)

---

## Testing Strategy

### 1. Automated Tests (Playwright)

**File**: `playwright/card-aspect-ratio.spec.js` (already created)

**Test Coverage**:
- ✅ Random Judoka page (with draw button interaction)
- ✅ Browse Judoka page (carousel rendering)
- ✅ Card of the Day page
- ✅ Multi-viewport testing (375px, 768px, 1920px)

**Success Criteria**:
- Aspect ratio between 0.65–0.68 (within 5% tolerance)
- All tests pass

**Run Command**:
```bash
npx playwright test playwright/card-aspect-ratio.spec.js
```

### 2. Visual Regression Testing

**Pages to Test Manually**:
1. `/src/pages/randomJudoka.html` (draw card workflow)
2. `/src/pages/browseJudoka.html` (grid of cards)
3. `/src/pages/cardOfTheDay.html` (single card display)
4. `/src/pages/battleClassic.html` (in-battle card rendering)

**Checklist Per Page**:
- [ ] Card appears with 2:3 ratio
- [ ] All elements visible (name, flag, portrait, stats, signature)
- [ ] Text readable (no overflow or truncation)
- [ ] Touch targets ≥44px (signature move button)
- [ ] Portrait image not distorted
- [ ] Stats list readable (5 rows visible)
- [ ] Hover/focus states work correctly

### 3. Cross-Browser Testing

**Browsers**:
- Chrome/Edge (Chromium)
- Firefox
- Safari (especially iOS Safari viewport handling)

**Focus Areas**:
- Grid layout support
- `minmax()` function behavior
- `aspect-ratio` property fallbacks
- `clamp()` function in card width calculation

---

## Rollback Plan

If issues arise post-deployment:

### Quick Revert
```bash
git revert <commit-hash>
```

### Temporary CSS Override
Add to `src/styles/card.css`:
```css
.judoka-card {
  grid-template-rows: auto 1fr auto auto !important;  /* Restore original */
  height: auto !important;
}
```

---

## Task Contract

```json
{
  "inputs": [
    "src/styles/card.css",
    "playwright/card-aspect-ratio.spec.js"
  ],
  "outputs": [
    "src/styles/card.css (lines 136, 145, 336, 376)"
  ],
  "success": [
    "prettier: PASS",
    "eslint: PASS",
    "playwright card-aspect-ratio.spec.js: PASS",
    "no visual regressions on randomJudoka, browseJudoka, cardOfTheDay",
    "aspect ratio 0.65-0.68 across all viewports"
  ],
  "errorMode": "test_and_verify_before_commit"
}
```

---

## Verification Checklist

Before submitting PR:

- [ ] Run Playwright aspect ratio tests: `npx playwright test playwright/card-aspect-ratio.spec.js`
- [ ] Run full test suite: `npm run test:ci`
- [ ] Check CSS lint: `npx prettier --check src/styles/card.css`
- [ ] Visual test Random Judoka page
- [ ] Visual test Browse Judoka page
- [ ] Visual test Card of the Day page
- [ ] Test on mobile viewport (375px)
- [ ] Test on tablet viewport (768px)
- [ ] Test on desktop viewport (1920px)
- [ ] Verify all card elements visible and readable
- [ ] Verify touch targets ≥44px
- [ ] Check contrast ratios (if text size changes): `npm run check:contrast`

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Stats overflow becomes unreadable | Medium | Medium | Added `overflow-y: auto` with scrolling |
| Portrait images distorted | Low | High | Using `object-fit: cover` (already in place) |
| Grid breaks on older browsers | Low | Medium | Test in Firefox, Safari; add fallback if needed |
| Touch targets too small | Low | High | Used `minmax()` with 44px minimums |
| Layout shifts during load | Low | Medium | Fixed height prevents CLS |

---

## Success Metrics

**Primary**: 
- Card aspect ratio = 0.67 ± 0.05 (2:3 ratio within 5% tolerance)

**Secondary**:
- All Playwright tests pass
- No visual regressions reported
- No accessibility regressions (contrast, touch targets)
- Zero layout shift (CLS = 0)

**Post-Deployment**:
- Monitor Sentry for layout-related errors
- Check user feedback for readability issues
- Validate on real devices (iOS Safari, Android Chrome)

---

## Follow-Up Work

1. **Responsive Font Scaling**: Review font sizes in stats section for very small cards
2. **Portrait Fallbacks**: Ensure silhouette fallback respects new aspect ratio
3. **Card Inspector**: Verify debug panel still works with fixed height
4. **Mystery Cards**: Test obscured card layout with new constraints

---

## References

- **PRD**: `design/productRequirementsDocuments/prdJudokaCard.md` (Line 68, 93)
- **PRD**: `design/productRequirementsDocuments/prdDevelopmentStandards.md` (Line 190)
- **CSS File**: `src/styles/card.css`
- **Test File**: `playwright/card-aspect-ratio.spec.js`
- **Analysis**: `/tmp/card-aspect-analysis.md`

# Card Aspect Ratio Investigation Summary

## Problem Confirmed

Through Playwright testing, I've verified that judoka cards currently display with an **incorrect 0.44:1 aspect ratio** instead of the required **2:3 (0.67:1) ratio** specified in the PRD.

### Test Results

```
Card dimensions: 280px × 631px
Actual ratio: 0.4437
Expected ratio: 0.6667 (2:3)
Difference: 0.2230 (way outside tolerance)
```

### Visual Evidence

The Playwright test `playwright/card-aspect-ratio.spec.js` confirms:
- Cards are **211px too tall** (631px vs 420px expected)
- Portrait section consumes 45% of height vs 43% target
- Stats section consumes 32% vs 33% target
- Overall card appears stretched/elongated

## Root Causes Identified

### 1. Flexible Grid Layout
**File**: `src/styles/card.css` (Line 145)
```css
grid-template-rows: auto 1fr auto auto;
```
The `1fr` and `auto` values allow sections to expand beyond intended proportions.

### 2. Oversized Portrait
**File**: `src/styles/card.css` (Line 336)
```css
aspect-ratio: 1 / 1.1;
```
Portrait has intrinsic 1:1.1 ratio, making it too tall (286px vs 180px target).

### 3. Unconstrained Height
**File**: `src/styles/card.css` (Line 136-137)
```css
min-height: var(--card-height);
height: auto;
```
`height: auto` allows card to grow beyond calculated 2:3 height.

## Solution Overview

### 4-Phase CSS Fix

**Phase 1**: Replace flexible grid with proportional constraints
```css
grid-template-rows:
  minmax(48px, 13.5%)    /* Top bar */
  minmax(150px, 43%)     /* Portrait */
  minmax(120px, 33%)     /* Stats */
  minmax(44px, 10.5%);   /* Signature */
```

**Phase 2**: Lock card to exact height
```css
height: var(--card-height);
max-height: var(--card-height);
```

**Phase 3**: Let grid control portrait height
```css
aspect-ratio: auto;  /* Remove fixed 1:1.1 */
```

**Phase 4**: Handle stats overflow
```css
overflow-y: auto;
max-height: 100%;
```

## Implementation Plan

A comprehensive plan has been created in:
- **`CARD_ASPECT_RATIO_IMPLEMENTATION_PLAN.md`** (detailed specification)
- **`playwright/card-aspect-ratio.spec.js`** (automated verification tests)

### Key Changes Required

| File | Lines | Change |
|------|-------|--------|
| `src/styles/card.css` | 136-137 | Lock height to `var(--card-height)` |
| `src/styles/card.css` | 145-149 | Replace grid template with `minmax()` proportions |
| `src/styles/card.css` | 336 | Change portrait `aspect-ratio` to `auto` |
| `src/styles/card.css` | 376 | Add overflow handling to stats section |

### Testing Strategy

1. **Automated**: Run `npx playwright test playwright/card-aspect-ratio.spec.js`
2. **Visual**: Verify on Random Judoka, Browse Judoka, Card of the Day pages
3. **Responsive**: Test on 375px, 768px, 1920px viewports
4. **Cross-browser**: Chrome, Firefox, Safari

### Success Criteria

✅ Aspect ratio: 0.65-0.68 (within 5% of 0.67 target)  
✅ All card elements visible and readable  
✅ Touch targets ≥44px  
✅ No layout shift (CLS = 0)  
✅ Works across all viewports

## Next Steps

To implement this fix:

1. Review `CARD_ASPECT_RATIO_IMPLEMENTATION_PLAN.md` for detailed changes
2. Apply CSS modifications to `src/styles/card.css`
3. Run Playwright tests to verify aspect ratio
4. Perform visual regression testing on key pages
5. Test across multiple viewports and browsers

## Files Created

- ✅ `playwright/card-aspect-ratio.spec.js` - Automated verification tests
- ✅ `CARD_ASPECT_RATIO_IMPLEMENTATION_PLAN.md` - Detailed implementation guide
- ✅ `CARD_ASPECT_RATIO_SUMMARY.md` - This summary document

---

**Investigation Date**: 2026-01-04  
**Status**: Analysis Complete, Ready for Implementation  
**PRD References**: prdJudokaCard.md (Line 68, 93), prdDevelopmentStandards.md (Line 190)
