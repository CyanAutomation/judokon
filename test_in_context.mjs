import { JSDOM } from "jsdom";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import fs from "fs";

const rootDir = dirname(fileURLToPath(import.meta.url));
const htmlPath = resolve(rootDir, "src/pages/battleClassic.html");
const htmlContent = fs.readFileSync(htmlPath, "utf-8");

const dom = new JSDOM(htmlContent, {
  url: "http://localhost:3000/battleClassic.html",
  runScripts: "dangerously",
  resources: "usable",
  pretendToBeVisual: true
});

const window = dom.window;
const document = window.document;

global.window = window;
global.document = document;

console.log("After setup:");
console.log("  !!global.document:", !!global.document);
console.log("  !!global.window:", !!global.window);

// NOW import modules that depend on document
const { getDocumentRef } = await import("./src/helpers/documentHelper.js");
const { Card } = await import("./src/components/Card.js");
const { init: _init } = await import("./src/pages/battleClassic.init.js");

console.log("\nAfter imports:");
console.log("  !!global.document:", !!global.document);

console.log("\nTesting getDocumentRef:");
const doc = getDocumentRef();
console.log("  getDocumentRef() result:", !!doc);

console.log("\nTesting Card:");
try {
  const card = new Card("test");
  console.log("  Card created:", !!card.element);
} catch (err) {
  console.error("  Card error:", err.message);
}
