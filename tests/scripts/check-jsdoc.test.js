import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { checkFiles, findExportedSymbols, validateJsDoc } from "../../scripts/check-jsdoc.mjs";

const fixturesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../fixtures");

describe("check-jsdoc (prdCodeStandards.md)", () => {
  describe("findExportedSymbols", () => {
    const symbolCases = [
      {
        title: "finds exported functions per prdCodeStandards.md",
        content: `
          export function myFunction() {}
          export async function myAsyncFunction() {}
        `,
        expected: [
          { name: "myFunction", line: 2, type: "function" },
          { name: "myAsyncFunction", line: 3, type: "function" }
        ]
      },
      {
        title: "finds exported variables per prdCodeStandards.md",
        content: `
          export const myVar = () => {};
          export let myLet = function() {};
        `,
        expected: [
          { name: "myVar", line: 2, type: "variable" },
          { name: "myLet", line: 3, type: "variable" }
        ]
      },
      {
        title: "finds exported default functions per prdCodeStandards.md",
        content: `
          export default function myFunction() {}
          export default function() {}
        `,
        expected: [
          { name: "myFunction", line: 2, type: "default-function" },
          { name: "default", line: 3, type: "default-function" }
        ]
      },
      {
        title: "finds named exports per prdCodeStandards.md",
        content: `
            const foo = () => {};
            function bar() {};
            export { foo, bar as baz };
          `,
        expected: [
          { name: "foo", line: 4, type: "named" },
          { name: "baz", line: 4, type: "named" }
        ]
      }
    ];

    symbolCases.forEach(({ title, content, expected }) => {
      it(title, () => {
        const symbols = findExportedSymbols(content);
        expect(symbols).toEqual(expected);
      });
    });
  });

  describe("validateJsDoc", () => {
    const validationCases = [
      {
        title: "accepts valid JSDoc per prdCodeStandards.md",
        content: `
          /**
           * This is a description.
           * @pseudocode
           * 1. Do something.
           * @param {string} name - The name.
           * @returns {void}
           */
          export function myFunction(name) {}
        `,
        expected: true
      },
      {
        title: "flags missing JSDoc per prdCodeStandards.md",
        content: `
          export function myFunction(name) {}
        `,
        expected: "No JSDoc block found preceding the symbol."
      },
      {
        title: "flags missing @pseudocode per prdCodeStandards.md",
        content: `
          /**
           * This is a description.
           * @param {string} name - The name.
           * @returns {void}
           */
          export function myFunction(name) {}
        `,
        expected: "Missing @pseudocode tag. All functions require a @pseudocode section."
      }
    ];

    validationCases.forEach(({ title, content, expected }) => {
      it(title, () => {
        const lines = content.split("\n");
        const symbol = findExportedSymbols(content)[0];
        const valid = validateJsDoc(lines, symbol.line - 1, symbol.type);
        expect(valid).toBe(expected);
      });
    });

    it("accepts valid fixture docs per prdDevelopmentStandards.md", async () => {
      const content = await readFile(path.join(fixturesDir, "jsdoc-valid.js"), "utf8");
      const lines = content.split("\n");
      const symbols = findExportedSymbols(content);
      const symbol = symbols.find((item) => item.name === "createScoreboardView");
      expect(symbol).toBeTruthy();
      const valid = validateJsDoc(lines, symbol.line - 1);
      expect(valid).toBe(true);
    });

    it("flags fixture missing @pseudocode per prdDevelopmentStandards.md", async () => {
      const content = await readFile(path.join(fixturesDir, "jsdoc-invalid.js"), "utf8");
      const lines = content.split("\n");
      const symbols = findExportedSymbols(content);
      const symbol = symbols.find((item) => item.name === "updateScoreboardLabel");
      expect(symbol).toBeTruthy();
      const valid = validateJsDoc(lines, symbol.line - 1);
      expect(valid).toBe("Missing @pseudocode tag. All functions require a @pseudocode section.");
    });
  });

  it("validates a fixture file end-to-end per prdCodeStandards.md", async () => {
    const problems = await checkFiles([path.join(fixturesDir, "jsdoc-integration.js")]);
    expect(problems).toEqual([]);
  });
});
