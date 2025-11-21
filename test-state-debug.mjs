import { JSDOM } from "jsdom";
import { init } from "./src/pages/battleClassic.init.js";
import { readFileSync } from "fs";
import { join } from "path";

const htmlContent = readFileSync(join(process.cwd(), "src/pages/battleClassic.html"), "utf-8");
const dom = new JSDOM(htmlContent, {
  url: "http://localhost:3000/battleClassic.html",
  runScripts: "outside-only",
  resources: "usable",
  pretendToBeVisualMedia: true
});

global.window = dom.window;
global.document = dom.window.document;
global.setTimeout = dom.window.setTimeout;
global.setInterval = dom.window.setInterval;
global.requestAnimationFrame = dom.window.requestAnimationFrame;

(async () => {
  try {
    console.log("Initializing...");
    await init();

    const testApi = window.__TEST_API;
    if (!testApi) {
      console.log("Test API not available");
      process.exit(1);
    }

    console.log("Initial state:", testApi.state.getBattleState());

    // Get round button and click it
    const roundButtons = Array.from(document.querySelectorAll(".round-select-buttons button"));
    console.log("Round buttons found:", roundButtons.length);

    if (roundButtons.length > 0) {
      console.log("Clicking first round button...");
      roundButtons[0].click();

      // Wait a bit for async handlers
      await new Promise((resolve) => setTimeout(resolve, 100));

      console.log("State after click:", testApi.state.getBattleState());
      const snapshot = testApi.inspect.getBattleSnapshot();
      console.log("Battle snapshot:", snapshot);
      const debugInfo = testApi.inspect.getDebugInfo();
      console.log("Debug info:", JSON.stringify(debugInfo, null, 2));
    }

    process.exit(0);
  } catch (err) {
    console.error("Error:", err.message);
    process.exit(1);
  }
})();
