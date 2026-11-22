const { merge } = require("webpack-merge");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const [umdConfig] = require("./webpack.config.common.js");

module.exports = merge(umdConfig, {
  mode: "development",
  devtool: "inline-source-map",
  plugins: [
    new HtmlWebpackPlugin({
      template: "./src/index.html",
      inject: "head",
      scriptLoading: "blocking"
    })
  ]
});
