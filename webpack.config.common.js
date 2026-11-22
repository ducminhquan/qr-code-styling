const path = require("path");

const rootPath = path.resolve(__dirname, "./");
const srcPath = path.resolve(rootPath, "src");
const libPath = path.resolve(rootPath, "lib");

const shared = {
  entry: srcPath + "/index.ts",
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: "ts-loader",
        exclude: /node_modules/,
        options: { configFile: "tsconfig.json", compilerOptions: { declaration: false, sourceMap: true } }
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".js"]
  }
};

// Both bundles keep the exact file names, global name and export shape of
// qr-code-styling-node@1.5.0 so existing <script> tags and require() calls keep working.
module.exports = [
  {
    ...shared,
    output: {
      path: libPath,
      filename: "qr-code-styling.js",
      library: { name: "QRCodeStyling", type: "umd", export: "default" },
      globalObject: "this"
    }
  },
  {
    ...shared,
    output: {
      path: libPath,
      filename: "qr-code-styling.common.js",
      library: { name: "QRCodeStyling", type: "commonjs", export: "default" }
    }
  }
];
