const { test, expect } = require('@playwright/test');

test.describe('Battle CLI settings collapse', () => {
  test('settings toggle exists and toggles aria-expanded / body visibility', async ({ page }) => {
    await page.goto('http://localhost:3000/src/pages/battleCLI.html');
    const toggle = await page.locator('#cli-settings-toggle');
    await expect(toggle).toHaveCount(1);
    const body = await page.locator('#cli-settings-body');
    await expect(body).toHaveCount(1);
    // initial aria-expanded should be present
    const expanded = await toggle.getAttribute('aria-expanded');
    expect(['true', 'false']).toContain(expanded);
    // toggle and assert changed state
    const before = expanded === 'true';
    await toggle.click();
    const afterAttr = await toggle.getAttribute('aria-expanded');
    expect(afterAttr).toBe(before ? 'false' : 'true');
    // ensure body visibility matches aria-expanded
    const bodyVisible = await body.isVisible();
    expect(bodyVisible).toBe(afterAttr === 'true');
  });
});
