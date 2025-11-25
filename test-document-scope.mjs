import { JSDOM } from "jsdom";

const htmlContent = `<!DOCTYPE html><html><body></body></html>`;

const dom = new JSDOM(htmlContent, {
  url: "http://localhost:3000/test.html",
  runScripts: "dangerously"
});

const window = dom.window;
const document = window.document;

global.window = window;
global.document = document;
global.navigator = window.navigator;

console.log("Before import - typeof document:", typeof document);
console.log("Before import - typeof globalThis.document:", typeof globalThis.document);
console.log("Before import - typeof global.document:", typeof global.document);

// Now import a module that uses document
import "./src/pages/battleClassic.init.js";

console.log("\nAfter import - typeof document:", typeof document);
console.log("After import - typeof globalThis.document:", typeof globalThis.document);

async function testDocumentAccess() {
  console.log("\nInside async function:");
  console.log("  typeof document:", typeof document);
  console.log("  typeof globalThis.document:", typeof globalThis.document);
}

await testDocumentAccess();
