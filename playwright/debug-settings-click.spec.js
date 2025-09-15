import { test } from "@playwright/test";

test("settings button force click test", async ({ page }) => {
  await page.goto("/src/pages/settings.html");

  // Get viewport and scroll info
  const viewportInfo = await page.evaluate(() => ({
    viewportHeight: window.innerHeight,
    scrollHeight: document.body.scrollHeight,
    scrollTop: window.scrollY,
    documentHeight: document.documentElement.scrollHeight
  }));
  console.log("Viewport info:", viewportInfo);

  // Scroll the button into view if needed, then click normally
  const button = page.getByRole("button", { name: "Restore Defaults" });
  await button.scrollIntoViewIfNeeded();
  const buttonBox = await button.boundingBox();
  console.log("Button bounding box:", buttonBox);

  // Check footer position
  const footer = page.locator("footer");
  const footerBox = await footer.boundingBox();
  console.log("Footer bounding box:", footerBox);

  // Check bottom navbar specifically
  const bottomNav = page.locator(".bottom-navbar");
  const bottomNavBox = await bottomNav.boundingBox();
  console.log("Bottom navbar bounding box:", bottomNavBox);

  // Try force click as a workaround
  await button.click();
  console.log("Click executed");
});
