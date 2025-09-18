import { describe, it, expect } from "vitest";
import { findExportedSymbols, validateJsDoc } from "../../scripts/check-jsdoc.mjs";

describe("check-jsdoc", () => {
  describe("findExportedSymbols", () => {
    it("should find exported functions", () => {
      const content = `
        export function myFunction() {}
        export async function myAsyncFunction() {}
      `;
      const symbols = findExportedSymbols(content);
      expect(symbols).toEqual([
        { name: "myFunction", line: 2, type: "function" },
        { name: "myAsyncFunction", line: 3, type: "function" }
      ]);
    });

    it("should find exported variables", () => {
      const content = `
        export const myVar = () => {};
        export let myLet = function() {};
      `;
      const symbols = findExportedSymbols(content);
      expect(symbols).toEqual([
        { name: "myVar", line: 2, type: "variable" },
        { name: "myLet", line: 3, type: "variable" }
      ]);
    });

    it("should find exported default functions", () => {
      const content = `
        export default function myFunction() {}
        export default function() {}
      `;
      const symbols = findExportedSymbols(content);
      expect(symbols).toEqual([
        { name: "myFunction", line: 2, type: "default-function" },
        { name: "default", line: 3, type: "default-function" }
      ]);
    });

    it("should find named exports", () => {
      const content = `
          const foo = () => {};
          function bar() {};
          export { foo, bar as baz };
        `;
      const symbols = findExportedSymbols(content);
      expect(symbols).toEqual([
        { name: "foo", line: 4, type: "named" },
        { name: "baz", line: 4, type: "named" }
      ]);
    });
  });

  describe("validateJsDoc", () => {
    it("should return true for valid JSDoc", () => {
      const content = `
        /**
         * This is a description.
         * @pseudocode
         * 1. Do something.
         * @param {string} name - The name.
         * @returns {void}
         */
        export function myFunction(name) {}
      `;
      const lines = content.split("\n");
      const symbol = { name: "myFunction", line: 9, type: "function" };
      const valid = validateJsDoc(lines, symbol.line - 1);
      expect(valid).toBe(true);
    });

    it("should return false if JSDoc is missing", () => {
      const content = `
        export function myFunction(name) {}
      `;
      const lines = content.split("\n");
      const symbol = { name: "myFunction", line: 2, type: "function" };
      const valid = validateJsDoc(lines, symbol.line - 1);
      expect(valid).toBe(false);
    });

    it("should return false if @pseudocode is missing", () => {
      const content = `
        /**
         * This is a description.
         * @param {string} name - The name.
         * @returns {void}
         */
        export function myFunction(name) {}
      `;
      const lines = content.split("\n");
      const symbol = { name: "myFunction", line: 7, type: "function" };
      const valid = validateJsDoc(lines, symbol.line - 1);
      expect(valid).toBe(false);
    });
  });
});
