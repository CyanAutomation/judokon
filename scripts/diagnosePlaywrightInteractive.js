import playwright from "playwright";
import {
  buildBaseUrl,
  installSelectorGuard,
  attachLoggers,
  waitButtonsReady,
  getStatButtons,
  tryClickStat,
  getBattleSnapshot,
  takeScreenshot
} from "./lib/debugUtils.js";

async function run() {
  const headless = process.env.HEADLESS !== "0";
  const base = buildBaseUrl();
  const url = `${base}/src/pages/battleJudoka.html?autostart=1`;
  const browser = await playwright.chromium.launch({ headless });
  const context = await browser.newContext();
  const page = await context.newPage();

  installSelectorGuard(page);
  const logs = attachLoggers(page, { collect: true });

  console.log("navigating to", url);
  await page.goto(url, { waitUntil: "domcontentloaded" });

  await waitButtonsReady(page, { requireReadyFlag: true, timeout: 10000 });

  // progress monitoring
  const progress = [];

  for (let round = 1; round <= 12; round++) {
    console.log("round", round);
    // choose the first enabled stat and click
    const buttons = await getStatButtons(page);
    const first = buttons.find((b) => !b.disabled);
    let clicked = false;
    if (first) {
      const res = await tryClickStat(page, first.stat, { timeout: 2000 });
      clicked = !!res.ok;
    }
    if (!clicked) {
      console.log("no clickable stat found");
      break;
    }

    await page.waitForTimeout(400);

    const snap = await getBattleSnapshot(page);
    progress.push({ round, resultText: snap.roundResult?.trim?.() || "" });
    console.log("round-result:", (snap.roundResult || "").trim());

    // click Next if available
    const next = await page.$('[data-role="next-round"]');
    if (next) {
      const isDisabled = await next.getAttribute("disabled");
      if (isDisabled === null) {
        await next.click();
        await page.waitForTimeout(300);
      } else {
        console.log("Next button disabled; trying to continue");
      }
    } else {
      console.log("no next button found");
      break;
    }

    if ((snap.progressCount || 0) >= 5) {
      console.log("reached 5 progress items; stopping");
      break;
    }
    await page.waitForTimeout(200);
  }

  const finalSnap = await getBattleSnapshot(page);
  console.log(
    "final state:",
    JSON.stringify(
      {
        roundCounter: finalSnap.roundCounter,
        roundMessage: finalSnap.roundMessage,
        scoreboard: finalSnap.scoreboard,
        progress,
        state: finalSnap.state
      },
      null,
      2
    )
  );

  await takeScreenshot(page, "playwright-diagnose-battleJudoka-interactive.png");
  await browser.close();

  // write logs and summary to console
  console.log("console/page logs:", JSON.stringify(logs, null, 2));
}

run().catch((err) => {
  console.error("error in diagnoser", err);
  process.exit(1);
});
