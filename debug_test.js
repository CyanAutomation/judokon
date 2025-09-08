// Debug test to understand the flow
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve(process.cwd(), "src/pages/battleClassic.html");
const html = readFileSync(file, "utf-8");
document.documentElement.innerHTML = html;

// Add some debug logging
const originalConsoleLog = console.log;
console.log = (...args) => {
  if (args[0] && args[0].includes && (args[0].includes("BattleEngine") || args[0].includes("test") || args[0].includes("display.score.update"))) {
    originalConsoleLog(...args);
  }
};

const mod = await import("./src/pages/battleClassic.init.js");
if (typeof mod.init === "function") mod.init();

const engine = await import("./src/helpers/battleEngineFacade.js");
engine.setPointsToWin?.(1);

// Start match
const startBtn = await new Promise((r) => {
  const loop = () => {
    const el = document.getElementById("round-select-2");
    if (el) return r(el);
    setTimeout(loop, 0);
  };
  loop();
});

console.log("Clicking start button");
startBtn.click();

await new Promise((r) => setTimeout(r, 10));

console.log("Clicking stat button");
const statButton = document.querySelector("#stat-buttons button[data-stat]");
console.log("Stat button found:", !!statButton);
statButton?.click();

await new Promise((r) => setTimeout(r, 100));

const score = document.getElementById("score-display");
console.log("Final score:", score?.textContent);