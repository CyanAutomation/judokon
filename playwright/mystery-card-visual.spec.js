import { test, expect } from '@playwright/test';

test.describe('Mystery Card Visual Check', () => {
  test('mystery card question mark should be visible and styled', async ({ page }) => {
    await page.goto('/src/pages/battleClassic.html');
    await page.waitForLoadState('networkidle');
    
    // Wait for mystery card to be present
    const mysteryCard = page.locator('#mystery-card-placeholder');
    await expect(mysteryCard).toBeVisible();
    
    // Check SVG is present
    const svg = mysteryCard.locator('svg.mystery-icon');
    await expect(svg).toBeVisible();
    
    // Check path element has fill attribute
    const path = svg.locator('path');
    const fillAttr = await path.getAttribute('fill');
    expect(fillAttr).toBe('currentColor');
    
    // Check computed styles
    const svgStyles = await svg.evaluate((el) => {
      const styles = window.getComputedStyle(el);
      return {
        fill: styles.fill,
        opacity: styles.opacity,
        width: styles.width,
        height: styles.height
      };
    });
    
    // Verify fill is not transparent or invalid
    expect(svgStyles.fill).not.toBe('rgba(0, 0, 0, 0)');
    expect(svgStyles.fill).not.toBe('transparent');
    expect(svgStyles.fill).not.toBe('');
    
    // Verify opacity is set correctly
    expect(parseFloat(svgStyles.opacity)).toBeGreaterThan(0);
    
    // Take screenshot for manual verification
    await page.screenshot({ path: 'test-results/mystery-card-visual.png' });
    
    console.log('Mystery card styles:', svgStyles);
  });
});
