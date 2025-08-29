import config from "./vitest.config.js";

config.test = {
  ...config.test,
  include: ["tests/scripts/**/*.test.js"],
  exclude: config.test.exclude.filter((p) => p !== "tests/scripts/**")
};

export default config;
