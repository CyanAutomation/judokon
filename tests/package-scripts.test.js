import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgPath = path.join(__dirname, "../package.json");
const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));

describe("npm scripts", () => {
  it("check:contrast uses pa11y", () => {
    expect(pkg.scripts["check:contrast"]).toBe(
      "pa11y --chrome-launch-flags=--no-sandbox http://localhost:5000"
    );
  });
});
