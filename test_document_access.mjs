import { JSDOM } from "jsdom";

const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>", {
  url: "http://localhost/"
});

global.window = dom.window;
global.document = dom.window.document;

console.log("After setting globals:");
console.log("  typeof document:", typeof document);
console.log("  typeof window:", typeof window);
console.log("  !!document:", !!document);
console.log("  !!window:", !!window);

// Now try importing a module that uses getDocumentRef
const { getDocumentRef } = await import("./src/helpers/documentHelper.js");
console.log("\nIn documentHelper.js:");
const ref = getDocumentRef();
console.log("  getDocumentRef() returns:", ref ? "truthy" : "falsy");

// Try from Card
const { Card } = await import("./src/components/Card.js");
console.log("\nCard class imported successfully");

try {
  const card = new Card("test");
  console.log("Card instance created successfully");
} catch (err) {
  console.error("Card creation failed:", err.message);
  console.error("Stack:", err.stack.split("\n").slice(0, 5).join("\n"));
}
