import js from "@eslint/js";
import globals from "globals";
import prettierPlugin from "eslint-plugin-prettier";
import ymlPlugin from "eslint-plugin-yml";
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
      "eslint-dry.json",
      ".git/**",
      "src/vendor/**",
      "models/**",
      "src/data/client_embeddings.json",
      "src/data/client_embeddings.meta.json",
      "src/data/offline_rag_metadata.json"
    ], // 🔥 Updated ignores
    files: ["**/*.{js,mjs,cjs}"],
    plugins: {
      js,
      prettier: prettierPlugin
    },
    languageOptions: {
      globals: globals.browser,
      ecmaVersion: "latest",
      sourceType: "module"
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
  },
  {
    // Enforce no-empty catch blocks for the round manager and utilities; remaining
    // classic battle modules will be migrated incrementally to avoid destabilizing
    // legacy scaffolding that still relies on empty catch placeholders.
    files: ["src/helpers/classicBattle/roundManager.js", "src/helpers/classicBattle/utils/**/*.js"],
    rules: {
      "no-empty": ["error", { allowEmptyCatch: false }]
    }
  },
  // YAML support (GitHub Actions, config files)
  // Use plugin-provided flat configs for sensible defaults
  ymlPlugin.configs["flat/standard"],
  ymlPlugin.configs["flat/prettier"]
]);
