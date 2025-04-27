import js from "@eslint/js";
import globals from "globals";
import prettierPlugin from "eslint-plugin-prettier";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: {
      js,
      prettier: prettierPlugin
    },
    extends: [
      "js/recommended",
      "plugin:prettier/recommended" // 🔥 THIS auto-sets up Prettier rules
    ],
    languageOptions: {
      globals: globals.browser
    },
    rules: {
      semi: ["error", "always"],
      quotes: ["error", "double"],
      eqeqeq: "error",
      "no-unused-vars": "warn",
      indent: ["error", 2],
      "prettier/prettier": "error" // 🔥 This makes Prettier formatting errors show as ESLint errors
    }
  }
]);
