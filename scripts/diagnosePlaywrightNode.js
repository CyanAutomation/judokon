import playwright from 'playwright';

(async () => {
  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = [];
  page.on('console', msg => logs.push({ type: msg.type(), text: msg.text() }));
  page.on('pageerror', err => logs.push({ type: 'pageerror', text: String(err) }));

  const url = 'http://localhost:3000/src/pages/battleJudoka.html';
  console.log('navigating to', url);
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'playwright-diagnose-battleJudoka.png', fullPage: true });
  console.log('collected logs:', JSON.stringify(logs, null, 2));
  await browser.close();
})();
