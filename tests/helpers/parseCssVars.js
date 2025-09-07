import { readFileSync } from "fs";
import { resolve } from "path";
import postcss from "postcss";

/**
 * Extract CSS custom properties from a file.
 * @param {string} file CSS file path.
 * @returns {Record<string, string>} map of variable names to values
 * @pseudocode
 * read CSS file
 * parse CSS with PostCSS
 * for each :root rule
 *   for each declaration starting with --
 *     save variable name and value
 * return variable map
 */
export function parseCssVars(file) {
  const css = readFileSync(resolve(file), "utf8");
  const vars = {};
  const root = postcss.parse(css);
  root.walkRules(":root", (rule) => {
    rule.walkDecls((decl) => {
      if (decl.prop.startsWith("--")) {
        vars[decl.prop] = decl.value.trim();
      }
    });
  });
  return vars;
}
