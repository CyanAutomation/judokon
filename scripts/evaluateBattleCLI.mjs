import fs from "fs";
import path from "path";
import playwright from "playwright";

const outDir = path.resolve(new URL(".", import.meta.url).pathname, "eval-results");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

const htmlUrl = new URL("../src/pages/battleCLI.html", import.meta.url).href;

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  await page.goto(htmlUrl, { waitUntil: "networkidle" });

  // short pause to allow fonts/styles to settle
  await page.waitForTimeout(250);

  // Full page screenshot
  const fullPath = path.join(outDir, "battleCLI-full.png");
  await page.screenshot({ path: fullPath, fullPage: true });

  // Header and main screenshots
  const headerEl = await page.$("#cli-header");
  const mainEl = await page.$("#cli-main");
  const headerPath = path.join(outDir, "battleCLI-header.png");
  const mainPath = path.join(outDir, "battleCLI-main.png");
  if (headerEl) await headerEl.screenshot({ path: headerPath });
  if (mainEl) await mainEl.screenshot({ path: mainPath });

  // Accessibility snapshot
  const ax = await page.accessibility.snapshot();
  fs.writeFileSync(path.join(outDir, "accessibility.json"), JSON.stringify(ax, null, 2));

  // Computed style and contrast checks
  const styleSummary = await page.evaluate(() => {
    function parseRGB(s) {
      if (!s) return null;
      // handle hex or rgb(a)
      if (s.startsWith("#")) {
        const bigint = parseInt(s.slice(1), 16);
        if (s.length === 7) {
          return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255, 1];
        }
      }
      const m = s.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([0-9.]+))?\)/);
      if (m) return [Number(m[1]), Number(m[2]), Number(m[3]), m[4] ? Number(m[4]) : 1];
      return null;
    }
    function luminance([r, g, b]) {
      const srgb = [r, g, b]
        .map((v) => v / 255)
        .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
      return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
    }
    function contrastRatio(c1, c2) {
      const L1 = luminance(c1) + 0.05;
      const L2 = luminance(c2) + 0.05;
      return Math.max(L1, L2) / Math.min(L1, L2);
    }

    const bodyStyle = getComputedStyle(document.body);
    const bodyBg = bodyStyle.backgroundColor || bodyStyle["background"];
    const bodyColor = bodyStyle.color;

    const header = document.querySelector("#cli-header");
    const headerStyle = header ? getComputedStyle(header) : null;
    const headerBg = headerStyle ? headerStyle.backgroundColor : null;
    const headerColor = headerStyle ? headerStyle.color : null;

    const stat = document.querySelector(".cli-stat");
    const statStyle = stat ? getComputedStyle(stat) : null;

    const parsedBodyBg = parseRGB(bodyBg);
    const parsedBodyColor = parseRGB(bodyColor);

    const parsedStatBg = statStyle ? parseRGB(statStyle.backgroundColor) : null;
    const parsedStatColor = statStyle ? parseRGB(statStyle.color) : null;

    const contrastBody =
      parsedBodyBg && parsedBodyColor ? contrastRatio(parsedBodyColor, parsedBodyBg) : null;
    const contrastStat =
      parsedStatBg && parsedStatColor ? contrastRatio(parsedStatColor, parsedStatBg) : null;

    return {
      body: { background: bodyBg, color: bodyColor, contrastTextOnBg: contrastBody },
      header: { background: headerBg, color: headerColor },
      sampleStat: stat
        ? {
            text: stat.textContent.trim(),
            background: statStyle.backgroundColor,
            color: statStyle.color,
            contrastTextOnBg: contrastStat
          }
        : null,
      viewport: { width: window.innerWidth, height: window.innerHeight }
    };
  });

  fs.writeFileSync(path.join(outDir, "style-summary.json"), JSON.stringify(styleSummary, null, 2));

  // Collect a small DOM snapshot of CLI-specific elements
  const domSnapshot = await page.evaluate(() => {
    const snapshot = {};
    const ids = [
      "cli-root",
      "cli-header",
      "cli-round",
      "cli-score",
      "round-message",
      "cli-stats",
      "cli-controls-hint",
      "snackbar-container"
    ];
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (!el) return;
      snapshot[id] = {
        id,
        role: el.getAttribute("role"),
        ariaLive: el.getAttribute("aria-live"),
        hidden: el.hasAttribute("hidden"),
        text: el.textContent.trim().slice(0, 200)
      };
    });
    return snapshot;
  });
  fs.writeFileSync(path.join(outDir, "dom-snapshot.json"), JSON.stringify(domSnapshot, null, 2));

  // Print concise JSON summary to stdout for the caller
  const summary = {
    screenshots: {
      full: fullPath,
      header: fs.existsSync(headerPath) ? headerPath : null,
      main: fs.existsSync(mainPath) ? mainPath : null
    },
    accessibilityFile: path.join(outDir, "accessibility.json"),
    styleSummaryFile: path.join(outDir, "style-summary.json"),
    domSnapshotFile: path.join(outDir, "dom-snapshot.json")
  };

  console.log(JSON.stringify(summary, null, 2));

  await browser.close();
  process.exit(0);
})();
