import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url)));

describe("npm scripts", () => {
  it("check:contrast uses pa11y", () => {
    expect(pkg.scripts["check:contrast"]).toBe("pa11y http://localhost:3000");
  });
});
