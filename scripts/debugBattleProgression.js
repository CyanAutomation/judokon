import { chromium } from 'playwright';

(async function run() {
  const browser = await chromium.launch({ executablePath: '/usr/bin/google-chrome', headless: true });
  const page = await browser.newPage();
  page.on('console', (m) => console.log('PAGE LOG>', m.type(), m.text()));
  try {
  await page.goto('http://localhost:5000/src/pages/battleJudoka.html?autostart=1');
    console.log('TITLE', await page.title());

    // Wait for machine to initialize
    await page.waitForFunction(() => typeof window.__classicBattleState !== 'undefined', { timeout: 10000 });
    console.log('MACHINE STATE', await page.evaluate(() => window.__classicBattleState));

    await page.waitForSelector('#stat-buttons');
    await page.waitForFunction(() => document.querySelectorAll('#stat-buttons button').length >= 5, { timeout: 5000 });
    const names = await page.$$eval('#stat-buttons button', (els) => els.map((b) => ({ text: b.textContent, stat: b.dataset.stat, disabled: b.disabled })));
    console.log('STAT BUTTONS', JSON.stringify(names));

    // Click the power button
    await page.click('#stat-buttons button[data-stat="power"]');
    console.log('CLICKED POWER');

    // Wait for orchestrator guard / resolution to run
    await page.waitForTimeout(1600);

    const state = await page.evaluate(() => ({
      state: window.__classicBattleState || null,
      prev: window.__classicBattlePrevState || null,
      lastEvent: window.__classicBattleLastEvent || null,
      log: window.__classicBattleStateLog || [],
      roundDebug: window.__roundDebug || null,
      guardFiredAt: window.__guardFiredAt || null,
      guardOutcome: window.__guardOutcomeEvent || null,
      store: window.battleStore ? { selectionMade: window.battleStore.selectionMade, playerChoice: window.battleStore.playerChoice } : null,
      machineTimer: document.getElementById('machine-timer') ? { remaining: document.getElementById('machine-timer').dataset.remaining, paused: document.getElementById('machine-timer').dataset.paused } : null,
      machineStateEl: document.getElementById('machine-state') ? document.getElementById('machine-state').textContent : null
    }));
    console.log('AFTER CLICK', JSON.stringify(state, null, 2));

    const debug = await page.$eval('#debug-output', (el) => el.textContent).catch(() => null);
    console.log('DEBUG PANEL', debug);

    await page.screenshot({ path: '/workspaces/judokon/playwright-battleProgression.png', fullPage: true });
    console.log('screenshot saved');
  } catch (err) {
    console.error('ERROR', err);
  } finally {
    await browser.close();
  }
})();
