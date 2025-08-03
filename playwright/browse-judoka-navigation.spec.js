import { test, expect } from "./fixtures/commonSetup.js";

test.describe("Browse Judoka navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.unroute("**/src/data/judoka.json");
    await page.route("**/src/data/judoka.json", (route) =>
      route.fulfill({ path: "tests/fixtures/judoka-carousel.json" })
    );
    await page.goto("/src/pages/browseJudoka.html");
  });

  test("desktop arrow keys update markers and disable buttons", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.reload();
    await page.waitForSelector('[data-testid="carousel"] .judoka-card');

    const container = page.locator('[data-testid="carousel"]');
    const left = page.getByRole("button", { name: /prev\.?/i });
    const right = page.getByRole("button", { name: /next/i });
    const counter = page.locator(".page-counter");

    await expect(counter).toHaveText("Page 1 of 3");
    await expect(left).toBeDisabled();

    await container.evaluate(() => {
      const el = document.querySelector('[data-testid="carousel"]');
      const press = (key) => el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      press("ArrowRight");
      press("ArrowRight");
      press("ArrowRight");
    });

    await expect.poll(() => counter.textContent()).not.toBe("Page 1 of 3");
    await expect(right).toBeDisabled();

    await container.evaluate(() => {
      const el = document.querySelector('[data-testid="carousel"]');
      const press = (key) => el.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      press("ArrowLeft");
      press("ArrowLeft");
      press("ArrowLeft");
    });

    await expect.poll(() => counter.textContent()).toBe("Page 1 of 3");
    await expect(left).toBeDisabled();
  });

  test("mobile swipe updates markers and disables buttons", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    await page.reload();
    const container = page.locator(".card-carousel");
    await page.waitForSelector('[data-testid="carousel"] .judoka-card');

    const left = page.getByRole("button", { name: /prev\.?/i });
    const right = page.getByRole("button", { name: /next/i });
    const counter = page.locator(".page-counter");

    await expect(counter).toHaveText("Page 1 of 3");
    await expect(left).toBeDisabled();

    const box = await container.boundingBox();
    const startX = box.x + box.width * 0.9;
    const y = box.y + box.height / 2;
    const swipe = (from, to) =>
      page.evaluate(
        ({ from, to, y }) => {
          const el = document.querySelector(".card-carousel");
          el.dispatchEvent(
            new TouchEvent("touchstart", {
              bubbles: true,
              cancelable: true,
              touches: [new Touch({ identifier: 1, target: el, clientX: from, clientY: y })]
            })
          );
          el.dispatchEvent(
            new TouchEvent("touchend", {
              bubbles: true,
              cancelable: true,
              changedTouches: [new Touch({ identifier: 1, target: el, clientX: to, clientY: y })]
            })
          );
        },
        { from, to, y }
      );

    await swipe(startX, startX - 600);
    await swipe(startX, startX - 600);
    await expect.poll(() => counter.textContent()).not.toBe("Page 1 of 3");
    await expect(right).toBeDisabled();

    await swipe(box.x + box.width * 0.1, box.x + box.width * 0.1 + 600);
    await swipe(box.x + box.width * 0.1, box.x + box.width * 0.1 + 600);
    await expect.poll(() => counter.textContent()).toBe("Page 1 of 3");
    await expect(left).toBeDisabled();
  });
});
