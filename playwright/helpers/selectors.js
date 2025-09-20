import fs from "fs";
import path from "path";

const mappingPath = path.resolve(process.cwd(), "design/dataSchemas/battleMarkup.json");

let mapping = null;

function loadMapping() {
  if (mapping) return mapping;
  try {
    const raw = fs.readFileSync(mappingPath, "utf8");
    mapping = JSON.parse(raw);
    return mapping;
  } catch {
    // Fallback mapping to avoid test breakage if the JSON is missing
    mapping = {
      entries: [
        { logicalName: "roundMessage", selector: "header #round-message" },
        { logicalName: "nextRoundTimer", selector: "header #next-round-timer" },
        { logicalName: "roundCounter", selector: "header #round-counter" },
        { logicalName: "scoreDisplay", selector: "header #score-display" }
      ]
    };
    return mapping;
  }
}

function findSelectorByLogicalName(name) {
  const map = loadMapping();
  const entry = (map.entries || []).find((e) => e.logicalName === name || e.dataTestId === name);
  return entry ? entry.selector : null;
}

export function roundMessage() {
  return findSelectorByLogicalName("roundMessage") || "header #round-message";
}

export function nextRoundTimer() {
  return findSelectorByLogicalName("nextRoundTimer") || "header #next-round-timer";
}

export function roundCounter() {
  return findSelectorByLogicalName("roundCounter") || "header #round-counter";
}

export function scoreDisplay() {
  return findSelectorByLogicalName("scoreDisplay") || "header #score-display";
}

export default {
  roundMessage,
  nextRoundTimer,
  roundCounter,
  scoreDisplay
};
