import js from "@eslint/js";
import globals from "globals";
import prettierPlugin from "eslint-plugin-prettier";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["dist/**", "node_modules/**"], // 🔥 Replace your old .eslintignore here
    files: ["**/*.{js,mjs,cjs}"],
    plugins: {
      js,
      prettier: prettierPlugin
    },
    languageOptions: {
      globals: globals.browser
    },
    rules: {
      ...js.configs.recommended.rules, // 🔥 Bring in "js/recommended" rules manually
      ...prettierPlugin.configs.recommended.rules, // 🔥 Bring in Prettier rules manually
      semi: ["error", "always"],
      quotes: ["error", "double"],
      eqeqeq: "error",
      "no-unused-vars": "warn",
      indent: ["error", 2],
      "prettier/prettier": "error" // Show Prettier formatting issues as ESLint errors
    }
  },
  {
    files: ["**/*.test.js"],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.jest // Enable jest globals in test files
      }
    }
  }
]);
