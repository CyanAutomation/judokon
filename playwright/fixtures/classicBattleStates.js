import { readFileSync } from "node:fs";

export const classicBattleStates = JSON.parse(
  readFileSync(new URL("../../src/data/classicBattleStates.json", import.meta.url))
);
