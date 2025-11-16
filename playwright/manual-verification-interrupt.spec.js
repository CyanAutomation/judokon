import path from "node:path";
import { readFile } from "node:fs/promises";
import { test, expect } from "./fixtures/commonSetup.js";
import {
  waitForBattleReady,
  waitForBattleState,
  waitForTestApi
} from "./helpers/battleStateHelper.js";
import { dispatchBattleEvent, readCountdown } from "./helpers/battleApiHelper.js";

const BATTLE_PAGE_URL = "/src/pages/battleClassic.html";
const PLAYER_ACTION_STATE = "waitingForPlayerAction";

async function navigateToBattle(page) {
  await stubSentryImports(page);

  await page.addInitScript(() => {
    window.__FF_OVERRIDES = {
      ...(window.__FF_OVERRIDES || {}),
      enableTestMode: true,
      showRoundSelectModal: true
    };
  });

  await page.goto(BATTLE_PAGE_URL);
  await waitForTestApi(page);
}

const SENTRY_MOCK =
  "const Sentry = { captureException() {}, withScope(cb) { try { cb?.({ setTag() {}, setExtra() {} }); } catch (e) { console.warn('Sentry mock error:', e); } }, configureScope() {} };";

async function stubSentryImports(page) {
  await page.route("**/src/helpers/classicBattle/stateHandlers/*.js", async (route) => {
    const requestUrl = new URL(route.request().url());
    const relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\//, "");

    if (
      relativePath.includes("..") ||
      !relativePath.startsWith("src/helpers/classicBattle/stateHandlers/")
    ) {
      await route.abort();
      return;
    }

    const filePath = path.join(process.cwd(), relativePath);
    let source;

    try {
      source = await readFile(filePath, "utf8");
    } catch (error) {
      console.warn(`Failed to read file ${filePath}:`, error.message);
      await route.abort();
      return;
    }

    if (source.includes("@sentry/browser")) {
      source = source.replace('import * as Sentry from "@sentry/browser";', SENTRY_MOCK);
    }

    await route.fulfill({ body: source, contentType: "application/javascript" });
  });
}

async function launchClassicBattle(page) {
  await navigateToBattle(page);

  const quickButton = page.getByRole("button", { name: "Quick" });
  await expect(quickButton).toBeVisible();
  await quickButton.click();

  await waitForBattleReady(page, { allowFallback: false });
}

test.describe("Manual verification: Interrupt flow and cooldown", () => {
  test("should handle interrupt round and progress to cooldown without stalling", async ({
    page
  }) => {
    await launchClassicBattle(page);

    await waitForBattleState(page, PLAYER_ACTION_STATE, {
      timeout: 10_000,
      allowFallback: false
    });

    const interruptResult = await dispatchBattleEvent(page, "interrupt", {
      reason: "manual verification pause"
    });
    expect(interruptResult.ok).toBe(true);

    await waitForBattleState(page, "cooldown", { timeout: 10_000, allowFallback: false });

    await expect
      .poll(async () => {
        return await readCountdown(page);
      })
      .not.toBeNull();

    await waitForBattleState(page, PLAYER_ACTION_STATE, {
      timeout: 10_000,
      allowFallback: false
    });
  });

  test("should expose debug state when available", async ({ page }) => {
    await navigateToBattle(page);

    const diagnostics = await page.evaluate(() => {
      const api = window.__TEST_API ?? null;
      return {
        hasStateApi: typeof api?.state === "object", // core bridge
        hasInitHelper: typeof api?.init?.waitForBattleReady === "function",
        hasDispatch: typeof api?.state?.dispatchBattleEvent === "function",
        hasStateGetter: typeof api?.state?.getBattleState === "function"
      };
    });

    expect(diagnostics.hasStateApi).toBe(true);
    expect(diagnostics.hasInitHelper).toBe(true);
    expect(diagnostics.hasDispatch).toBe(true);
    expect(diagnostics.hasStateGetter).toBe(true);
  });

  test("should verify interrupt functionality integrates without errors", async ({ page }) => {
    const consoleErrors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await launchClassicBattle(page);

    await waitForBattleState(page, PLAYER_ACTION_STATE, {
      timeout: 10_000,
      allowFallback: false
    });

    const interruptResult = await dispatchBattleEvent(page, "interrupt", {
      reason: "console guard"
    });
    expect(interruptResult.ok).toBe(true);

    await waitForBattleState(page, "cooldown", { timeout: 10_000, allowFallback: false });
    await waitForBattleState(page, PLAYER_ACTION_STATE, {
      timeout: 10_000,
      allowFallback: false
    });

    expect(consoleErrors).toEqual([]);
  });
});
