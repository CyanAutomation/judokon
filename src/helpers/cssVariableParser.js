import postcss from "postcss";

/**
 * Parses CSS variables from a CSS string using PostCSS for robust parsing.
 * This replaces the fragile regex-based approach with a proper CSS parser.
 *
 * @param {string} cssContent - The CSS content to parse
 * @returns {Object} Object containing CSS variables as key-value pairs
 */
export function parseCssVariables(cssContent) {
  const vars = {};

  try {
    const root = postcss.parse(cssContent);

    // Find the :root rule
    root.walkRules(":root", (rule) => {
      // Walk through all declarations in the :root rule
      rule.walkDecls((decl) => {
        // Only process CSS custom properties (variables)
        if (decl.prop.startsWith("--")) {
          vars[decl.prop] = decl.value.trim();
        }
      });
    });
  } catch (error) {
    console.error("Error parsing CSS:", error);
    // Return empty object on parse error
    return {};
  }

  return vars;
}
