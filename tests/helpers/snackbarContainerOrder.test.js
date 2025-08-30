import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pages = ["battleJudoka.html", "battleClassic.html"];

describe("snackbar container order", () => {
  it.each(pages)("%s defines snackbar container before bootstrap", (file) => {
    const html = readFileSync(path.join(__dirname, "../../src/pages", file), "utf8");
    const containerIndex = html.indexOf('<div id="snackbar-container"');
    const scriptIndex = html.indexOf("helpers/classicBattle/bootstrap.js");
    expect(containerIndex).toBeGreaterThan(-1);
    expect(scriptIndex).toBeGreaterThan(-1);
    expect(containerIndex).toBeLessThan(scriptIndex);
  });
});
