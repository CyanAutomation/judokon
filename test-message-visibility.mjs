import { test, expect } from "./playwright/fixtures/commonSetup.js";

test("message visibility", async ({ page }) => {
  // Create a simple test HTML
  await page.setContent(`
    <html>
      <body>
        <p id="msg" class="search-results-message"></p>
      </body>
    </html>
  `);
  
  const msg = page.locator("#msg");
  
  // Initially empty
  console.log("Empty - visible?", await msg.isVisible());
  
  // Add text
  await page.evaluate(() => {
    document.getElementById("msg").textContent = "Test message";
  });
  
  console.log("With text - visible?", await msg.isVisible());
  console.log("Text content:", await msg.textContent());
});
