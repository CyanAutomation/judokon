import { chromium } from "playwright";
import {
  buildBaseUrl,
  getBattleSnapshot,
  takeScreenshot,
  getStatButtons,
  tryClickStat
} from "./lib/debugUtils.js";

(async () => {
  const headless = process.env.HEADLESS !== "0";
  const base = buildBaseUrl();
  const url = `${base}/src/pages/battleJudoka.html?autostart=1`;
  const browser = await chromium.launch({ headless });
  const ctx = await browser.newContext();
  const page = await ctx.newPage();

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 15000 });
  console.log("TITLE", await page.title());

  // wait for stat buttons
  await page.waitForSelector("#stat-buttons", { timeout: 5000 }).catch(() => {});
  const pre = await getBattleSnapshot(page).catch(() => null);
  console.log("PRE SNAP", JSON.stringify(pre, null, 2));
  await takeScreenshot(page, "/workspaces/judokon/runRound-pre.png");

  // choose first available stat
  const names = await getStatButtons(page);
  console.log("STAT BUTTONS", JSON.stringify(names));
  const stat = names[0]?.stat || "power";
  const clickRes = await tryClickStat(page, stat, { force: true, timeout: 2000 });
  console.log("CLICK", stat, clickRes);

  // poll for state change to roundOver or until timeout
  const deadline = Date.now() + (Number(process.env.WAIT_MS) || 8000);
  let finalSnap = null;
  while (Date.now() < deadline) {
    await page.waitForTimeout(200);
    const snap = await getBattleSnapshot(page).catch(() => null);
    console.log(
      "POLL",
      snap?.state,
      "store:",
      snap?.store?.selectionMade,
      "guard:",
      snap?.guardOutcomeEvent
    );
    if (snap?.state === "roundOver" || snap?.state === "cooldown" || snap?.guardOutcomeEvent) {
      finalSnap = snap;
      break;
    }
  }

  if (!finalSnap) finalSnap = await getBattleSnapshot(page).catch(() => null);
  console.log("FINAL SNAP", JSON.stringify(finalSnap, null, 2));
  await takeScreenshot(page, "/workspaces/judokon/runRound-final.png");

  await browser.close();
})();
