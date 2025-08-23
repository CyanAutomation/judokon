import playwright from "playwright";

async function run() {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = [];
  page.on("console", (m) => logs.push({ type: m.type(), text: m.text() }));
  page.on("pageerror", (e) => logs.push({ type: "pageerror", text: String(e) }));

  // use autostart=1 to bypass the round-select modal in automated tests
  const url = "http://localhost:3000/src/pages/battleJudoka.html?autostart=1";
  console.log("navigating to", url);
  await page.goto(url, { waitUntil: "networkidle" });

  // capture orchestrator debug signals exposed to window for diagnostics
  const debugSnapshot = await page.evaluate(() => {
    try {
      return {
        state: window.__classicBattleState || null,
        prev: window.__classicBattlePrevState || null,
        lastEvent: window.__classicBattleLastEvent || null,
        stateLogLength: Array.isArray(window.__classicBattleStateLog)
          ? window.__classicBattleStateLog.length
          : 0,
        hasMachineGetter: typeof window.__getClassicBattleMachine === "function",
        roundSelectPresent: !!document.getElementById("round-select-title"),
        opponentChildren: document.getElementById("opponent-card")?.children?.length || 0,
        playerChildren: document.getElementById("player-card")?.children?.length || 0
      };
    } catch (e) {
      return { error: String(e) };
    }
  });
  console.log("orchestrator debug snapshot:", JSON.stringify(debugSnapshot, null, 2));

  // Wait for UI to initialize
  await page.waitForSelector("#stat-buttons", { timeout: 5000 });

  // helper to choose a stat button
  async function clickStat() {
    const btns = await page.$$("#stat-buttons button");
    for (const b of btns) {
      try {
        const disabled = await b.getAttribute("disabled");
        if (disabled !== null) continue;
        await b.click({ timeout: 2000 });
        return true;
      } catch {
        // ignore and try next
      }
    }
    return false;
  }

  // progress monitoring
  const progress = [];

  // Attempt up to 12 rounds
  for (let round = 1; round <= 12; round++) {
    console.log("round", round);
    // choose a stat
    const ok = await clickStat();
    if (!ok) {
      console.log("no clickable stat found");
      break;
    }

    // wait a short while for result to appear
    await page.waitForTimeout(400);

    // capture round-result text
    const resultText = await page.$eval("#round-result", (el) => el.textContent || "");
    progress.push({ round, resultText });
    console.log("round-result:", resultText.trim());

    // click Next if available
    const next = await page.$("#next-button");
    if (next) {
      const isDisabled = await next.getAttribute("disabled");
      if (isDisabled === null) {
        // enabled
        await next.click();
        await page.waitForTimeout(300);
      } else {
        console.log("Next button disabled; trying to continue");
      }
    } else {
      console.log("no next button found");
      break;
    }

    // check for terminal state: battle-state-progress length or text
    const progressCount = await page.$$eval("#battle-state-progress > li", (els) => els.length);
    console.log("progress items:", progressCount);
    if (progressCount >= 5) {
      console.log("reached 5 progress items; stopping");
      break;
    }

    // small wait between rounds
    await page.waitForTimeout(200);
  }

  // capture final DOM snippets
  const roundCounter = await page.$eval("#round-counter", (el) => el.textContent || "");
  const roundMessage = await page.$eval("#round-message", (el) => el.textContent || "");
  const scoreboard = await page.$eval("#score-display", (el) => el.textContent || "");

  console.log("final state:", { roundCounter, roundMessage, scoreboard, progress });

  await page.screenshot({
    path: "playwright-diagnose-battleJudoka-interactive.png",
    fullPage: true
  });
  await browser.close();

  // write logs and summary to console
  console.log("console/page logs:", JSON.stringify(logs, null, 2));
}

run().catch((err) => {
  console.error("error in diagnoser", err);
  process.exit(1);
});
