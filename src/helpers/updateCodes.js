// update-codes.js
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateCardCode } from "./cardCode.js";

// Resolve __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load judoka.json
const judokaPath = path.join(__dirname, "../data/judoka.json");
const rawData = fs.readFileSync(judokaPath, "utf8");
const judokaList = JSON.parse(rawData);

// Update each judoka with a generated card code
const updatedJudoka = judokaList.map((j) => ({
  ...j,
  cardCode: generateCardCode(j)
}));

// Write the updated list back to file
fs.writeFileSync(judokaPath, JSON.stringify(updatedJudoka, null, 2), "utf8");

console.log(`✅ Updated ${updatedJudoka.length} judoka card codes in: ${judokaPath}`);
