import baseConfig from "./vitest.config.js";

export default {
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ["tests/styles/**/*.test.js"],
    exclude: []
  }
};
