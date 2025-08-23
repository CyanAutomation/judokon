import { chromium } from "playwright";

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const notFounds = [];

  page.on("response", (res) => {
    try {
      const status = res.status();
      const now = Date.now();
      const entry = {
        ts: now,
        url: res.url(),
        status,
        type: res.request().resourceType(),
        method: res.request().method()
      };
      console.log("RESPONSE", entry.status, entry.method, entry.type, entry.url);
      if (status === 404) {
        notFounds.push(entry);
        console.log(">>> 404 detected:", entry.url);
      }
    } catch {}
  });

  page.on("requestfailed", (req) => {
    try {
      console.log("REQUEST FAILED", req.url(), req.failure()?.errorText || "");
    } catch {}
  });

  const url = "http://localhost:5000/src/pages/battleJudoka.html?autostart=1";
  console.log("navigating to", url);
  try {
    await page.goto(url, { waitUntil: "load", timeout: 15000 });
  } catch (err) {
    console.error("goto error", String(err));
  }

  // wait a bit for late requests to finish
  await page.waitForTimeout(1000);

  if (notFounds.length === 0) console.log("No 404s detected");
  else console.log("404 list:", JSON.stringify(notFounds, null, 2));

  await browser.close();
})();
