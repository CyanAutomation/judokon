// update-codes.js
const fs = require("fs");
const path = require("path");
const { generateCardCode } = require("./src/helpers/cardCode.js");

// Load judoka.json
const judokaPath = path.join(__dirname, "src/data/judoka.json");
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
