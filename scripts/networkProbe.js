import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const notFounds = [];

  page.on("response", (res) => {
    try {
      const status = res.status();
      if (status === 404) {
        notFounds.push({ url: res.url(), status });
        console.log("404:", res.url());
      }
    } catch {}
  });

  page.on("requestfailed", (req) => {
    try {
      console.log("requestfailed", req.url(), req.failure()?.errorText || "");
    } catch {}
  });

  const url = "http://localhost:5000/src/pages/battleJudoka.html?autostart=1";
  console.log("navigating to", url);
  try {
    await page.goto(url, { waitUntil: "load", timeout: 15000 });
  } catch (err) {
    console.error("goto error", String(err));
  }

  // wait a moment for late requests
  await page.waitForTimeout(1000);

  if (notFounds.length === 0) console.log("No 404s detected");
  else console.log("404 list:", JSON.stringify(notFounds, null, 2));

  await browser.close();
})();
