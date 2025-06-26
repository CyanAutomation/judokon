import { describe, it, expect } from "vitest";
import { parseCssVariables } from "../../src/helpers/cssVariableParser.js";

describe("parseCssVariables", () => {
  it("should parse CSS variables from a simple :root block", () => {
    const css = `
      :root {
        --color-primary: #cb2504;
        --color-secondary: #0c3f7a;
        --font-size: 16px;
      }
    `;

    const vars = parseCssVariables(css);

    expect(vars).toEqual({
      "--color-primary": "#cb2504",
      "--color-secondary": "#0c3f7a",
      "--font-size": "16px"
    });
  });

  it("should handle CSS variables with comments", () => {
    const css = `
      :root {
        --color-primary: #cb2504; /* Primary color */
        --color-secondary: #0c3f7a; /* Secondary color */
        /* This is a comment */
        --font-size: 16px;
      }
    `;

    const vars = parseCssVariables(css);

    expect(vars).toEqual({
      "--color-primary": "#cb2504",
      "--color-secondary": "#0c3f7a",
      "--font-size": "16px"
    });
  });

  it("should handle CSS variables with complex values", () => {
    const css = `
      :root {
        --shadow-base: 0 4px 12px rgba(0, 0, 0, 0.1);
        --transition-fast: all 150ms ease;
        --radius-pill: 9999px;
      }
    `;

    const vars = parseCssVariables(css);

    expect(vars).toEqual({
      "--shadow-base": "0 4px 12px rgba(0, 0, 0, 0.1)",
      "--transition-fast": "all 150ms ease",
      "--radius-pill": "9999px"
    });
  });

  it("should handle multi-line CSS variables", () => {
    const css = `
      :root {
        --gradient: linear-gradient(
          90deg,
          #cb2504 0%,
          #0c3f7a 100%
        );
      }
    `;

    const vars = parseCssVariables(css);

    expect(vars["--gradient"]).toContain("linear-gradient");
    expect(vars["--gradient"]).toContain("#cb2504");
    expect(vars["--gradient"]).toContain("#0c3f7a");
  });

  it("should ignore non-CSS-variable declarations", () => {
    const css = `
      :root {
        --color-primary: #cb2504;
        font-size: 16px;
        margin: 0;
      }
    `;

    const vars = parseCssVariables(css);

    expect(vars).toEqual({
      "--color-primary": "#cb2504"
    });
    expect(vars["font-size"]).toBeUndefined();
    expect(vars["margin"]).toBeUndefined();
  });

  it("should handle CSS with multiple rules and only parse :root", () => {
    const css = `
      body {
        --body-var: should-not-be-included;
        font-size: 16px;
      }
      
      :root {
        --color-primary: #cb2504;
        --color-secondary: #0c3f7a;
      }
      
      .class {
        --class-var: should-not-be-included;
      }
    `;

    const vars = parseCssVariables(css);

    expect(vars).toEqual({
      "--color-primary": "#cb2504",
      "--color-secondary": "#0c3f7a"
    });
    expect(vars["--body-var"]).toBeUndefined();
    expect(vars["--class-var"]).toBeUndefined();
  });

  it("should return empty object for invalid CSS", () => {
    const css = "invalid css content {{{";

    const vars = parseCssVariables(css);

    expect(vars).toEqual({});
  });

  it("should return empty object for CSS without :root", () => {
    const css = `
      body {
        font-size: 16px;
      }
      .class {
        color: red;
      }
    `;

    const vars = parseCssVariables(css);

    expect(vars).toEqual({});
  });

  it("should handle different spacing patterns", () => {
    const css = `
      :root{
        --tight:value;
        --normal: value;
        --loose   :   value   ;
      }
    `;

    const vars = parseCssVariables(css);

    expect(vars).toEqual({
      "--tight": "value",
      "--normal": "value",
      "--loose": "value"
    });
  });
});
