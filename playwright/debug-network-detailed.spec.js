import { test } from "@playwright/test";

test("detailed network error logging", async ({ page }) => {
  const errors = [];
  const requests = [];
  const responses = [];

  // Capture all network events
  page.on("request", (request) => {
    requests.push(`${request.method()} ${request.url()}`);
  });

  page.on("response", (response) => {
    responses.push(`${response.status()} ${response.url()}`);
    if (response.status() >= 400) {
      errors.push(`HTTP ${response.status()}: ${response.url()}`);
    }
  });

  page.on("pageerror", (error) => {
    errors.push(`Page Error: ${error.message}`);
  });

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      errors.push(`Console Error: ${msg.text()}`);
    }
  });

  // Load the battle CLI page with autoStart
  await page.goto("/src/pages/battleCLI.html?autoStart=true&battleStateBadge=true");

  // Wait a bit for initialization
  await page.waitForTimeout(3000);

  console.log("\n=== NETWORK REQUESTS ===");
  for (const req of requests) {
    console.log(req);
  }

  console.log("\n=== NETWORK RESPONSES ===");
  for (const resp of responses) {
    console.log(resp);
  }

  console.log("\n=== ERRORS ===");
  for (const error of errors) {
    console.log(error);
  }

  // Log the current battle state
  const state = await page.evaluate(() => {
    const store = window.battleStore;
    if (!store) return { error: "No battle store" };

    return {
      hasBattleStore: !!store,
      storeEngine: store.engine ? "present" : "missing",
      storeOrchestrator: store.orchestrator ? "present" : "missing",
      battleState: store.state || "unknown"
    };
  });

  console.log("\n=== BATTLE STATE ===");
  console.log(JSON.stringify(state, null, 2));
});
