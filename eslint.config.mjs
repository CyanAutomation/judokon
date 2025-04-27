import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";


export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js },
    extends: ["js/recommended"],
    languageOptions: {
      globals: globals.browser
    },
    rules: {
      semi: ["error", "always"],        // Always require semicolons
      quotes: ["error", "double"],       // Always use single quotes
      eqeqeq: "error",                   // Require === and !==
      indent: ["error", 2],                 // Enforce 2 spaces for indentation
      "no-unused-vars": "warn"            // Warn about unused variables
    }
  }
]);
