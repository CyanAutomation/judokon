#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { chromium } from "playwright";
const root = process.cwd();
const targetFile = path.join(root, "src", "pages", "browseJudoka.html");
const baseArg = process.argv[2] || null; // optional base URL like http://127.0.0.1:5000
const target = baseArg
  ? `${baseArg.replace(/\/$/, "")}/src/pages/browseJudoka.html`
  : `file://${targetFile}`;
if (!baseArg && !fs.existsSync(targetFile)) {
  console.error("Target file not found:", targetFile);
  process.exit(1);
}

const outDir = path.join(root, "test-results", "layout-screenshots");
fs.mkdirSync(outDir, { recursive: true });

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1366, height: 768 }
];

const results = [];

for (const vp of viewports) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();

  const consoleMessages = [];
  page.on("console", (m) => consoleMessages.push({ type: m.type(), text: m.text() }));

  const fileUrl = target;
  console.log(`Loading ${fileUrl} at ${vp.name} (${vp.width}x${vp.height})`);

  try {
    await page.goto(fileUrl, { waitUntil: "networkidle", timeout: 10000 }).catch(() => {});
    // give scripts a moment to run
    await page.waitForTimeout(800);

    const screenshotPath = path.join(outDir, `${vp.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Evaluate layout checks
    const checks = await page.evaluate(() => {
      // page-level horizontal scrollbar
      const pageHasHorizontal =
        document.documentElement.scrollWidth >
        (window.innerWidth || document.documentElement.clientWidth);

      // find country flag container
      const flagTrack =
        document.querySelector(".country-flag-slide-track") ||
        document.querySelector(".country-flag-slider") ||
        document.querySelector("#country-list");
      const flagInfo = flagTrack
        ? {
            exists: true,
            clientWidth: flagTrack.clientWidth,
            scrollWidth: flagTrack.scrollWidth,
            overflowX: getComputedStyle(flagTrack).overflowX
          }
        : { exists: false };

      // detect elements with horizontal overflow
      const nodes = Array.from(document.querySelectorAll("*"));
      const horizontalOverflows = nodes
        .filter((n) => {
          const cs = getComputedStyle(n);
          const ow = cs.overflowX;
          if (ow === "visible") return false;
          try {
            return n.scrollWidth > n.clientWidth + 1; // small tolerance
          } catch {
            return false;
          }
        })
        .slice(0, 10)
        .map((n) => ({
          tag: n.tagName.toLowerCase(),
          classes: n.className || "",
          scrollWidth: n.scrollWidth,
          clientWidth: n.clientWidth
        }));

      // detect card elements with internal vertical scroll
      const cardCandidates = nodes.filter(
        (n) => n.className && n.className.toString().toLowerCase().includes("card")
      );
      const verticalScrollCards = cardCandidates
        .filter((n) => {
          try {
            return n.scrollHeight > n.clientHeight + 1;
          } catch {
            return false;
          }
        })
        .slice(0, 5)
        .map((n) => ({ tag: n.tagName.toLowerCase(), classes: n.className }));

      return { pageHasHorizontal, flagInfo, horizontalOverflows, verticalScrollCards };
    });

    results.push({ viewport: vp, screenshot: screenshotPath, consoleMessages, checks });
  } catch (err) {
    console.error("Error during run:", err);
    results.push({ viewport: vp, error: String(err) });
  } finally {
    await browser.close();
  }
}

const outJson = path.join(outDir, "layout-assessment.json");
fs.writeFileSync(outJson, JSON.stringify(results, null, 2), "utf8");
console.log("Assessment complete. Results saved to:", outJson);
for (const r of results) {
  console.log(
    `- ${r.viewport.name}: screenshot=${r.screenshot || "n/a"}; error=${r.error || "none"}`
  );
}

process.exit(0);
