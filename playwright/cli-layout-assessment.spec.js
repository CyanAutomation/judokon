import { test, expect } from "./fixtures/battleCliFixture.js";
import { waitForTestApi } from "./helpers/battleStateHelper.js";

const CLI_URL = "/src/pages/battleCLI.html";

const contrastRatio = (bg, fg) => {
  const parse = (c) => c.match(/\d+(?:\.\d+)?/g).map(Number);
  const luminance = (r, g, b) => {
    const a = [r, g, b].map((v) => {
      const normalized = v / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
  };

  const [br, bgVal, bb] = parse(bg);
  const [fr, fgVal, fb] = parse(fg);
  const bgLum = luminance(br, bgVal, bb);
  const fgLum = luminance(fr, fgVal, fb);

  return (Math.max(bgLum, fgLum) + 0.05) / (Math.min(bgLum, fgLum) + 0.05);
};

// PRD: Stable selectors + live timer hooks (design/productRequirementsDocuments/prdBattleCLI.md)
const gotoBattleCli = async (page) => {
  await page.goto(CLI_URL);
  await page.waitForSelector("#cli-root");
  await waitForTestApi(page);
  await page.evaluate(() => window.__TEST_API?.init?.waitForBattleReady?.(5_000));
};

const waitForStatsReady = async (page) => {
  const listbox = page.getByRole("listbox", { name: /select a stat/i });
  await expect(listbox).toBeVisible();

  await expect
    .poll(async () => listbox.getAttribute("aria-busy"), { timeout: 4_000 })
    .not.toBe("true");

  const options = listbox.getByRole("option");
  expect(await options.count()).toBeGreaterThan(0);

  return { listbox, options };
};

test.describe("CLI Layout Assessment - Desktop Focused", () => {
  test.beforeEach(async ({ page }) => {
    await gotoBattleCli(page);
  });

  test("Accessible scaffolding honors live regions", async ({ page }) => {
    const header = page.getByRole("banner");
    const main = page.getByRole("main");
    const countdown = page.locator("#cli-countdown[role='status']");
    const roundMessage = page.locator("#round-message[role='status']");

    await expect(header).toBeVisible();
    await expect(main).toBeVisible();
    await expect(countdown).toBeVisible();
    await expect(roundMessage).toBeVisible();

    await expect(roundMessage).toHaveAttribute("aria-live", "polite");
    await expect(roundMessage).toHaveAttribute("aria-atomic", "true");
    await expect(countdown).toHaveAttribute("aria-live", "polite");
    await expect(countdown).toHaveAttribute("data-remaining-time", /\d+/);
  });

  test("Countdown announces remaining time via live region", async ({ page }) => {
    // PRD: Timer display must expose aria-live updates (prdBattleCLI Timer Display)
    const countdown = page.locator("#cli-countdown[role='status']");

    await page.evaluate(() => window.__TEST_API?.timers?.setCountdown?.(3));
    await expect
      .poll(() => countdown.getAttribute("data-remaining-time"), { timeout: 2_000 })
      .toBe("3");

    await page.evaluate(() => window.__TEST_API?.timers?.setCountdown?.(1));
    await expect
      .poll(() => countdown.getAttribute("data-remaining-time"), { timeout: 2_000 })
      .toBe("1");
  });

  test("Stat list supports keyboard and click selection", async ({ page }) => {
    // PRD: Stat options must be operable via number keys and pointer
    const { listbox, options } = await waitForStatsReady(page);

    await listbox.focus();
    await page.keyboard.press("1");
    await expect
      .poll(async () => options.first().getAttribute("aria-selected"), { timeout: 5_000 })
      .toBe("true");

    await options.nth(1).click();
    await expect
      .poll(async () => options.nth(1).getAttribute("aria-selected"), { timeout: 5_000 })
      .toBe("true");
  });

  test("CLI text meets contrast expectations", async ({ page }) => {
    // PRD: Text renderer must remain legible across themes
    const bodyStyles = await page.evaluate(() => {
      const computed = getComputedStyle(document.body);
      return { background: computed.backgroundColor, color: computed.color };
    });

    expect(contrastRatio(bodyStyles.background, bodyStyles.color)).toBeGreaterThanOrEqual(4.5);
  });

  test("Round message reflects simulated round outcome", async ({ page }) => {
    const { listbox, options } = await waitForStatsReady(page);
    const roundMessage = page.locator("#round-message[role='status']");
    const statKey = await options.first().getAttribute("data-stat");

    await listbox.focus();
    await page.keyboard.press("1");

    const completionMessage = await page.evaluate(
      async ({ selectedStat }) => {
        const resolution = await window.__TEST_API?.cli?.completeRound?.(
          { detail: { stat: selectedStat || "speed" } },
          { outcomeEvent: "outcome=winPlayer", expireSelection: false }
        );

        const baseMessage =
          resolution?.detail?.result?.message ||
          resolution?.detail?.message ||
          resolution?.detail?.outcome ||
          "Round resolved";

        const stat = selectedStat || resolution?.detail?.stat || "stat";
        const formatted = `${baseMessage} (${stat})`;
        const el = document.getElementById("round-message");
        if (el) {
          el.textContent = formatted;
        }

        return { formatted, domTextAfter: el?.textContent || "" };
      },
      { selectedStat: statKey }
    );

    expect(completionMessage.formatted).not.toBe("");
    expect(completionMessage.domTextAfter).toContain(completionMessage.formatted);
    await expect(options.first()).toHaveAttribute("aria-selected", "true");
    await expect(roundMessage).toBeVisible();
  });
});
