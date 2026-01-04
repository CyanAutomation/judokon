# Judoka Card Aspect Ratio: Bug Analysis and Fix Implementation

**Status**: ✅ Verified - Ready for Implementation  
**Priority**: High (Visual Fidelity Issue)  
**Affects**: All pages displaying judoka cards  
**Last Updated**: 2026-01-04

---

## 1. Executive Summary

### Problem Statement

Judoka cards display with an incorrect **0.44:1 aspect ratio** (e.g., 280px width × 631px height), appearing vertically stretched. The required aspect ratio is **2:3 (0.67:1)**, resulting in cards that are **~50% taller** than intended.

### Verified Root Causes

Analysis of `src/styles/card.css` (verified 2026-01-04) confirms three CSS issues:

1. **Unconstrained Height** (Line 137):  
   `height: auto` allows the card container to grow vertically beyond the calculated `--card-height: calc(var(--card-width) * 1.5)`

2. **Flexible Grid Layout** (Lines 145-149):  

   ```css
   grid-template-rows:
     auto    /* Top bar - expands to content */
     1fr     /* Portrait - fills remaining space */
     auto    /* Stats - expands to content */
     auto;   /* Signature - expands to content */
   ```

   The `1fr` unit and `auto` values allow grid rows to expand beyond proportional constraints.

3. **Fixed Portrait Aspect Ratio** (Line 336):  
   `aspect-ratio: 1 / 1.1` forces the portrait section to be taller than its grid allocation, cascading height to parent container.

### Proposed Solution

Four-phase CSS fix targeting `src/styles/card.css`:

- **Phase 1**: Lock card height to calculated value
- **Phase 2**: Replace flexible grid with proportional layout  
- **Phase 3**: Allow grid to control portrait height
- **Phase 4**: Add overflow handling for stats section

### Expected Impact

- ✅ Correct 2:3 aspect ratio across all viewports
- ✅ Improved screen space utilization (~33% height reduction)
- ✅ Consistent visual appearance with design standards
- ⚠️ Stats section may require scrolling on smaller cards (mitigated with `overflow-y: auto`)

---

## 2. Problem Analysis

### Current State Measurements

Based on standard 280px wide card rendering:

| Metric | Current | Expected | Delta |
|:---|:---|:---|:---|
| **Total Height** | 631px | 420px | **+211px (+50%)** |
| **Aspect Ratio** | 0.44:1 | **0.67:1 (2:3)** | **-0.23** |
| **Width** | 280px | 280px | 0px |

### Section Height Breakdown

| Section | Current Height | Expected Height | Delta | % of Total |
|:---|---:|---:|---:|---:|
| Top Bar | 77px | ~56px | +21px | 13.5% |
| Portrait | 286px | ~180px | +106px | 43% |
| Stats | 200px | ~140px | +60px | 33% |
| Signature | 48px | ~44px | +4px | 10.5% |
| **Total** | **611px** | **420px** | **+191px** | **100%** |

> **Note**: Measurements exclude 10px border on each side (20px total border height not included in grid calculations).

### Identified CSS Issues (Verified)

#### Issue 1: Unconstrained Height

**File**: `src/styles/card.css`, Line 137  
**Current Code**:

```css
.judoka-card {
  --card-height: calc(var(--card-width) * 1.5);
  min-height: var(--card-height);
  height: auto;  /* ❌ Allows unlimited vertical growth */
}
```

**Problem**: The `height: auto` directive overrides the calculated `--card-height`, allowing the card to expand to fit its content rather than constraining content to fit the card.

**Verification**: ✅ Confirmed at line 137

---

#### Issue 2: Flexible Grid Layout

**File**: `src/styles/card.css`, Lines 145-149  
**Current Code**:

```css
grid-template-rows:
  auto    /* ❌ Top bar grows to content size */
  1fr     /* ❌ Portrait fills all remaining space */
  auto    /* ❌ Stats grow to content size */
  auto;   /* ❌ Signature grows to content size */
```

**Problem**:

- `auto` rows expand to fit content without proportion constraints
- `1fr` on portrait row fills remaining space after auto rows, but since `height: auto`, there's no constraint
- No maximum height limits prevent overflow

**Verification**: ✅ Confirmed at lines 145-149

---

#### Issue 3: Fixed Portrait Aspect Ratio

**File**: `src/styles/card.css`, Line 336  
**Current Code**:

```css
.card-portrait {
  aspect-ratio: 1 / 1.1;  /* ❌ Fixed ratio overrides grid */
}
```

**Problem**: The fixed `1 / 1.1` aspect ratio (width:height) means:

- At 280px width, portrait height is forced to **308px** (280 × 1.1)
- Expected height from 2:3 card ratio: **~180px** (43% of 420px)
- This adds **128px of extra height**, which cascades to parent container

**Verification**: ✅ Confirmed at line 336

---

### Why Current `--card-height` Calculation is Correct

```css
--card-height: calc(var(--card-width) * 1.5);
```

This formula is **mathematically correct** for 2:3 aspect ratio:

- 2:3 ratio = width:height  
- height = width × (3/2) = width × 1.5  
- Example: 280px × 1.5 = 420px ✅

**The issue is not the calculation, but the CSS rules that prevent it from being enforced.**

---

## 3. Implementation Plan

### Phase 1: Constrain Card Height

**Goal**: Force card to respect calculated `--card-height`

**File**: `src/styles/card.css`  
**Lines**: ~136-137

**Change**:

```css
/* BEFORE */
.judoka-card {
  min-height: var(--card-height);
  height: auto;
}

/* AFTER */
.judoka-card {
  min-height: var(--card-height);
  max-height: var(--card-height);
  height: var(--card-height);
}
```

**Rationale**:

- Sets explicit `height` to calculated value
- Adds `max-height` constraint to prevent overflow
- Maintains `min-height` for backward compatibility

---

### Phase 2: Implement Proportional Grid Layout

**Goal**: Replace flexible grid with fixed proportional system

**File**: `src/styles/card.css`  
**Lines**: ~145-149

**Change**:

```css
/* BEFORE */
grid-template-rows:
  auto
  1fr
  auto
  auto;

/* AFTER */
grid-template-rows:
  minmax(48px, 13.5%)    /* Top bar: ~56px at 420px height */
  minmax(150px, 43%)     /* Portrait: ~180px at 420px height */
  minmax(120px, 33%)     /* Stats: ~140px at 420px height */
  minmax(44px, 10.5%);   /* Signature: ~44px at 420px height */
```

**Rationale**:

- **Percentages** maintain proportions across different card sizes
- **minmax()** ensures minimum accessibility requirements:
  - Touch targets ≥44px (WCAG 2.5.5 AAA)
  - Minimum readable heights for content
- **Total**: 13.5% + 43% + 33% + 10.5% = 100% ✅

**Calculation Example** (280px width → 420px height):

| Section | Percentage | Min Height | Calculated | Actual |
|:---|---:|---:|---:|---:|
| Top Bar | 13.5% | 48px | 56.7px | 57px |
| Portrait | 43% | 150px | 180.6px | 181px |
| Stats | 33% | 120px | 138.6px | 139px |
| Signature | 10.5% | 44px | 44.1px | 44px |

---

### Phase 3: Remove Fixed Portrait Aspect Ratio

**Goal**: Allow grid to control portrait height

**File**: `src/styles/card.css`  
**Line**: ~336

**Change**:

```css
/* BEFORE */
.card-portrait {
  aspect-ratio: 1 / 1.1;
}

/* AFTER */
.card-portrait {
  aspect-ratio: auto;
  /* OR remove the property entirely */
}
```

**Rationale**:

- Let grid row height (43%) determine portrait container height
- `object-fit: cover` on portrait image (already implemented at line 349) prevents distortion
- Portrait will scale proportionally with card size

**Existing Protection**:

```css
.card-portrait img {
  width: 100%;
  height: 100%;
  object-fit: cover;  /* ✅ Already prevents distortion */
}
```

---

### Phase 4: Handle Stats Section Overflow

**Goal**: Prevent stats from breaking layout on smaller cards

**File**: `src/styles/card.css`  
**Lines**: ~375-388

**Change**:

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
  
  /* NEW: Prevent overflow */
  overflow-y: auto;
  max-height: 100%;
}
```

**Rationale**:

- Stats section gets 33% of card height (~140px at standard size)
- On narrow viewports (220px min width), content may overflow
- `overflow-y: auto` enables scrolling if needed (rare edge case)
- `max-height: 100%` respects grid allocation

---

## 4. Opportunities for Improvement

### Enhancement 1: CSS Custom Properties for Grid Proportions

**Current Proposal** (Phase 2):

```css
grid-template-rows:
  minmax(48px, 13.5%)
  minmax(150px, 43%)
  minmax(120px, 33%)
  minmax(44px, 10.5%);
```

**Enhanced Version** (Improved Maintainability):

```css
.judoka-card {
  /* Define proportions as CSS variables */
  --grid-top-bar-pct: 13.5%;
  --grid-portrait-pct: 43%;
  --grid-stats-pct: 33%;
  --grid-signature-pct: 10.5%;
  
  /* Define minimum heights */
  --grid-top-bar-min: 48px;
  --grid-portrait-min: 150px;
  --grid-stats-min: 120px;
  --grid-signature-min: 44px;
  
  /* Apply to grid */
  grid-template-rows:
    minmax(var(--grid-top-bar-min), var(--grid-top-bar-pct))
    minmax(var(--grid-portrait-min), var(--grid-portrait-pct))
    minmax(var(--grid-stats-min), var(--grid-stats-pct))
    minmax(var(--grid-signature-min), var(--grid-signature-pct));
}
```

**Benefits**:

- ✅ Single source of truth for proportions
- ✅ Easier to adjust layout in future
- ✅ Self-documenting code
- ✅ Enables theme/variant overrides

**Recommendation**: Implement in follow-up PR after core fix is verified.

---

### Enhancement 2: Responsive Grid Adjustments

**Consideration**: Different proportions for mobile vs. desktop

```css
@media (max-width: 375px) {
  .judoka-card {
    --grid-portrait-pct: 40%;  /* Reduce portrait on small screens */
    --grid-stats-pct: 36%;     /* Increase stats visibility */
  }
}
```

**Status**: Not recommended for initial fix. Validate with user testing first.

---

### Enhancement 3: Accessibility Audit

**Current Minimum Sizes**:

- Touch targets: 44-48px ✅ (meets WCAG 2.5.5 Level AAA)
- Text contrast: Needs verification with `npm run check:contrast`

**Action Items**:

- [ ] Run contrast checker after CSS changes
- [ ] Verify touch target sizes on mobile viewports
- [ ] Test keyboard navigation with new layout

---

## 5. Testing and Verification

### Automated Testing

#### Existing Test Suite

**File**: `playwright/card-aspect-ratio.spec.js` ✅ (Verified 2026-01-04)

**Coverage**:

- ✅ Random Judoka page (`randomJudoka.html`)
- ✅ Browse Judoka page (`browseJudoka.html`)
- ✅ Card of the Day page (`cardOfTheDay.html`)
- ✅ Multi-viewport testing (iPhone SE, iPad, Desktop)

**Run Command**:

```bash
npx playwright test playwright/card-aspect-ratio.spec.js
```

**Expected Output After Fix**:

```
Card dimensions: 280px × 420px
Actual ratio: 0.6667
Expected ratio: 0.6667
Difference: 0.0000
✓ All tests passed
```

---

### Manual Verification Checklist

Test on the following pages after implementing fix:

#### Page-Specific Tests

- [ ] **randomJudoka.html**: Click "Draw" button, verify card ratio
- [ ] **browseJudoka.html**: Verify grid of cards maintains ratio
- [ ] **cardOfTheDay.html**: Verify single card display
- [ ] **battleClassic.html**: Verify cards in battle interface

#### Visual Regression Checks

- [ ] Card appears with 2:3 ratio (not stretched)
- [ ] All text is readable without truncation
- [ ] Portrait images are not distorted
- [ ] Stats section displays without overflow (or scrolls cleanly)
- [ ] Signature move is fully visible
- [ ] Touch targets are ≥44×44px

#### Viewport Testing

Test at these viewport sizes:

- [ ] 375×667 (iPhone SE) - Minimum mobile
- [ ] 768×1024 (iPad) - Tablet
- [ ] 1920×1080 (Desktop) - Large screen

---

### Success Criteria

#### Primary Metrics

- ✅ **Aspect Ratio**: 0.67 ± 0.05 (acceptable range: 0.62-0.72)
- ✅ **Height Reduction**: ~33% decrease from current state
- ✅ **All Automated Tests Pass**: Playwright suite reports 100% pass rate

#### Secondary Metrics  

- ✅ **No Visual Regressions**: Manual inspection confirms no layout breaks
- ✅ **Accessibility Maintained**: Contrast checker passes, touch targets meet WCAG AAA
- ✅ **Performance**: No measurable impact on page load or render time

---

### Validation Commands

```bash
# 1. Run aspect ratio tests
npx playwright test playwright/card-aspect-ratio.spec.js

# 2. Check CSS formatting
npx prettier src/styles/card.css --check

# 3. Run ESLint (if any JS changes)
npx eslint src/styles/

# 4. Verify contrast ratios
npm run check:contrast

# 5. Full test suite (before PR)
npm run test:ci
```

---

## 6. Risk Assessment and Mitigation

### Identified Risks

| Risk | Likelihood | Impact | Mitigation Strategy |
|:---|:---:|:---:|:---|
| Stats overflow becomes unreadable | **Medium** | Medium | `overflow-y: auto` enables scrolling; minimum height ensures visibility |
| Portrait images get distorted | **Low** | High | `object-fit: cover` already implemented (line 349); verified in testing |
| Grid breaks on older browsers | **Low** | Medium | `minmax()` has 96%+ browser support; fallback not needed for target audience |
| Touch targets become too small | **Very Low** | High | `minmax()` enforces 44px minimum; exceeds WCAG AAA requirement |
| Text truncation on mobile | **Low** | Medium | Testing at 220px min-width; adjust font-size if needed |

---

### Rollback Plan

#### Option 1: Git Revert (Preferred)

```bash
# If issues discovered post-merge
git revert <commit-sha>
git push origin main
```

#### Option 2: Emergency CSS Override

Add temporary override to `card.css` if immediate rollback needed:

```css
.judoka-card {
  /* EMERGENCY ROLLBACK - Remove after investigation */
  height: auto !important;
  max-height: none !important;
  grid-template-rows: auto 1fr auto auto !important;
}
```

#### Option 3: Feature Flag (Future Enhancement)

Consider adding feature flag for gradual rollout:

```javascript
// config/features.js
export const useFixedCardAspectRatio = true;
```

---

### Browser Compatibility

**CSS Features Used**:

- `calc()`: ✅ 99.9% support
- `minmax()`: ✅ 96.5% support  
- `aspect-ratio`: ✅ 94.8% support (graceful degradation)
- CSS Grid: ✅ 98.1% support

**Target Browsers** (from project requirements):

- Chrome 90+ ✅
- Firefox 88+ ✅  
- Safari 14+ ✅
- Edge 90+ ✅

---

## 7. Implementation Timeline

### Implementation Progress

#### ✅ Phase 1: Constrain Card Height - COMPLETED

**Status**: ✅ Implemented (2026-01-04 23:09 UTC)
**Changes Applied**:

```css
/* Lines 136-138 in src/styles/card.css */
min-height: var(--card-height);
max-height: var(--card-height);
height: var(--card-height);
```

**Validation**: Prettier formatting check passed
**Next**: Phase 2 - Implement proportional grid layout

#### ✅ Phase 2: Proportional Grid Layout - COMPLETED

**Status**: ✅ Implemented (2026-01-04 23:10 UTC)
**Changes Applied**:

```css
/* Lines 146-150 in src/styles/card.css */
grid-template-rows:
  minmax(48px, 13.5%)    /* Top bar */
  minmax(150px, 43%)     /* Portrait */
  minmax(120px, 33%)     /* Stats */
  minmax(44px, 10.5%);   /* Signature */
```

**Validation**: Prettier formatting check passed
**Next**: Phase 3 - Adjust portrait aspect ratio

#### ✅ Phase 3: Portrait Aspect Ratio - COMPLETED

**Status**: ✅ Implemented (2026-01-04 23:10 UTC)
**Changes Applied**:

```css
/* Line 337 in src/styles/card.css */
aspect-ratio: auto;  /* Changed from 1 / 1.1 */
```

**Validation**: Prettier formatting check passed
**Next**: Phase 4 - Handle stats overflow

#### ✅ Phase 4: Stats Overflow Handling - COMPLETED

**Status**: ✅ Implemented (2026-01-04 23:11 UTC)
**Changes Applied**:

```css
/* Lines 387-388 in src/styles/card.css */
overflow-y: auto;
max-height: 100%;
```

**Validation**: Prettier formatting check passed
**Next**: Run Playwright tests to verify aspect ratio fix

---

### Recommended Workflow

#### Step 1: Implement Core Fix

- Apply Phases 1-4 in single PR
- Estimated time: 30 minutes
- File: `src/styles/card.css`

#### Step 2: Validate with Tests

- Run Playwright tests
- Manual verification on 4 pages
- Estimated time: 20 minutes

#### Step 3: Submit PR

- Include before/after measurements
- Reference this document
- Estimated time: 10 minutes

#### Step 4: Review and Merge

- Code review by maintainer
- CI/CD validation
- Estimated time: 1-2 hours

#### Step 5: Monitor Production (If Applicable)

- Watch for user reports
- Verify analytics (if available)
- Estimated time: 48 hours

---

### Task Contract (For Agent Implementation)

```json
{
  "inputs": [
    "src/styles/card.css",
    "playwright/card-aspect-ratio.spec.js"
  ],
  "outputs": [
    "src/styles/card.css"
  ],
  "success": [
    "npx prettier src/styles/card.css --check: PASS",
    "npx eslint .: PASS",
    "npx playwright test playwright/card-aspect-ratio.spec.js: PASS",
    "npm run check:contrast: PASS",
    "no_visual_regressions"
  ],
  "errorMode": "ask_on_test_failure"
}
```

---

## 8. References

### Project Documentation

- **PRDs**: `design/productRequirementsDocuments/prdDrawRandomCard.md` (card display requirements)
- **Development Standards**: `AGENTS.md` (validation commands)
- **Testing Guide**: `tests/battles-regressions/README.md`

### Files Modified

- **CSS**: `src/styles/card.css` (Lines 137, 145-149, 336, 375-388)

### Files Referenced  

- **Test Suite**: `playwright/card-aspect-ratio.spec.js`
- **Component**: `src/components/createJudokaCard.js`

### External Resources

- **WCAG 2.5.5 (Touch Target Size)**: <https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced>
- **CSS Grid Guide**: <https://css-tricks.com/snippets/css/complete-guide-grid/>
- **minmax() Function**: <https://developer.mozilla.org/en-US/docs/Web/CSS/minmax>

---

## 9. Appendix: Measurement Data

### Test Run Output (Before Fix)

```
Random Judoka Page:
  Card dimensions: 280px × 631px
  Actual ratio: 0.4437
  Expected ratio: 0.6667
  Difference: 0.2230
  
  Section heights:
    topBar: 77px
    portrait: 286px  (45.3% of total)
    stats: 200px     (31.7% of total)
    signature: 48px  (7.6% of total)
    total: 631px
```

### Expected Test Run Output (After Fix)

```
Random Judoka Page:
  Card dimensions: 280px × 420px
  Actual ratio: 0.6667
  Expected ratio: 0.6667
  Difference: 0.0000
  
  Section heights:
    topBar: 57px     (13.6% of total)
    portrait: 181px  (43.1% of total)
    stats: 139px     (33.1% of total)
    signature: 44px  (10.5% of total)
    total: 421px (includes borders)
```

---

## 10. Agent-Specific Notes

### For AI Agents Implementing This Fix

1. **Do not modify**:
   - Image sources or alt text
   - JavaScript component logic
   - HTML structure
   - Other CSS files

2. **Do modify** (only these lines):
   - `src/styles/card.css` lines 137, 145-149, 336, 375-388

3. **Validation sequence**:

   ```bash
   npx prettier src/styles/card.css --write
   npx playwright test playwright/card-aspect-ratio.spec.js
   npm run check:contrast
   ```

4. **Expected test outcome**: All 4 tests in `card-aspect-ratio.spec.js` should pass with ratio values within 0.05 of 0.6667.

5. **If tests fail**:
   - Check for typos in percentage values
   - Verify minmax() syntax is correct
   - Ensure no conflicting CSS rules were accidentally added
   - Ask for guidance before attempting alternative approaches

---

**Document Version**: 2.0  
**Last Verified**: 2026-01-04  
**Next Review**: After implementation and 1 week of production use
