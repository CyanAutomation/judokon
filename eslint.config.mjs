import js from "@eslint/js";
import globals from "globals";
import prettierPlugin from "eslint-plugin-prettier";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: [
      "dist/**",
      "node_modules/**",
      "build/**",
      "*.log",
      "*.tmp",
      ".eslintcache",
      ".git/**",
      "src/vendor/**"
    ], // 🔥 Updated ignores
    files: ["**/*.{js,mjs,cjs}"],
    plugins: {
      js,
      prettier: prettierPlugin
    },
    languageOptions: {
      globals: globals.browser
    },
    rules: {
      eqeqeq: "error",
      "no-unused-vars": "warn",
      "prettier/prettier": "error" // Let Prettier handle formatting (quotes, semi, indent)
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
