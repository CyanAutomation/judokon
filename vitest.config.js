import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["tests/setup.js"], // if you have custom extensions
    environmentOptions: {
      jsdom: {
        resources: "usable", // loads images/stylesheets if needed
        runScripts: "dangerously", // only if you ever render <script>
      },
    },
    testTimeout: 9000,
  },
});