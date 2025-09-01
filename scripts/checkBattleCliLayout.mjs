import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const outDir = path.resolve(process.cwd(), "test-results");
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function hexToRgb(hex) {
  const m = hex.replace("#", "");
  const bigint = parseInt(
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m,
    16
  );
  return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function luminance([r, g, b]) {
  const srgb = [r, g, b]
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
}

function contrastHex(aHex, bHex) {
  const a = hexToRgb(aHex);
  const b = hexToRgb(bHex);
  const L1 = luminance(a);
  const L2 = luminance(b);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return +((lighter + 0.05) / (darker + 0.05)).toFixed(2);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  const fileUrl = "file://" + path.resolve(process.cwd(), "src/pages/battleCLI.html");
  console.log("Loading", fileUrl);
  await page.goto(fileUrl, { waitUntil: "networkidle" });

  // Ensure focusable
  await page.evaluate(() => document.body.focus());

  const selectors = [
    "#cli-root",
    "#cli-header",
    "#round-message",
    "#cli-countdown",
    "#cli-stats",
    "#cli-score",
    "#cli-shortcuts",
    "#cli-verbose-section"
  ];

  const results = {};
  for (const sel of selectors) {
    const el = await page.$(sel);
    if (!el) {
      results[sel] = { found: false };
      continue;
    }
    const box = await el.boundingBox();
    const styles = await page.evaluate((s) => {
      const e = document.querySelector(s);
      const cs = window.getComputedStyle(e);
      return {
        color: cs.color,
        background: cs.backgroundColor || cs.background,
        fontSize: cs.fontSize,
        lineHeight: cs.lineHeight,
        minHeight: cs.minHeight,
        display: cs.display
      };
    }, sel);

    // normalize rgb(a) to hex when possible
    function rgbToHex(str) {
      const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
      if (!m) return null;
      const r = parseInt(m[1], 10),
        g = parseInt(m[2], 10),
        b = parseInt(m[3], 10);
      return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    const fg = rgbToHex(styles.color) || styles.color;
    const bg = rgbToHex(styles.background) || styles.background;
    let contrast = null;
    try {
      contrast = contrastHex(fg, bg);
    } catch {
      /* ignore */
    }

    results[sel] = {
      found: true,
      box,
      styles: { ...styles, fg: fg, bg: bg, contrast }
    };
  }

  // capture screenshot
  const screenshotPath = path.join(outDir, "battleCLI-screenshot.png");
  await page.screenshot({ path: screenshotPath, fullPage: true });

  // Save JSON
  const outPath = path.join(outDir, "battleCLI-layout.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify({ url: fileUrl, timestamp: Date.now(), results }, null, 2)
  );

  console.log("Saved screenshot to", screenshotPath);
  console.log("Saved layout JSON to", outPath);

  // Print a compact summary
  for (const [sel, info] of Object.entries(results)) {
    if (!info.found) {
      console.log(sel, "→ MISSING");
      continue;
    }
    console.log(
      sel,
      "→",
      info.box
        ? `${Math.round(info.box.width)}x${Math.round(info.box.height)}@${Math.round(info.box.x)},${Math.round(info.box.y)}`
        : "no-box",
      "contrast:",
      info.styles.contrast
    );
  }

  await browser.close();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
