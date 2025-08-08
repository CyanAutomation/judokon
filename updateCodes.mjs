// updateCodes.mjs
import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateCardCode } from "./src/helpers/cardCode.js";

/**
 * Update card codes for all judoka entries.
 *
 * @pseudocode
 * 1. Load `judoka.json`.
 * 2. Generate fallback code from the judoka with id `0`.
 * 3. For each judoka:
 *    a. Try to generate a card code.
 *    b. On failure, log the error and assign the fallback code.
 *    c. Update the `lastUpdated` field to the current date.
 * 4. Write the updated list back to `judoka.json`.
 * 5. Log the result.
 */
async function updateCardCodes() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const judokaPath = path.join(__dirname, "src/data/judoka.json");
    const rawData = await fs.readFile(judokaPath, "utf8");
    const judokaList = JSON.parse(rawData);
    const fallbackCode = generateCardCode(judokaList.find((j) => j.id === 0));

    const now = new Date().toISOString();
    const updatedJudoka = judokaList.map((j) => {
      try {
        return { ...j, cardCode: generateCardCode(j), lastUpdated: now };
      } catch (error) {
        console.error(`Failed to generate card code for judoka id ${j.id}:`, error);
        return { ...j, cardCode: fallbackCode, lastUpdated: now };
      }
    });

    await fs.writeFile(judokaPath, JSON.stringify(updatedJudoka, null, 2), "utf8");

    console.log(`✅ Updated ${updatedJudoka.length} judoka card codes in: ${judokaPath}`);
  } catch (error) {
    console.error("Failed to update judoka card codes:", error);
  }
}

updateCardCodes();
