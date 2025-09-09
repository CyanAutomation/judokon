import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("Classic Battle quit flow", () => {
  test("clicking Quit opens confirmation modal", async () => {
    const file = resolve(process.cwd(), "src/pages/battleClassic.html");
    const html = readFileSync(file, "utf-8");
    document.documentElement.innerHTML = html;

    const mod = await import("../../src/pages/battleClassic.init.js");
    if (typeof mod.init === "function") {
      await mod.init();
    }

    const quit = document.getElementById("quit-button");
    expect(quit).toBeTruthy();
    console.log("[test] Clicking quit button");
    quit.click();

    // Wait for modal confirm button to appear
    const confirmBtn = await new Promise((resolveBtn, reject) => {
      const start = Date.now();
      const tick = () => {
        const el = document.getElementById("confirm-quit-button");
        if (el) {
          console.log("[test] Found confirm button");
          return resolveBtn(el);
        }
        // Check if any modal elements exist
        const modal = document.querySelector('[role="dialog"]');
        const modalTitle = document.getElementById("quit-modal-title");
        console.log("[test] Checking for modal elements:", {
          modal: !!modal,
          modalTitle: !!modalTitle,
          bodyChildren: document.body.children.length
        });
        if (Date.now() - start > 1000) return reject(new Error("confirm not found"));
        setTimeout(tick, 10);
      };
      tick();
    });
    expect(confirmBtn).toBeTruthy();
  });
});
