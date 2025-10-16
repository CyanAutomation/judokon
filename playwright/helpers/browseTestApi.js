import { expect } from "@playwright/test";

const DEFAULT_TIMEOUT = 5000;

async function waitForBrowseApi(page, timeout = DEFAULT_TIMEOUT) {
  try {
    await page.waitForFunction(
      () => typeof window !== "undefined" && !!window.__TEST_API?.browse,
      { timeout }
    );
    return true;
  } catch (error) {
    return false;
  }
}

async function callBrowseApi(page, method, args = [], { waitForApi = true } = {}) {
  const available = waitForApi ? await waitForBrowseApi(page) : true;
  if (!available) {
    throw new Error("Browse test API is not available on window.__TEST_API.");
  }

  return page.evaluate(
    ({ method, args: callArgs }) => {
      const browseApi = window.__TEST_API?.browse;
      if (!browseApi) {
        throw new Error("Browse test API is not available on window.__TEST_API.");
      }
      const target = browseApi[method];
      if (typeof target !== "function") {
        throw new Error(`Browse test API method not callable: ${method}`);
      }
      return target(...callArgs);
    },
    { method, args }
  );
}

export async function ensureBrowseCarouselReady(page) {
  const available = await waitForBrowseApi(page);
  if (!available) {
    throw new Error("Browse test API did not register before readiness check.");
  }
  const snapshot = await callBrowseApi(page, "whenCarouselReady");
  expect(snapshot?.isReady).toBe(true);
  return snapshot;
}

export async function disableBrowseHoverAnimations(page) {
  await callBrowseApi(page, "disableHoverAnimations");
}

export async function resetBrowseTestState(page) {
  try {
    await page.evaluate(() => {
      try {
        window.__TEST_API?.browse?.reset?.();
      } catch (error) {
        throw error;
      }
    });
  } catch (error) {
    if (
      error instanceof Error &&
      (/Execution context was destroyed/i.test(error.message) ||
        /not available/i.test(error.message) ||
        /Cannot read properties of undefined/i.test(error.message))
    ) {
      return;
    }
    throw error;
  }
}

export async function addBrowseCard(page, judoka) {
  await callBrowseApi(page, "addCard", [judoka]);
}
