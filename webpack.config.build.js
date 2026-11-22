const commonConfig = require("./webpack.config.common.js");

module.exports = (env, argv) =>
  commonConfig.map((config) => ({
    ...config,
    mode: argv.mode,
    devtool: argv.mode === "development" ? "inline-source-map" : "source-map",
    watch: argv.mode === "development"
  }));
