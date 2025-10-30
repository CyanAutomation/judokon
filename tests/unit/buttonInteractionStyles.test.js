import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function readCss(relativePath) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

const buttonsCss = readCss("src/styles/buttons.css");
const navbarCss = readCss("src/styles/navbar.css");

describe("button interaction styles", () => {
  it("defines ripple pseudo-elements for primary button surfaces", () => {
    expect(buttonsCss).toContain("button::after");
    expect(buttonsCss).toContain(".primary-button::after");
  });

  it("includes active and focus-visible ripple states", () => {
    expect(buttonsCss).toMatch(/button:active::after/);
    expect(buttonsCss).toMatch(/button:focus-visible::after/);
    expect(buttonsCss).toMatch(/button:active:focus-visible::after/);
  });

  it("respects reduced motion preferences", () => {
    expect(buttonsCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*button[\s\S]*?::after/
    );
    expect(buttonsCss).toMatch(/\.reduce-motion button[\s\S]*?::after/);
    expect(buttonsCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*button[\s\S]*?,\s*\n\s*\.primary-button\s*\{\s*transition:\s*none;/
    );
    expect(buttonsCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*button[\s\S]*?:active[\s\S]*?,\s*\n\s*\.primary-button:active\s*\{\s*transform:\s*none;/
    );
    expect(buttonsCss).toMatch(
      /\.reduce-motion button[\s\S]*?,\s*\n\s*\.reduce-motion \.primary-button\s*\{\s*transition:\s*none;/
    );
    expect(buttonsCss).toMatch(
      /\.reduce-motion button[\s\S]*?:active[\s\S]*?,\s*\n\s*\.reduce-motion \.primary-button:active\s*\{\s*transform:\s*none;/
    );
  });
});

describe("navbar ripple overrides", () => {
  it("mirrors reduced motion safeguards", () => {
    expect(navbarCss).toMatch(/@media \(prefers-reduced-motion: reduce\)[\s\S]*button::after/);
    expect(navbarCss).not.toMatch(/\.ripple/);
    expect(navbarCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.top-navbar button,\s*\n\s*\.top-navbar \.primary-button,\s*\n\s*\.filter-bar button\s*\{\s*transition:\s*none;/
    );
    expect(navbarCss).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.top-navbar button:active,\s*\n\s*\.top-navbar \.primary-button:active,\s*\n\s*\.filter-bar button:active\s*\{\s*transform:\s*none;/
    );
    expect(navbarCss).toMatch(
      /\.reduce-motion \.top-navbar button,\s*\n\s*\.reduce-motion \.top-navbar \.primary-button,\s*\n\s*\.reduce-motion \.filter-bar button\s*\{\s*transition:\s*none;/
    );
    expect(navbarCss).toMatch(
      /\.reduce-motion \.top-navbar button:active,\s*\n\s*\.reduce-motion \.top-navbar \.primary-button:active,\s*\n\s*\.reduce-motion \.filter-bar button:active\s*\{\s*transform:\s*none;/
    );
  });
});
