import { chromium } from "playwright";
import { resolve } from "path";

async function run() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  const file = "file://" + resolve(process.cwd(), "src/pages/battleCLI.html");
  await page.goto(file);

  const selectors = [
    "#cli-header",
    "#cli-header > .cli-title",
    "#cli-header > .cli-controls",
    "#cli-header > .cli-status",
    "#cli-round",
    "#cli-score"
  ];

  for (const sel of selectors) {
    const exists = await page.$(sel);
    if (!exists) {
      console.log(`${sel} → not found`);
      continue;
    }
    const box = await page.evaluate((s) => {
      const el = document.querySelector(s);
      const r = el.getBoundingClientRect();
      const cs = window.getComputedStyle(el);
      return {
        sel: s,
        rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        display: cs.display,
        position: cs.position,
        marginTop: cs.marginTop,
        marginBottom: cs.marginBottom,
        marginLeft: cs.marginLeft,
        marginRight: cs.marginRight,
        top: cs.top,
        transform: cs.transform
      };
    }, sel);
    console.log(JSON.stringify(box, null, 2));
  }

  await browser.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
