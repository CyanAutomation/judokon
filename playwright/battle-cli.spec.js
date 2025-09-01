import { test, expect } from "@playwright/test";
import { waitForBattleState } from "./fixtures/waits.js";

test.describe("Classic Battle CLI", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      // Keep UI deterministic for tests
      try {
        localStorage.setItem("battleCLI.verbose", "false");
      } catch {}
      try {
        localStorage.setItem("battleCLI.pointsToWin", "5");
      } catch {}
      try {
        localStorage.setItem(
          "settings",
          JSON.stringify({ featureFlags: { cliShortcuts: { enabled: true } } })
        );
      } catch {}
      // Speed up inter-round where possible
      window.__NEXT_ROUND_COOLDOWN_MS = 0;
    });
    await page.goto("/src/pages/battleCLI.html");
    await page.locator("#start-match-button").click();
  });

  test("loads without console errors", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await waitForBattleState(page, "waitingForPlayerAction", 15000);
    expect(errors).toEqual([]);
  });

  test("state badge hidden when flag disabled", async ({ page }) => {
    await waitForBattleState(page, "waitingForPlayerAction", 15000);
    await expect(page.locator("#battle-state-badge")).toBeHidden();
  });

  test("state badge visible when flag enabled", async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem(
          "settings",
          JSON.stringify({ featureFlags: { battleStateBadge: { enabled: true } } })
        );
      } catch {}
    });
    await page.reload(); // reload to apply the init script
    await page.locator("#start-match-button").click();
    await waitForBattleState(page, "waitingForPlayerAction", 15000);
    const badge = page.locator("#battle-state-badge");
    await expect(badge).toBeVisible();
    await expect(badge).toContainText(/State:\s*waitingForPlayerAction/);
  });

  test("verbose log toggles and records transitions", async ({ page }) => {
    await page.goto("/src/pages/battleCLI.html?verbose=1");
    await page.locator("#start-match-button").click();
    await waitForBattleState(page, "waitingForPlayerAction", 15000);

    // Verbose enabled via query param
    const toggle = page.locator("#verbose-toggle");
    await expect(toggle).toBeChecked();
    await expect(page.locator("#cli-verbose-section")).toBeVisible();

    // Cause a transition by selecting a stat via keyboard (mapped to 1)
    await page.evaluate(() => window.__test.onKeyDown({ key: "1" }));

    // Wait for a later state to appear in the badge and log
    await waitForBattleState(page, "roundDecision", 10000);

    const log = page.locator("#cli-verbose-log");
    await expect(log).toContainText(/roundDecision/);

    // Turn verbose off hides the section
    await toggle.uncheck();
    await expect(page.locator("#cli-verbose-section")).toBeHidden();
  });

  test("help panel toggles via keyboard and close button", async ({ page }) => {
    await waitForBattleState(page, "waitingForPlayerAction", 15000);
    const panel = page.locator("#cli-shortcuts");
    await expect(panel).toBeHidden();
    await page.keyboard.press("h");
    await expect(panel).toBeVisible();
    await page.locator("#cli-shortcuts-close").click();
    await expect(panel).toBeHidden();
  });

  test("closing help panel ignores next advance click", async ({ page }) => {
    await page.addInitScript(() => {
      window.__NEXT_ROUND_COOLDOWN_MS = 10000;
    });
    await page.reload();
    await page.locator("#start-match-button").click();
    await waitForBattleState(page, "waitingForPlayerAction", 15000);

    // Play first round; machine auto-advances outcome to cooldown
    await page.keyboard.press("1");
    await waitForBattleState(page, "cooldown", 10000);

    // Close shortcuts panel
    await page.keyboard.press("h");
    await page.locator("#cli-shortcuts-close").click();
    await expect(page.locator("#cli-shortcuts")).toBeHidden();

    // First click after closing is ignored (should still be in cooldown)
    await page.locator("body").click();
    await expect(page.locator("body")).toHaveAttribute("data-battle-state", "cooldown");

    // Second click advances to next round
    await page.locator("body").click();
    await waitForBattleState(page, "waitingForPlayerAction", 10000);
  });

  test("plays a full round and skips cooldown", async ({ page }) => {
    await page.addInitScript(() => {
      window.__NEXT_ROUND_COOLDOWN_MS = 3000;
    });
    await page.reload();
    await page.locator("#start-match-button").click();
    await waitForBattleState(page, "waitingForPlayerAction", 15000);

    const score = page.locator("#cli-score");

    await page.keyboard.press("1");
    await waitForBattleState(page, "cooldown", 10000);
    const playerAfterRound = await score.getAttribute("data-score-player");
    const opponentAfterRound = await score.getAttribute("data-score-opponent");
    const cardBefore = await page.locator("#player-card ul").elementHandle();

    await waitForBattleState(page, "cooldown", 10000);
    // Pressing Enter advances to the next round
    await page.keyboard.press("Enter");
    await waitForBattleState(page, "waitingForPlayerAction", 10000);
    const cardAfter = await page.locator("#player-card ul").elementHandle();
    const playerAfterCooldown = await score.getAttribute("data-score-player");
    const opponentAfterCooldown = await score.getAttribute("data-score-opponent");

    expect(playerAfterCooldown).toBe(playerAfterRound);
    expect(opponentAfterCooldown).toBe(opponentAfterRound);
    expect(cardAfter).not.toBe(cardBefore);
  });

  test("scoreboard updates after each round", async ({ page }) => {
    await page.goto("/src/pages/battleCLI.html?seed=1");
    await page.locator("#start-match-button").click();
    await waitForBattleState(page, "waitingForPlayerAction", 15000);
    const score = page.locator("#cli-score");
    await page.keyboard.press("1");
    await waitForBattleState(page, "cooldown", 10000);
    const firstPlayer = await score.getAttribute("data-score-player");
    const firstOpponent = await score.getAttribute("data-score-opponent");

    await page.keyboard.press("Enter");
    await waitForBattleState(page, "waitingForPlayerAction", 10000);
    await page.keyboard.press("1");
    await waitForBattleState(page, "cooldown", 10000);
    const secondPlayer = await score.getAttribute("data-score-player");
    const secondOpponent = await score.getAttribute("data-score-opponent");
    expect(Number(secondPlayer) + Number(secondOpponent)).toBeGreaterThanOrEqual(
      Number(firstPlayer) + Number(firstOpponent)
    );
  });

  test("allows tab navigation without invalid key messages", async ({ page }) => {
    await page.goto("/src/pages/battleCLI.html");
    await page.locator("#start-match-button").click();
    await waitForBattleState(page, "waitingForPlayerAction", 15000);
    const countdown = page.locator("#cli-countdown");

    const steps = ["Tab", "Tab", "Tab", "Shift+Tab", "Tab", "Tab", "Tab", "Tab", "Tab"];
    for (const step of steps) {
      await page.keyboard.press(step);
      await expect(countdown).not.toContainText("Invalid key");
    }

    await page.keyboard.press("q");
    const confirm = page.locator("#confirm-quit-button");
    await expect(confirm).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(countdown).not.toContainText("Invalid key");
    await page.keyboard.press("Shift+Tab");
    await expect(countdown).not.toContainText("Invalid key");
  });

  test("returns to lobby after quitting", async ({ page }) => {
    await page.goto("/src/pages/battleCLI.html");
    await page.locator("#start-match-button").click();
    await waitForBattleState(page, "waitingForPlayerAction", 15000);
    await page.keyboard.press("q");
    const confirm = page.locator("#confirm-quit-button");
    await expect(confirm).toBeVisible();
    await confirm.click();
    await page.waitForURL("**/index.html");
    await expect(page.locator(".home-screen")).toBeVisible();
  });
});
