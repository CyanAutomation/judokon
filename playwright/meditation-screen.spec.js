import { test, expect } from "./fixtures/commonSetup.js";
import { verifyPageBasics } from "./fixtures/navigationChecks.js";
import { configureApp } from "./fixtures/appConfig.js";

const quoteFixtures = [
  {
    fables: [{ id: 1, title: "Still Lake", story: "Calm waters mirror the sky." }],
    meta: [{ id: 1, title: "Still Lake" }]
  },
  {
    fables: [{ id: 2, title: "Quiet Forest", story: "Leaves hush the wind into silence." }],
    meta: [{ id: 2, title: "Quiet Forest" }]
  },
  {
    fables: [{ id: 3, title: "New Dawn", story: "Fresh light greets patient minds." }],
    meta: [{ id: 3, title: "New Dawn" }]
  }
];

async function stubQuoteResponses(page) {
  let fableResponseCount = 0;
  let metaResponseCount = 0;

  await page.route("**/src/data/aesopsFables.json", (route) => {
    const payload = quoteFixtures[Math.min(fableResponseCount, quoteFixtures.length - 1)].fables;
    fableResponseCount += 1;
    return route.fulfill({
      status: 200,
      headers: { "cache-control": "no-store" },
      contentType: "application/json",
      body: JSON.stringify(payload)
    });
  });

  await page.route("**/src/data/aesopsMeta.json", (route) => {
    const payload = quoteFixtures[Math.min(metaResponseCount, quoteFixtures.length - 1)].meta;
    metaResponseCount += 1;
    return route.fulfill({
      status: 200,
      headers: { "cache-control": "no-store" },
      contentType: "application/json",
      body: JSON.stringify(payload)
    });
  });
}

async function loadMeditation(page, { settings = { typewriterEffect: false } } = {}) {
  const app = await configureApp(page, { settings });
  await page.goto("/src/pages/meditation.html");
  await app.applyRuntime();
  await page.waitForFunction(() => Boolean(window.quoteReadyPromise));
  await page.evaluate(() => window.quoteReadyPromise);
}

test.describe("Meditation screen", () => {
  test.beforeEach(async ({ page }) => {
    await stubQuoteResponses(page);
  });

  test("navigation check", async ({ page }) => {
    await loadMeditation(page);
    await verifyPageBasics(page, [], [], { expectNav: false }); // Meditation screen has no navigation bar
    await expect(page.locator("nav.top-navbar")).toHaveCount(0);
  });

  test("elements visible with accessibility attributes", async ({ page }) => {
    await loadMeditation(page);
    await expect(page.getByRole("heading", { name: /pause\. breathe\. reflect\./i })).toBeVisible();
    await expect(page.getByAltText(/KG is ready to meditate/i)).toBeVisible();
    const quote = page.locator("#quote");
    await expect(quote).toBeVisible();
    await expect(quote).toHaveAttribute("aria-labelledby", "quote-heading");
    await expect(quote).toHaveAttribute("aria-describedby", "quote-content");
    await expect(page.getByTestId("continue-link")).toBeVisible();
  });

  test("continue button navigates home", async ({ page }) => {
    await loadMeditation(page);
    await page.evaluate(() => {
      sessionStorage.setItem("meditationSession", "complete");
    });
    await page.getByTestId("continue-link").click();
    await expect(page).toHaveURL(/index\.html/);
    await expect
      .poll(() => page.evaluate(() => sessionStorage.getItem("meditationSession")))
      .toBe("complete");
    await expect
      .poll(() => page.evaluate(() => window.Sentry?.getCurrentHub?.()?.getClient?.().id))
      .toBe("sentry-stub");
  });

  test("quote refresh updates content and respects animation settings", async ({ page }) => {
    const settingsOverrides = { typewriterEffect: false, motionEffects: false };
    await loadMeditation(page, { settings: settingsOverrides });
    await page.waitForFunction(() => {
      const heading = document.querySelector("#quote-heading");
      const content = document.querySelector("#quote-content");
      return (
        heading &&
        content &&
        heading.textContent &&
        heading.textContent.trim() &&
        content.textContent &&
        content.textContent.trim()
      );
    });
    const initialTitle = (await page.locator("#quote-heading").textContent()) ?? "";
    const initialStory = (await page.locator("#quote-content").textContent()) ?? "";

    const appliedSettings = await page.evaluate(async (overrides) => {
      const [{ updateSetting }, cache] = await Promise.all([
        import("../helpers/settingsStorage.js"),
        import("../helpers/settingsCache.js")
      ]);
      await Promise.all([
        updateSetting("typewriterEffect", overrides.typewriterEffect),
        updateSetting("motionEffects", overrides.motionEffects)
      ]);
      return {
        typewriter: cache.getSetting("typewriterEffect"),
        motion: cache.getSetting("motionEffects")
      };
    }, settingsOverrides);
    expect(appliedSettings.typewriter).toBe(settingsOverrides.typewriterEffect);
    expect(appliedSettings.motion).toBe(settingsOverrides.motionEffects);

    await page.evaluate(async (motionEffects) => {
      const module = await import("../helpers/motionUtils.js");
      module.applyMotionPreference(motionEffects);
    }, settingsOverrides.motionEffects);
    await expect(page.locator("body")).toHaveClass(/reduce-motion/);

    await page.evaluate(async () => {
      const module = await import("../helpers/quoteBuilder.js");
      await module.loadQuote();
    });

    await page.waitForFunction(() => {
      const heading = document.querySelector("#quote-heading");
      const content = document.querySelector("#quote-content");
      return heading && content && heading.textContent && content.textContent;
    });

    await expect(page.locator("#quote-heading")).not.toHaveText(initialTitle);
    await expect(page.locator("#quote-content")).not.toHaveText(initialStory);
  });

  test("keyboard navigation and ARIA landmarks are available", async ({ page }) => {
    await loadMeditation(page);
    await expect(page.getByRole("main")).toBeVisible();
    await expect(page.locator("#quote-loader")).toHaveAttribute("aria-live", "polite");
    await expect(page.locator("#quote-loader")).toHaveAttribute("aria-busy", "true");
    await expect(page.locator("#quote")).toHaveAttribute("role", "region");
    await expect(page.locator("#quote")).toHaveAttribute("aria-live", "polite");
    await expect(page.locator("#language-announcement")).toContainText(
      /language toggle available/i
    );

    const languageToggle = page.getByTestId("language-toggle");
    await languageToggle.focus();
    await expect(languageToggle).toBeFocused();
    await page.keyboard.press("Tab");
    const continueLink = page.getByTestId("continue-link");
    await expect(continueLink).toBeFocused();
    const currentUrl = page.url();
    await page.keyboard.press("Escape");
    await expect(page).toHaveURL(currentUrl);
  });
});
